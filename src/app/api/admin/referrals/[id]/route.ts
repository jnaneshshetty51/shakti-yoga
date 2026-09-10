import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { reverseReferral, setReferralFlag } from '@/lib/referral';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/**
 * PATCH /api/admin/referrals/[id]
 *   { action: "reverse" }        — claw back a rewarded referral (refund / abuse)
 *   { action: "flag" | "unflag" } — mark / clear for manual review
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? '');

    if (action === 'reverse') {
        const result = await reverseReferral(id, admin.id, admin.email);
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
        return NextResponse.json({ ok: true });
    }

    if (action === 'flag' || action === 'unflag') {
        await setReferralFlag(id, action === 'flag');
        await auditAs({ id: admin.id, email: admin.email }, request)({ action: `referral.${action}`, entity: 'Referral', entityId: id });
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
