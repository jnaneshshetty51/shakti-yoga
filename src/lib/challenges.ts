import { prisma } from '@/lib/prisma';
import { checkAchievements } from '@/lib/achievements';
import type { Challenge, ChallengeParticipant, ChallengeGoal } from '@prisma/client';

export const CHALLENGE_GOALS: ChallengeGoal[] = ['CLASSES', 'PRACTICES', 'PRACTICE_MINUTES'];

export const GOAL_LABEL: Record<ChallengeGoal, string> = {
    CLASSES: 'classes',
    PRACTICES: 'practices',
    PRACTICE_MINUTES: 'minutes of practice',
};

export function toChallengeGoal(v: unknown): ChallengeGoal {
    const s = String(v || '').toUpperCase();
    return (CHALLENGE_GOALS as string[]).includes(s) ? (s as ChallengeGoal) : 'CLASSES';
}

/** How far a member is toward one challenge's goal (raw count). */
export async function computeProgress(challenge: Challenge, userId: string): Promise<number> {
    const window = { gte: challenge.startDate, lte: challenge.endDate };
    if (challenge.goalType === 'CLASSES') {
        return prisma.classAttendance.count({ where: { userId, joinedAt: window } });
    }
    if (challenge.goalType === 'PRACTICES') {
        return prisma.practiceCompletion.count({ where: { userId, completedAt: window } });
    }
    const agg = await prisma.practiceCompletion.aggregate({
        where: { userId, completedAt: window },
        _sum: { minutes: true },
    });
    return agg._sum.minutes ?? 0;
}

/**
 * Mark one participant complete and issue the same certificate the automatic
 * path would have — shared by updateChallengeProgress (goal reached) and the
 * admin "mark complete" override, so a manually-completed participant isn't
 * missing the certificate the certificates page's own copy promises.
 * No-op if already complete.
 */
export async function markParticipantComplete(
    participant: ChallengeParticipant,
    challenge: Challenge,
    reason: string,
): Promise<void> {
    if (participant.completedAt) return;
    await prisma.challengeParticipant.update({
        where: { id: participant.id },
        data: { completedAt: new Date() },
    });
    await prisma.certificate.create({
        data: {
            userId: participant.userId,
            title: `Completed: ${challenge.title}`,
            reason,
            sourceType: 'Challenge',
            sourceId: participant.id,
        },
    }).catch(() => {});
    await checkAchievements(participant.userId).catch(() => {});
}

/**
 * Recompute the member's progress across the challenges they've joined and mark
 * any newly finished. Call after a class join / practice completion.
 */
export async function updateChallengeProgress(userId: string): Promise<void> {
    const now = new Date();
    const parts = await prisma.challengeParticipant.findMany({
        where: { userId, completedAt: null, challenge: { status: 'PUBLISHED', endDate: { gte: now } } },
        include: { challenge: true },
    });

    for (const p of parts) {
        const progress = await computeProgress(p.challenge, userId);
        if (progress >= p.challenge.goalTarget) {
            await markParticipantComplete(
                p, p.challenge,
                `Reached the ${p.challenge.goalTarget} ${GOAL_LABEL[p.challenge.goalType]} goal.`,
            );
        }
    }
}

export interface ChallengeView {
    id: string;
    title: string;
    description: string | null;
    goalType: ChallengeGoal;
    goalLabel: string;
    goalTarget: number;
    startDate: string;
    endDate: string;
    imageUrl: string | null;
    daysLeft: number;
    participantCount: number;
    joined: boolean;
    progress: number;
    completed: boolean;
}

export function serializeChallenge(
    c: Challenge & { _count?: { participants: number } },
    participant: ChallengeParticipant | null,
    progress: number,
): ChallengeView {
    const daysLeft = Math.max(0, Math.ceil((c.endDate.getTime() - Date.now()) / 86_400_000));
    return {
        id: c.id,
        title: c.title,
        description: c.description,
        goalType: c.goalType,
        goalLabel: GOAL_LABEL[c.goalType],
        goalTarget: c.goalTarget,
        startDate: c.startDate.toISOString(),
        endDate: c.endDate.toISOString(),
        imageUrl: c.imageUrl,
        daysLeft,
        participantCount: c._count?.participants ?? 0,
        joined: !!participant,
        progress: Math.min(progress, c.goalTarget),
        completed: !!participant?.completedAt,
    };
}
