/**
 * Download the current DB-IP Country Lite database (free, CC-BY, no account) to
 * GEOIP_DB_PATH. Run monthly from cron:
 *
 *   0 4 1 * *  cd /root/shaktiyoga/app && node_modules/.bin/tsx scripts/refresh-geoip.ts >> /var/log/shakti-cron.log 2>&1
 *
 * The middleware falls back to India pricing if the file is missing, so a failed
 * refresh degrades gracefully.
 */
import { createWriteStream } from 'node:fs';
import { rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';

const DEST = process.env.GEOIP_DB_PATH || '/usr/share/GeoIP/dbip-country-lite.mmdb';

async function main() {
    const now = new Date();
    // Try the current month, then the previous one (DB-IP publishes a few days in).
    for (let back = 0; back < 3; back++) {
        const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
        const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const url = `https://download.db-ip.com/free/dbip-country-lite-${stamp}.mmdb.gz`;
        const res = await fetch(url);
        if (!res.ok || !res.body) {
            console.log(`[geoip] ${stamp} not available (${res.status})`);
            continue;
        }
        await mkdir(dirname(DEST), { recursive: true });
        const tmp = `${DEST}.tmp`;
        await pipeline(
            // @ts-expect-error - web ReadableStream is accepted by pipeline in Node 20+
            res.body,
            createGunzip(),
            createWriteStream(tmp),
        );
        await rename(tmp, DEST);
        console.log(`[geoip] ${new Date().toISOString()} — updated ${DEST} from ${stamp}`);
        return;
    }
    console.error('[geoip] no recent DB-IP database found');
    process.exitCode = 1;
}

main().catch((err) => {
    console.error('[geoip] refresh failed:', err);
    process.exitCode = 1;
});
