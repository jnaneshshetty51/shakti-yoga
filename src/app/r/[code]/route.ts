import { NextResponse } from 'next/server';

/**
 * Referral link. `shaktiyoga.in/r/<code>` → signup with the code prefilled.
 * The mobile app intercepts this path as a deep link before it reaches here;
 * on the web it just carries the code into the signup form (validated on redeem).
 */
export async function GET(request: Request, ctx: { params: Promise<{ code: string }> }) {
    const { code: raw } = await ctx.params;
    const code = (raw || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 24).toUpperCase();
    const url = new URL('/signup', request.url);
    if (code) url.searchParams.set('ref', code);
    return NextResponse.redirect(url, 302);
}
