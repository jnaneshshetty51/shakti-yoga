import { NextResponse } from 'next/server';
import { getReferralSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

/**
 * GET /api/referral/settings — public, no auth. The referee-facing discount
 * amount, so pages like /signup can state it accurately instead of hardcoding
 * a number that drifts from whatever an admin has actually configured (see
 * /admin/referrals). INR only — non-INR checkouts don't get a referral
 * discount at all (see DISCOUNTABLE_CURRENCY in lib/referral.ts).
 */
export async function GET() {
    const { refereeDiscount } = await getReferralSettings();
    return NextResponse.json(
        { refereeDiscountInr: refereeDiscount },
        { headers: { 'Cache-Control': 'public, max-age=300' } },
    );
}
