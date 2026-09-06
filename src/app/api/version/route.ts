import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';

/** Reports the deployed commit. deploy.sh writes version.json at deploy time. */
export async function GET() {
    try {
        const raw = await readFile(path.join(process.cwd(), 'version.json'), 'utf8');
        return NextResponse.json(JSON.parse(raw));
    } catch {
        return NextResponse.json({
            commit: process.env.GIT_COMMIT ?? 'unknown',
            deployedAt: null,
            branch: 'main',
        });
    }
}
