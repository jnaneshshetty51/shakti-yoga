import { NextResponse } from 'next/server';
import { regionFor } from '@/lib/pricing';

/** The ₹/$ toggle posts here to pin a pricing region for 180 days. */
export async function POST(request: Request) {
    const body = await request.json().catch(() => ({}));
    const region = regionFor(typeof body.region === 'string' ? body.region : null);
    const res = NextResponse.json({ region });
    res.cookies.set('sy_region', region, {
        maxAge: 60 * 60 * 24 * 180,
        path: '/',
        sameSite: 'lax',
    });
    return res;
}
