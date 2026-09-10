import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET() {
    if (!(await requireAdmin())) return forbidden();

    const referrals = await prisma.referral.findMany({
        include: {
            referrer: { select: { id: true, name: true, email: true } },
            referee: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    const total = referrals.length;
    const converted = referrals.filter((r) => r.status === 'converted').length;
    const creditsIssued = referrals.reduce((sum, r) => sum + (r.rewardedAt ? r.rewardMonths : 0), 0);

    return NextResponse.json({
        referrals: referrals.map((r) => ({
            id: r.id,
            referrerName: r.referrer.name,
            referrerEmail: r.referrer.email,
            refereeName: r.referee.name,
            refereeEmail: r.referee.email,
            status: r.status,
            rewardMonths: r.rewardMonths,
            convertedAt: r.convertedAt,
            rewardedAt: r.rewardedAt,
            createdAt: r.createdAt,
        })),
        stats: {
            total,
            converted,
            conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
            creditsIssued,
        },
    });
}
