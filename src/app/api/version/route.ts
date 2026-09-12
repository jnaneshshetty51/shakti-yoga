import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';

/**
 * Reports the deployed commit (deploy.sh writes version.json at deploy time)
 * plus the minimum mobile app version still supported — previously this
 * route existed with nothing reading it, so there was no way to force an
 * upgrade if a breaking API change shipped. Set via the `min_supported_mobile_version`
 * Setting; the mobile app compares it against its own app.json version on launch.
 */
export async function GET() {
    const minSupportedMobileVersion = await getSetting('min_supported_mobile_version');
    try {
        const raw = await readFile(path.join(process.cwd(), 'version.json'), 'utf8');
        return NextResponse.json({ ...JSON.parse(raw), minSupportedMobileVersion });
    } catch {
        return NextResponse.json({
            commit: process.env.GIT_COMMIT ?? 'unknown',
            deployedAt: null,
            branch: 'main',
            minSupportedMobileVersion,
        });
    }
}
