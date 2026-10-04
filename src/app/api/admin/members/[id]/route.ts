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
            subscription: {
                include: { currentBatch: { select: { id: true, name: true, timeSlot: true } } },
            },
            profile: true,
            referralReceived: { include: { referrer: { select: { name: true, email: true } } } },
            referralsSent: { include: { referee: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } },
            certificates: { orderBy: { issuedAt: 'desc' } },
            therapyIntake: {
                select: {
                    id: true,
                    status: true,
                    submittedAt: true,
                    reviewedAt: true,
                    reviewedBy: { select: { id: true, name: true } },
                    reviewNotes: true,
                    fullName: true,
                    age: true,
                    gender: true,
                    heightCm: true,
                    weightKg: true,
                    primaryConcern: true,
                    concernDuration: true,
                    concernDescription: true,
                    injuriesSurgeries: true,
                    medicalConditions: true,
                    medications: true,
                    familyHistory: true,
                    priorYogaTherapy: true,
                    emergencyContactName: true,
                    emergencyContactPhone: true,
                },
            },
        },
    });
    if (!user) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const [payments, bookings, attendanceCount, recentAttendance, ledger, balance, audit, familySeats, notesAudit, latestBatchSwitch] =
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
                include: { classInstance: { select: { date: true, batch: { select: { id: true, name: true, timeSlot: true } } } } },
                orderBy: { joinedAt: 'desc' },
                take: 10,
            }),
            prisma.sessionCreditEntry.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
            getSessionBalance(id),
            prisma.auditLog.findMany({ where: { entityId: id }, orderBy: { createdAt: 'desc' }, take: 25 }),
            user.subscription?.planType === 'FAMILY' && !user.subscription.familyOwnerId
                ? prisma.subscription.findMany({
                      where: { familyOwnerId: id },
                      include: { user: { select: { name: true, email: true } } },
                  })
                : Promise.resolve([]),
            prisma.auditLog.findMany({
                where: { entityId: id, action: 'student.note.create' },
                orderBy: { createdAt: 'desc' },
                take: 50,
            }),
            prisma.auditLog.findFirst({
                where: { entityId: id, action: 'student.batch.switch' },
                orderBy: { createdAt: 'desc' },
            }),
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
            referralCreditBalance: Number(user.referralCreditBalance),
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
            ? {
                  id: user.therapyIntake.id,
                  status: user.therapyIntake.status,
                  submittedAt: user.therapyIntake.submittedAt?.toISOString() ?? null,
                  reviewedAt: user.therapyIntake.reviewedAt?.toISOString() ?? null,
                  reviewedBy: user.therapyIntake.reviewedBy?.name ?? null,
                  reviewNotes: user.therapyIntake.reviewNotes,
                  fullName: user.therapyIntake.fullName,
                  age: user.therapyIntake.age,
                  gender: user.therapyIntake.gender,
                  heightCm: user.therapyIntake.heightCm,
                  weightKg: user.therapyIntake.weightKg,
                  primaryConcern: user.therapyIntake.primaryConcern,
                  concernDuration: user.therapyIntake.concernDuration,
                  concernDescription: user.therapyIntake.concernDescription,
                  injuriesSurgeries: user.therapyIntake.injuriesSurgeries,
                  medicalConditions: user.therapyIntake.medicalConditions,
                  medications: user.therapyIntake.medications,
                  familyHistory: user.therapyIntake.familyHistory,
                  priorYogaTherapy: user.therapyIntake.priorYogaTherapy,
                  emergencyContactName: user.therapyIntake.emergencyContactName,
                  emergencyContactPhone: user.therapyIntake.emergencyContactPhone,
              }
            : null,
        // Prefer the real assignment (Subscription.currentBatchId) over the audit-log trail —
        // that field only exists for members switched before this was a real column.
        assignedBatch: user.subscription?.currentBatch
            ? {
                  batchId: user.subscription.currentBatch.id,
                  batchName: user.subscription.currentBatch.name,
                  timeSlot: user.subscription.currentBatch.timeSlot,
              }
            : latestBatchSwitch?.after
            ? (latestBatchSwitch.after as { batchId?: string; batchName?: string; timeSlot?: string })
            : recentAttendance[0]
            ? {
                  batchId: recentAttendance[0].classInstance.batch.id,
                  batchName: recentAttendance[0].classInstance.batch.name,
                  timeSlot: recentAttendance[0].classInstance.batch.timeSlot,
              }
            : null,
        observationNotes: notesAudit
            .map((n) => {
                const payload = (n.after as { category?: string; note?: string; isPinned?: boolean }) || {};
                return {
                    id: n.id,
                    author: n.actorEmail || 'Staff',
                    category: payload.category || 'GENERAL',
                    note: payload.note || (typeof n.after === 'string' ? n.after : ''),
                    isPinned: Boolean(payload.isPinned),
                    at: n.createdAt.toISOString(),
                };
            })
            // Matches notes/route.ts's GET — pinned notes surface first regardless of age.
            .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)),
        audit: audit.map((a) => ({
            id: a.id, action: a.action, actor: a.actorEmail, at: a.createdAt.toISOString(),
        })),
    });
}
