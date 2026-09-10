import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { computeProgress, GOAL_LABEL } from '@/lib/challenges';

export const dynamic = 'force-dynamic';
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/** GET — participants of one challenge with live progress. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    if (!(await requireDepartment('CONTENT'))) return forbidden();
    const { id } = await ctx.params;

    const challenge = await prisma.challenge.findUnique({ where: { id } });
    if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });

    const parts = await prisma.challengeParticipant.findMany({
        where: { challengeId: id },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: 'asc' },
    });

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
    rows.sort((a, b) => b.progress - a.progress);

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

    const part = await prisma.challengeParticipant.findFirst({ where: { id: participantId, challengeId: id } });
    if (!part) return NextResponse.json({ error: 'Participant not found' }, { status: 404 });

    const updated = await prisma.challengeParticipant.update({
        where: { id: participantId },
        data: { completedAt: completed ? (part.completedAt ?? new Date()) : null },
    });

    await auditAs({ id: admin.id, email: admin.email }, request)({
        action: completed ? 'challenge.participant.complete' : 'challenge.participant.uncomplete',
        entity: 'ChallengeParticipant', entityId: participantId,
        after: { challengeId: id, userId: part.userId },
    });

    return NextResponse.json({ ok: true, completed: !!updated.completedAt });
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
