import { NextResponse } from 'next/server';

/**
 * Apple universal-links association file, served at
 * `/.well-known/apple-app-site-aasa` (JSON, no redirect, no auth).
 *
 * Set one of:
 *   APPLE_APP_ID       full app id, e.g. "AB12CD34EF.in.shaktiyoga.app"
 *   APPLE_TEAM_ID      just the team id (bundle id defaults to in.shaktiyoga.app,
 *                      override with IOS_BUNDLE_ID)
 *
 * Until one is set this returns 404 — an invalid AASA is worse than none, and
 * the app links still fall back to opening the website.
 */
export const dynamic = 'force-dynamic';

function appId(): string | null {
    if (process.env.APPLE_APP_ID) return process.env.APPLE_APP_ID.trim();
    const team = process.env.APPLE_TEAM_ID?.trim();
    if (!team) return null;
    const bundle = (process.env.IOS_BUNDLE_ID || 'in.shaktiyoga.app').trim();
    return `${team}.${bundle}`;
}

const PATHS = ['/r/*', '/reset-password*'];

export async function GET() {
    const id = appId();
    if (!id) {
        return NextResponse.json(
            { error: 'Universal links not configured (set APPLE_APP_ID or APPLE_TEAM_ID).' },
            { status: 404 },
        );
    }

    return NextResponse.json(
        {
            applinks: {
                apps: [],
                details: [{ appID: id, paths: PATHS }],
            },
            // Newer format Apple also accepts — harmless to include both.
            webcredentials: { apps: [id] },
        },
        { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' } },
    );
}
