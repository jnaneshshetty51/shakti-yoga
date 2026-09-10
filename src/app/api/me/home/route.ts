import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, mapDatabaseRole } from '@/lib/auth';
import { syncSubscriptionState } from '@/lib/subscription';
import { getHomeContent } from '@/lib/content-home';
import { getStreak } from '@/lib/streak';
import { getClassFeed } from '@/lib/class-feed';
import { buildMemberActivity } from '@/lib/member-activity';
import { getNotificationState, isRead, isDismissed } from '@/lib/notifications';
import { computeProgress, serializeChallenge } from '@/lib/challenges';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

const SESSION_MINUTES = 45;

async function unreadActivityCount(userId: string): Promise<number> {
    const [items, state] = await Promise.all([
        buildMemberActivity(userId),
        getNotificationState(userId),
    ]);
    return items.filter((n) => !isDismissed(n, state) && !isRead(n, state)).length;
}

async function communityCard(role: Role) {
    const roles: Role[] = [role];
    if (role === Role.MEMBER_THERAPY) roles.push(Role.MEMBER_EVERYDAY);
    const g = await prisma.whatsAppGroup.findFirst({
        where: { active: true, role: { in: roles } },
        orderBy: { name: 'asc' },
    });
    return g ? { name: g.name, whatsappLink: g.link, pinnedMessage: g.pinnedMessage || null } : null;
}

async function activeChallenge(userId: string) {
    const part = await prisma.challengeParticipant.findFirst({
        where: {
            userId,
            completedAt: null,
            challenge: { status: 'PUBLISHED', endDate: { gte: new Date() } },
        },
        include: { challenge: true },
        orderBy: { challenge: { endDate: 'asc' } },
    });
    if (!part) return null;
    const progress = await computeProgress(part.challenge, userId);
    const v = serializeChallenge(part.challenge, part, progress);
    return {
        id: v.id,
        title: v.title,
        goalLabel: v.goalLabel,
        goalTarget: v.goalTarget,
        progress: v.progress,
        daysLeft: v.daysLeft,
        completed: v.completed,
    };
}

async function classesBlock(userId: string) {
    const feed = await getClassFeed(userId);
    const now = Date.now();
    const all = [...feed.today, ...feed.upcoming].filter((c) => new Date(c.endsAt).getTime() > now);
    const next = all[0] ?? null;
    const restToday = feed.today.filter((c) => c.id !== next?.id);
    return {
        access: feed.access,
        next,
        restToday,
        sessionBalance: feed.access.sessionBalance ?? null,
    };
}

async function therapyBlock(userId: string) {
    const [bookings, user] = await Promise.all([
        prisma.booking.findMany({
            where: { userId },
            include: { teacher: { select: { name: true } } },
            orderBy: { date: 'asc' },
        }),
        prisma.user.findUnique({ where: { id: userId }, select: { credits: true } }),
    ]);

    const now = Date.now();
    const nb = bookings.find(
        (b) => (b.status === 'PENDING' || b.status === 'CONFIRMED') && b.date.getTime() > now - 3_600_000,
    );
    const completed = bookings.filter((b) => b.status === 'COMPLETED').length;

    let next = null;
    if (nb) {
        const start = nb.date.getTime();
        const joinable = now >= start - 15 * 60_000 && now <= start + (SESSION_MINUTES + 15) * 60_000;
        next = {
            id: nb.id,
            date: nb.date.toISOString(),
            teacher: nb.teacher.name,
            type: nb.type,
            hasMeetingLink: Boolean(nb.meetingLink),
            joinable,
        };
    }
    return { next, completed, creditsRemaining: user?.credits ?? 0 };
}

/**
 * GET /api/me/home — one role-aware bundle for the mobile Home screen, so the app
 * makes a single request instead of fanning out to classes / bookings / content /
 * streak / challenges / activity itself. Read-only; every block degrades to null
 * on failure rather than failing the whole response.
 */
export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const effectiveRole = await syncSubscriptionState(session.id, user.role);
    const role = mapDatabaseRole(effectiveRole);

    const isEveryday = role === 'member_everyday' || role === 'member_starter' || role === 'trial';
    const isTherapy = role === 'member_therapy';
    const isMember = isEveryday || isTherapy;

    const [content, unread, community, classes, streak, therapy, challenge] = await Promise.all([
        getHomeContent(session.id),
        unreadActivityCount(session.id).catch(() => 0),
        communityCard(effectiveRole).catch(() => null),
        isEveryday ? classesBlock(session.id).catch(() => null) : Promise.resolve(undefined),
        isEveryday ? getStreak(session.id).catch(() => null) : Promise.resolve(undefined),
        isTherapy ? therapyBlock(session.id).catch(() => null) : Promise.resolve(undefined),
        isMember ? activeChallenge(session.id).catch(() => null) : Promise.resolve(undefined),
    ]);

    return NextResponse.json(
        {
            role,
            announcement: content.announcement,
            content: {
                featuredReel: content.featuredReel,
                forYou: content.forYou,
                recommended: content.recommended,
            },
            activity: { unreadCount: unread },
            community,
            ...(classes !== undefined ? { classes } : {}),
            ...(streak !== undefined ? { streak } : {}),
            ...(therapy !== undefined ? { therapy } : {}),
            ...(challenge !== undefined ? { activeChallenge: challenge } : {}),
        },
        { headers: { 'Cache-Control': 'no-store' } },
    );
}
