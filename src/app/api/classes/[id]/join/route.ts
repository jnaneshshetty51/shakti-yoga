import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canJoinGroupClass } from '@/lib/class-access';
import { isJoinable, resolveMeetingLink } from '@/lib/class-schedule';

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

        if (instance.batch.planType !== 'EVERYDAY_YOGA') {
            return NextResponse.json({ error: 'This class is not a group class.' }, { status: 400 });
        }

        if (!isStaff) {
            const access = await canJoinGroupClass(session.id);
            if (!access.ok) {
                return NextResponse.json({ error: access.reason, paywall: access.paywall }, { status: 403 });
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

        // Record attendance for members only — staff/teacher joins don't count.
        // createMany + skipDuplicates avoids a logged unique-constraint error on re-join.
        if (!isStaff) {
            const { count } = await prisma.classAttendance.createMany({
                data: [{ userId: session.id, classInstanceId: instance.id }],
                skipDuplicates: true,
            });
            if (count > 0) {
                await prisma.classInstance.update({
                    where: { id: instance.id },
                    data: { attendanceCount: { increment: 1 } },
                });
            }
        }

        return NextResponse.json({ meetingLink });
    } catch (error) {
        console.error('Join class error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
