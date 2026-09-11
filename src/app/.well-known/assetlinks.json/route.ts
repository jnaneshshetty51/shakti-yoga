import { NextResponse } from 'next/server';

/**
 * Android App Links verification, served at `/.well-known/assetlinks.json`.
 *
 * Set ANDROID_SHA256_CERT_FINGERPRINTS to the signing cert SHA-256(s) —
 * comma-separated, colon-hex form, e.g. "AA:BB:CC:...". Get it from
 * `eas credentials -p android` (both the upload key and the Play app-signing
 * key once the app is on Play — list both).
 *
 * Returns 404 until set.
 */
export const dynamic = 'force-dynamic';

const PACKAGE = (process.env.ANDROID_PACKAGE || 'com.shaktiyoga.app').trim();

function fingerprints(): string[] {
    return (process.env.ANDROID_SHA256_CERT_FINGERPRINTS || '')
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
}

export async function GET() {
    const fps = fingerprints();
    if (fps.length === 0) {
        return NextResponse.json(
            { error: 'Android App Links not configured (set ANDROID_SHA256_CERT_FINGERPRINTS).' },
            { status: 404 },
        );
    }

    return NextResponse.json(
        [
            {
                relation: ['delegate_permission/common.handle_all_urls'],
                target: {
                    namespace: 'android_app',
                    package_name: PACKAGE,
                    sha256_cert_fingerprints: fps,
                },
            },
        ],
        { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' } },
    );
}
