import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { computeProgress, GOAL_LABEL, markParticipantComplete } from '@/lib/challenges';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/** GET — participants of one challenge with live progress. */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
    if (!(await requireDepartment('CONTENT'))) return forbidden();
    const { id } = await ctx.params;

    const challenge = await prisma.challenge.findUnique({ where: { id } });
    if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(url.searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE));
    const q = url.searchParams.get('q')?.trim();

    const where: Prisma.ChallengeParticipantWhereInput = {
        challengeId: id,
        ...(q ? {
            OR: [
                { user: { name: { contains: q, mode: 'insensitive' } } },
                { user: { email: { contains: q, mode: 'insensitive' } } },
            ],
        } : {}),
    };

    // `progress` isn't a stored column — it's computed per participant with
    // its own DB query (see computeProgress), so it can't drive an ORDER BY
    // and doing it for every participant up front doesn't scale to a
    // popular challenge with hundreds of them. Paginate on the real,
    // indexed `joinedAt` column at the DB level first, then compute
    // progress only for the page actually being shown.
    const [parts, totalCount, completedCount] = await Promise.all([
        prisma.challengeParticipant.findMany({
            where,
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { joinedAt: 'asc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.challengeParticipant.count({ where }),
        prisma.challengeParticipant.count({ where: { challengeId: id, completedAt: { not: null } } }),
    ]);

    const rows = await Promise.all(
        parts.map(async (p) => ({
            id: p.id,
            userId: p.userId,
            name: p.user.name,
            email: p.user.email,
            joinedAt: p.joinedAt.toISOString(),
            completed: !!p.completedAt,
            completedAt: p.completedAt?.toISOString() ?? null,
            progress: Math.min(await computeProgress(challenge, p.userId), challenge.goalTarget),
        })),
    );

    return NextResponse.json({
        challenge: {
            id: challenge.id,
            title: challenge.title,
            goalTarget: challenge.goalTarget,
            goalLabel: GOAL_LABEL[challenge.goalType],
            startDate: challenge.startDate.toISOString(),
            endDate: challenge.endDate.toISOString(),
        },
        participants: rows,
        page,
        pageSize,
        totalCount,
        completedCount,
    });
}

/** PATCH — mark a participant complete / not-complete.  { participantId, completed } */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const admin = await requireDepartment('CONTENT');
    if (!admin) return forbidden();
    const { id } = await ctx.params;

    const body = await request.json().catch(() => ({}));
    const participantId = String(body.participantId || '');
    const completed = body.completed === true;

    const part = await prisma.challengeParticipant.findFirst({
        where: { id: participantId, challengeId: id },
        include: { challenge: true },
    });
    if (!part) return NextResponse.json({ error: 'Participant not found' }, { status: 404 });

    let nowComplete: boolean;
    if (completed) {
        await markParticipantComplete(part, part.challenge, `Marked complete by ${admin.email}.`);
        nowComplete = true;
    } else {
        await prisma.challengeParticipant.update({ where: { id: participantId }, data: { completedAt: null } });
        nowComplete = false;
    }

    await auditAs({ id: admin.id, email: admin.email }, request)({
        action: completed ? 'challenge.participant.complete' : 'challenge.participant.uncomplete',
        entity: 'ChallengeParticipant', entityId: participantId,
        after: { challengeId: id, userId: part.userId },
    });

    return NextResponse.json({ ok: true, completed: nowComplete });
}

/** DELETE — remove a participant.  ?participantId= */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const admin = await requireDepartment('CONTENT');
    if (!admin) return forbidden();
    const { id } = await ctx.params;
    const participantId = new URL(request.url).searchParams.get('participantId');
    if (!participantId) return NextResponse.json({ error: 'Missing participantId' }, { status: 400 });

    const part = await prisma.challengeParticipant.findFirst({ where: { id: participantId, challengeId: id } });
    if (!part) return NextResponse.json({ error: 'Participant not found' }, { status: 404 });

    await prisma.challengeParticipant.delete({ where: { id: participantId } });
    await auditAs({ id: admin.id, email: admin.email }, request)({
        action: 'challenge.participant.remove', entity: 'ChallengeParticipant', entityId: participantId,
        before: { challengeId: id, userId: part.userId },
    });
    return NextResponse.json({ ok: true });
}
