import { prisma } from '@/lib/prisma';

export interface AchievementDef {
    key: string;
    title: string;
    description: string;
    icon: string; // emoji
}

/** Badge catalogue. Order = display order. */
export const ACHIEVEMENTS: AchievementDef[] = [
    { key: 'first_class', title: 'First breath', description: 'Attended your first class', icon: '🌱' },
    { key: 'classes_10', title: 'Finding a rhythm', description: 'Attended 10 classes', icon: '🌿' },
    { key: 'classes_50', title: 'Devoted', description: 'Attended 50 classes', icon: '🌳' },
    { key: 'streak_4', title: 'Four weeks strong', description: '4-week attendance streak', icon: '🔥' },
    { key: 'streak_12', title: 'Season of practice', description: '12-week attendance streak', icon: '☀️' },
    { key: 'first_practice', title: 'On your own mat', description: 'Completed a guided practice', icon: '🧘' },
    { key: 'practices_10', title: 'Home practice', description: 'Completed 10 guided practices', icon: '🕉️' },
    { key: 'first_save', title: 'Collector', description: 'Saved your first piece of content', icon: '🔖' },
    { key: 'saves_10', title: 'Curious mind', description: 'Saved 10 things to revisit', icon: '📚' },
    { key: 'first_comment', title: 'Part of the room', description: 'Left your first comment', icon: '💬' },
    { key: 'challenge_done', title: 'Challenge complete', description: 'Finished a community challenge', icon: '🏅' },
];

const BY_KEY = new Map(ACHIEVEMENTS.map((a) => [a.key, a]));

const DAY = 86_400_000;
const WEEK = 7 * DAY;
function weekStart(d: Date): number {
    const x = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const dow = (new Date(x).getUTCDay() + 6) % 7;
    return x - dow * DAY;
}

/**
 * Recompute which badges a member qualifies for and award any that are missing.
 * Cheap enough to call after a class join / save / comment / practice. Returns
 * the defs newly earned (for a toast), [] if none.
 */
export async function checkAchievements(userId: string): Promise<AchievementDef[]> {
    const [attendance, saves, comments, practices, challengesDone, existing] = await Promise.all([
        prisma.classAttendance.findMany({ where: { userId }, select: { joinedAt: true } }),
        prisma.contentInteraction.count({ where: { userId, kind: 'save' } }),
        prisma.contentComment.count({ where: { userId } }),
        prisma.practiceCompletion.count({ where: { userId } }),
        prisma.challengeParticipant.count({ where: { userId, completedAt: { not: null } } }),
        prisma.userAchievement.findMany({ where: { userId }, select: { key: true } }),
    ]);

    const weeks = new Set(attendance.map((a) => weekStart(a.joinedAt)));
    const thisWeek = weekStart(new Date());
    let streak = 0;
    let cursor = weeks.has(thisWeek) ? thisWeek : thisWeek - WEEK;
    while (weeks.has(cursor)) {
        streak += 1;
        cursor -= WEEK;
    }

    const earned = new Set(existing.map((e) => e.key));
    const qualifies: Record<string, boolean> = {
        first_class: attendance.length >= 1,
        classes_10: attendance.length >= 10,
        classes_50: attendance.length >= 50,
        streak_4: streak >= 4,
        streak_12: streak >= 12,
        first_practice: practices >= 1,
        practices_10: practices >= 10,
        first_save: saves >= 1,
        saves_10: saves >= 10,
        first_comment: comments >= 1,
        challenge_done: challengesDone >= 1,
    };

    const toAward = Object.entries(qualifies)
        .filter(([key, ok]) => ok && !earned.has(key))
        .map(([key]) => key);

    if (toAward.length === 0) return [];

    await prisma.userAchievement.createMany({
        data: toAward.map((key) => ({ userId, key })),
        skipDuplicates: true,
    });

    return toAward.map((k) => BY_KEY.get(k)!).filter(Boolean);
}

export function achievementDef(key: string): AchievementDef | undefined {
    return BY_KEY.get(key);
}
