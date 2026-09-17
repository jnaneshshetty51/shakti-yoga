import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canJoinGroupClass } from '@/lib/class-access';
import { isJoinable, resolveMeetingLink } from '@/lib/class-schedule';
import { recordEvent } from '@/lib/analytics';
import { checkAchievements } from '@/lib/achievements';
import { updateChallengeProgress } from '@/lib/challenges';

export async function POST(_request: Request, props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;

    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isStaff = session.role === 'admin' || session.role === 'teacher';

    try {
        const instance = await prisma.classInstance.findUnique({
            where: { id },
            include: { batch: true },
        });

        if (!instance) {
            return NextResponse.json({ error: 'Class not found' }, { status: 404 });
        }

        if (instance.status === 'Cancelled') {
            return NextResponse.json({ error: 'This class has been cancelled.' }, { status: 400 });
        }

        if (instance.status === 'Completed') {
            return NextResponse.json({ error: 'This class has already ended.' }, { status: 400 });
        }

        if (instance.batch.planType !== 'EVERYDAY_YOGA') {
            return NextResponse.json({ error: 'This class is not a group class.' }, { status: 400 });
        }

        // Free/special classes: skip the membership/trial/credit gate entirely
        // (still requires being logged in — this isn't an anonymous-access path).
        const openAccess = instance.openAccess ?? instance.batch.openAccess;

        if (!isStaff && !openAccess) {
            const access = await canJoinGroupClass(session.id, instance.id);
            if (!access.ok) {
                return NextResponse.json(
                    { error: access.reason, paywall: access.paywall, outOfSessions: access.outOfSessions ?? false },
                    { status: 403 },
                );
            }
        }

        if (!isStaff && !isJoinable(instance, instance.batch)) {
            const opensSoon = instance.date.getTime() > Date.now();
            return NextResponse.json(
                {
                    error: opensSoon
                        ? "This class hasn't opened yet. Come back closer to the start time."
                        : 'This class has ended.',
                },
                { status: 403 },
            );
        }

        const meetingLink = resolveMeetingLink(instance);
        if (!meetingLink) {
            return NextResponse.json(
                { error: 'No meeting link has been set for this class yet. Please contact your teacher.' },
                { status: 409 },
            );
        }

        // Record a self check-in for members only (status defaults to CHECKED_IN —
        // it does NOT consume a session credit; the teacher confirms Present after
        // class, see lib/sessionCredits.applyAttendance). Staff/teacher joins don't count.
        if (!isStaff) {
            const already = await prisma.classAttendance.findUnique({
                where: { userId_classInstanceId: { userId: session.id, classInstanceId: instance.id } },
                select: { id: true },
            });

            if (!already) {
                const capacity = instance.capacity ?? instance.batch.capacity;

                if (capacity != null) {
                    // Atomic capacity claim — a single UPDATE...WHERE is one
                    // statement Postgres applies atomically per row, so two
                    // concurrent joins can never both see "space available":
                    // only one can affect the row before the other's WHERE
                    // re-evaluates against the now-incremented count.
                    const claim = await prisma.classInstance.updateMany({
                        where: { id: instance.id, attendanceCount: { lt: capacity } },
                        data: { attendanceCount: { increment: 1 } },
                    });
                    if (claim.count === 0) {
                        return NextResponse.json(
                            { error: 'This class is full. Try another batch or come back for a spot that opens up.' },
                            { status: 409 },
                        );
                    }
                } else {
                    await prisma.classInstance.update({
                        where: { id: instance.id },
                        data: { attendanceCount: { increment: 1 } },
                    });
                }

                let joined = true;
                try {
                    await prisma.classAttendance.create({
                        data: { userId: session.id, classInstanceId: instance.id },
                    });
                } catch (e) {
                    // A concurrent duplicate request for this same user can race
                    // past the `already` check above and hit the unique
                    // constraint here — that's a harmless "you're already in",
                    // not a real second attendee, so release the slot we just
                    // claimed rather than leaving attendanceCount overcounted.
                    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                        joined = false;
                    } else {
                        await prisma.classInstance.update({
                            where: { id: instance.id },
                            data: { attendanceCount: { decrement: 1 } },
                        }).catch(() => {});
                        throw e;
                    }
                }

                if (!joined) {
                    await prisma.classInstance.update({
                        where: { id: instance.id },
                        data: { attendanceCount: { decrement: 1 } },
                    }).catch(() => {});
                } else {
                    recordEvent('CLASS_JOIN', { userId: session.id, metadata: { instanceId: instance.id } });
                    void checkAchievements(session.id).catch(() => {});
                    void updateChallengeProgress(session.id).catch(() => {});
                }
            }
        }

        return NextResponse.json({ meetingLink });
    } catch (error) {
        console.error('Join class error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * DELETE — a member un-joins a class they self-checked-into but a teacher
 * hasn't finalised yet (no credit was ever consumed for a CHECKED_IN row, so
 * there's nothing to refund). Frees the capacity slot for someone else.
 * Once a teacher has confirmed PRESENT/ABSENT, this is locked — that's a real
 * attendance record now, correctable only via the teacher/admin flow.
 */
export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;

    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const attendance = await prisma.classAttendance.findUnique({
            where: { userId_classInstanceId: { userId: session.id, classInstanceId: id } },
        });
        if (!attendance) return NextResponse.json({ error: 'You are not checked into this class.' }, { status: 404 });
        if (attendance.status !== 'CHECKED_IN') {
            return NextResponse.json(
                { error: 'This attendance has already been finalised by your teacher and can no longer be undone here — contact support for a correction.' },
                { status: 409 },
            );
        }

        await prisma.classAttendance.delete({ where: { id: attendance.id } });
        await prisma.classInstance.update({
            where: { id },
            data: { attendanceCount: { decrement: 1 } },
        }).catch(() => {});

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Leave class error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
