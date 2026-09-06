// Lightweight host + app health check. Run from cron every 15 min (see
// deploy/cron.d-shakti). Alerts via notifyAdmin (else logs) when: disk > 85%,
// memory available < 400 MB, or the app's /api/health is not 200. State-tracked
// so it emails on transition only, not every tick.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { notifyAdmin, emailLayout } from '../src/lib/email';
import { SITE_URL } from '../src/lib/site';

const STATE = '/tmp/shakti-host-check.state';
const DISK_PCT = 85;
const MEM_MIN_MB = 400;

function sh(cmd: string): string {
    try { return execSync(cmd, { encoding: 'utf8' }).trim(); } catch { return ''; }
}

async function main() {
    const problems: string[] = [];

    const diskPct = Number(sh("df --output=pcent / | tail -1 | tr -dc '0-9'"));
    if (diskPct >= DISK_PCT) problems.push(`Disk at ${diskPct}% on /`);

    const availMb = Number(sh("free -m | awk '/^Mem:/{print $7}'"));
    if (availMb && availMb < MEM_MIN_MB) problems.push(`Only ${availMb} MB memory available`);

    try {
        const res = await fetch(`${SITE_URL}/api/health`, { signal: AbortSignal.timeout(10_000) });
        if (res.status !== 200) problems.push(`/api/health returned ${res.status}`);
    } catch (e) {
        problems.push(`/api/health unreachable (${e instanceof Error ? e.message : e})`);
    }

    const prev = existsSync(STATE) ? readFileSync(STATE, 'utf8').trim() : '';
    const now = problems.join(' | ') || 'ok';
    writeFileSync(STATE, now);

    const stamp = new Date().toISOString();
    if (problems.length === 0) {
        console.log(`[host-check] ${stamp} — ok`);
        if (prev && prev !== 'ok') {
            await notifyAdmin('Shakti Yoga: host recovered', emailLayout(`<p>All host checks are green again as of ${stamp}.</p>`));
        }
        return;
    }

    console.error(`[host-check] ${stamp} — ${now}`);
    if (now !== prev) {
        await notifyAdmin(
            'Shakti Yoga: host check failing',
            emailLayout(`<p>${stamp}</p><ul>${problems.map((p) => `<li>${p}</li>`).join('')}</ul>`),
        );
    }
}

main().catch((e) => { console.error('[host-check] crashed:', e); process.exitCode = 1; });
