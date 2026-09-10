import { prisma } from '@/lib/prisma';
import { AttendanceStatus, SessionCreditReason } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { getPlan, type PlanConfig } from '@/lib/pricing';

/**
 * Session-credit ledger for capped group-class plans (monthly Everyday Yoga and
 * Family). One `CYCLE_GRANT` of `plan.sessionsPerCycle` is written when the plan
 * activates or renews; one `CLASS_ATTENDED` (-1) when a teacher confirms a member
 * Present; a `CLASS_REVERSED` (+1) if that confirmation is later corrected to
 * Absent. Balance for the live cycle is the sum of deltas whose `cycleStart`
 * matches `Subscription.currentCycleStart` — a renewal opens a new window, so
 * unused credits from the previous cycle stop counting (no rollover).
 *
 * Uncapped plans (annual Everyday/Family, Starter, Yoga Therapy) have
 * `sessionsPerCycle === null`: no grant, no ledger entries, and
 * `getSessionBalance` returns `null` for them.
 */

export interface SessionBalance {
    /** ISO timestamp — start of the active credit window. */
    cycleStart: string;
    /** ISO timestamp — when the window rolls over (the subscription renewal date). */
    cycleEnd: string;
    /** Sessions granted this cycle (grant + any purchases + positive adjustments). */
    granted: number;
    /** Sessions consumed this cycle (teacher-confirmed attendance, net of reversals). */
    used: number;
    /** granted − used. Zero means the member must buy an extra session to join again. */
    remaining: number;
    /** The plan's per-cycle allowance, for "N / {perCycle}" display. */
    perCycle: number;
}

type Tx = Prisma.TransactionClient;

/** The capped-plan allowance for a plan key, or `null` if the plan is uncapped. */
export function sessionsPerCycleForPlanKey(planKey: string | null | undefined): number | null {
    return getPlan(planKey).sessionsPerCycle;
}

/**
 * Write the per-cycle grant for a freshly activated/renewed capped plan.
 * No-op for uncapped plans. Idempotent per (user, cycleStart).
 */
export async function grantCycleCredits(
    userId: string,
    plan: PlanConfig,
    cycleStart: Date,
    client: Tx | typeof prisma = prisma,
): Promise<void> {
    if (plan.sessionsPerCycle == null || plan.sessionsPerCycle <= 0) return;

    const existing = await client.sessionCreditEntry.findFirst({
        where: { userId, cycleStart, reason: SessionCreditReason.CYCLE_GRANT },
        select: { id: true },
    });
    if (existing) return;

    await client.sessionCreditEntry.create({
        data: {
            userId,
            delta: plan.sessionsPerCycle,
            reason: SessionCreditReason.CYCLE_GRANT,
            cycleStart,
            note: `${plan.name} — ${plan.sessionsPerCycle} sessions for this cycle`,
        },
    });
}

/** The live session-credit balance, or `null` if the member's plan is uncapped. */
export async function getSessionBalance(userId: string): Promise<SessionBalance | null> {
    const sub = await prisma.subscription.findUnique({
        where: { userId },
        select: { planKey: true, currentCycleStart: true, renewalDate: true },
    });
    if (!sub || !sub.currentCycleStart) return null;

    const perCycle = sessionsPerCycleForPlanKey(sub.planKey);
    if (perCycle == null) return null;

    const rows = await prisma.sessionCreditEntry.findMany({
        where: { userId, cycleStart: sub.currentCycleStart },
        select: { delta: true },
    });

    let granted = 0;
    let used = 0;
    for (const r of rows) {
        if (r.delta >= 0) granted += r.delta;
        else used -= r.delta;
    }

    return {
        cycleStart: sub.currentCycleStart.toISOString(),
        cycleEnd: sub.renewalDate.toISOString(),
        granted,
        used,
        remaining: granted - used,
        perCycle,
    };
}

/**
 * Whether the member may still join a group class under their plan's session cap.
 * `capped: false` for uncapped plans (always allowed here — other checks still
 * apply). `remaining` is `null` when uncapped.
 */
export async function checkSessionAllowance(
    userId: string,
): Promise<{ capped: boolean; remaining: number | null; ok: boolean }> {
    const balance = await getSessionBalance(userId);
    if (!balance) return { capped: false, remaining: null, ok: true };
    return { capped: true, remaining: balance.remaining, ok: balance.remaining > 0 };
}

export interface AttendanceDecision {
    userId: string;
    status: 'PRESENT' | 'ABSENT';
}

