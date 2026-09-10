import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { getSessionBalance } from '@/lib/sessionCredits';

export const dynamic = 'force-dynamic';
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/** GET /api/admin/members/:id — the full member drill-down. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    if (!(await requireAdmin())) return forbidden();
    const { id } = await ctx.params;

    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            subscription: true,
            profile: true,
            referralReceived: { include: { referrer: { select: { name: true, email: true } } } },
            referralsSent: { include: { referee: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } },
            certificates: { orderBy: { issuedAt: 'desc' } },
            therapyIntake: { select: { status: true, submittedAt: true, reviewedAt: true } },
        },
    });
    if (!user) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const [payments, bookings, attendanceCount, recentAttendance, ledger, balance, audit, familySeats] =
        await Promise.all([
            prisma.payment.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
            prisma.booking.findMany({
                where: { userId: id },
                include: { teacher: { select: { name: true } } },
                orderBy: { date: 'desc' },
                take: 20,
            }),
            prisma.classAttendance.count({ where: { userId: id } }),
            prisma.classAttendance.findMany({
                where: { userId: id },
                include: { classInstance: { select: { date: true, batch: { select: { name: true } } } } },
                orderBy: { joinedAt: 'desc' },
                take: 10,
            }),
            prisma.sessionCreditEntry.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
            getSessionBalance(id),
            prisma.auditLog.findMany({ where: { entityId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
            user.subscription?.planType === 'FAMILY' && !user.subscription.familyOwnerId
                ? prisma.subscription.findMany({
                      where: { familyOwnerId: id },
                      include: { user: { select: { name: true, email: true } } },
                  })
                : Promise.resolve([]),
        ]);

    return NextResponse.json({
        member: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            country: user.country,
            timezone: user.timezone,
            avatarUrl: user.avatarUrl,
            role: user.role,
            active: user.active,
            therapyCredits: user.credits,
            referralCode: user.referralCode,
            referralCreditBalance: user.referralCreditBalance,
            createdAt: user.createdAt.toISOString(),
            lastLogin: user.lastLogin?.toISOString() ?? null,
            trialStartedAt: user.trialStartedAt?.toISOString() ?? null,
            goals: user.profile?.goals ?? null,
            communicationPref: user.profile?.communicationPref ?? null,
        },
        subscription: user.subscription
            ? {
                  planType: user.subscription.planType,
                  planKey: user.subscription.planKey,
                  interval: user.subscription.interval,
                  amount: user.subscription.amount,
                  currency: user.subscription.currency,
                  status: user.subscription.status,
                  provider: user.subscription.provider,
                  renewalDate: user.subscription.renewalDate.toISOString(),
                  startDate: user.subscription.startDate.toISOString(),
                  pausedAt: user.subscription.pausedAt?.toISOString() ?? null,
                  isFamilySeat: !!user.subscription.familyOwnerId,
              }
            : null,
        sessionBalance: balance,
        stats: {
            classesAttended: attendanceCount,
            sessionsBooked: bookings.length,
            sessionsCompleted: bookings.filter((b) => b.status === 'COMPLETED').length,
        },
        payments: payments.map((p) => ({
            id: p.id, amount: p.amount, currency: p.currency, status: p.status,
            provider: p.provider, planKey: p.planKey ?? p.planType, at: p.createdAt.toISOString(),
        })),
        bookings: bookings.map((b) => ({
            id: b.id, type: b.type, status: b.status, teacher: b.teacher.name,
            at: b.date.toISOString(), hasMeetingLink: !!b.meetingLink,
        })),
        attendance: recentAttendance.map((a) => ({
            id: a.id, status: a.status,
            batch: a.classInstance.batch.name, at: a.classInstance.date.toISOString(),
        })),
        creditLedger: ledger.map((e) => ({
            id: e.id, delta: e.delta, reason: e.reason, note: e.note, at: e.createdAt.toISOString(),
        })),
        referrals: {
            referredBy: user.referralReceived
                ? { name: user.referralReceived.referrer.name, status: user.referralReceived.status }
                : null,
            invited: user.referralsSent.map((r) => ({
                name: r.referee.name, status: r.status, reward: r.rewardAmount, at: r.createdAt.toISOString(),
            })),
        },
        family: familySeats.map((s) => ({ name: s.user.name, email: s.user.email, status: s.status })),
        certificates: user.certificates.map((c) => ({
            id: c.id, title: c.title, status: c.status, at: c.issuedAt.toISOString(),
        })),
        therapyIntake: user.therapyIntake
            ? { status: user.therapyIntake.status, submittedAt: user.therapyIntake.submittedAt?.toISOString() ?? null }
            : null,
        audit: audit.map((a) => ({
            id: a.id, action: a.action, actor: a.actorEmail, at: a.createdAt.toISOString(),
        })),
    });
}