/**
 * Apply a teacher's attendance decisions for one class instance. Creates a
 * `ClassAttendance` row for a member the teacher adds who never tapped Join,
 * flips status, and keeps the credit ledger in step:
 *   CHECKED_IN/ABSENT → PRESENT  ⇒  −1 (CLASS_ATTENDED), capped plans only
 *   PRESENT → ABSENT             ⇒  +1 (CLASS_REVERSED)
 * Idempotent: re-confirming the same status is a no-op. All-or-nothing.
 */
export async function applyAttendance(
    classInstanceId: string,
    decisions: AttendanceDecision[],
    confirmedById: string,
): Promise<{ confirmed: number }> {
    if (decisions.length === 0) return { confirmed: 0 };

    return prisma.$transaction(async (tx) => {
        let confirmed = 0;

        for (const decision of decisions) {
            const target =
                decision.status === 'PRESENT' ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT;

            const att =
                (await tx.classAttendance.findUnique({
                    where: { userId_classInstanceId: { userId: decision.userId, classInstanceId } },
                })) ??
                (await tx.classAttendance.create({
                    data: {
                        userId: decision.userId,
                        classInstanceId,
                        status: AttendanceStatus.CHECKED_IN,
                        addedByTeacher: true,
                    },
                }));

            // Net credit effect already recorded against this attendance row.
            const priorEntries = await tx.sessionCreditEntry.findMany({
                where: { classAttendanceId: att.id },
                select: { delta: true },
            });
            const consumed = priorEntries.reduce((s, e) => s + e.delta, 0) < 0;

            if (att.status === target && (target !== AttendanceStatus.PRESENT || consumed)) {
                continue; // nothing to do
            }

            const sub = await tx.subscription.findUnique({
                where: { userId: decision.userId },
                select: { planKey: true, currentCycleStart: true },
            });
            const capped =
                !!sub?.currentCycleStart && sessionsPerCycleForPlanKey(sub.planKey) != null;

            if (target === AttendanceStatus.PRESENT && !consumed && capped) {
                await tx.sessionCreditEntry.create({
                    data: {
                        userId: decision.userId,
                        delta: -1,
                        reason: SessionCreditReason.CLASS_ATTENDED,
                        cycleStart: sub!.currentCycleStart!,
                        classAttendanceId: att.id,
                        createdById: confirmedById,
                    },
                });
            } else if (target === AttendanceStatus.ABSENT && consumed) {
                await tx.sessionCreditEntry.create({
                    data: {
                        userId: decision.userId,
                        delta: 1,
                        reason: SessionCreditReason.CLASS_REVERSED,
                        cycleStart: sub?.currentCycleStart ?? att.joinedAt,
                        classAttendanceId: att.id,
                        createdById: confirmedById,
                    },
                });
            }

            await tx.classAttendance.update({
                where: { id: att.id },
                data: { status: target, confirmedAt: new Date(), confirmedById },
            });
            confirmed += 1;
        }

        return { confirmed };
    });
}

/** Manual balance correction from the admin console. */
export async function adminAdjustCredits(
    userId: string,
    delta: number,
    note: string,
    adminId: string,
): Promise<SessionBalance | null> {
    const sub = await prisma.subscription.findUnique({
        where: { userId },
        select: { planKey: true, currentCycleStart: true },
    });
    if (!sub?.currentCycleStart || sessionsPerCycleForPlanKey(sub.planKey) == null) {
        throw new Error('This member is not on a capped session plan.');
    }
    if (!Number.isInteger(delta) || delta === 0) {
        throw new Error('Adjustment must be a non-zero whole number.');
    }

    await prisma.sessionCreditEntry.create({
        data: {
            userId,
            delta,
            reason: SessionCreditReason.ADMIN_ADJUST,
            cycleStart: sub.currentCycleStart,
            note: note.trim() || 'Manual adjustment',
            createdById: adminId,
        },
    });

    return getSessionBalance(userId);
}

export interface SessionHistoryRow {
    id: string;
    date: string;
    batchName: string;
    status: AttendanceStatus;
}

/** Per-class attendance history for the member, newest first. */
export async function listSessionHistory(userId: string, limit = 60): Promise<SessionHistoryRow[]> {
    const rows = await prisma.classAttendance.findMany({
        where: { userId },
        select: {
            id: true,
            status: true,
            classInstance: { select: { date: true, batch: { select: { name: true } } } },
        },
        orderBy: { classInstance: { date: 'desc' } },
        take: limit,
    });

    return rows.map((r) => ({
        id: r.id,
        date: r.classInstance.date.toISOString(),
        batchName: r.classInstance.batch.name,
        status: r.status,
    }));
}
