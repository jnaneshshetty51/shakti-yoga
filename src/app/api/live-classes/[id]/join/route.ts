import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { createDailyToken } from '@/lib/daily';

export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const liveClass = await prisma.liveClass.findUnique({
            where: { id: params.id },
            include: {
                teacher: { select: { name: true } }
            }
        });

        if (!liveClass) {
            return NextResponse.json({ error: 'Live class not found' }, { status: 404 });
        }

        // Check if class is live or scheduled
        if (liveClass.status === 'ENDED' || liveClass.status === 'CANCELLED') {
            return NextResponse.json({ error: 'This class has ended' }, { status: 400 });
        }

        // Get user info
        const user = await prisma.user.findUnique({
            where: { id: payload.id },
            select: { id: true, name: true, role: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const isTeacher = user.id === liveClass.teacherId;

        // Paywall Check: Non-teachers with VISITOR role cannot join live classes
        if (!isTeacher && user.role === 'VISITOR') {
            return NextResponse.json({
                error: 'Active membership or trial required to join live sessions. Please choose a plan to continue.',
                paywall: true
            }, { status: 403 });
        }

        // Create Daily.co meeting token
        const dailyToken = await createDailyToken(liveClass.roomId!, {
            user_name: user.name,
            is_owner: isTeacher,
        });

        // Record participant (if not teacher)
        if (!isTeacher) {
            await prisma.liveClassParticipant.upsert({
                where: {
                    userId_liveClassId: {
                        userId: user.id,
                        liveClassId: liveClass.id,
                    }
                },
                create: {
                    userId: user.id,
                    liveClassId: liveClass.id,
                    joinedAt: new Date(),
                },
                update: {
                    joinedAt: new Date(),
                }
            });
        }

        // Update class status to LIVE if teacher is joining
        if (isTeacher && liveClass.status === 'SCHEDULED') {
            await prisma.liveClass.update({
                where: { id: liveClass.id },
                data: {
                    status: 'LIVE',
                    startedAt: new Date(),
                }
            });
        }

        return NextResponse.json({
            roomUrl: liveClass.roomUrl,
            token: dailyToken,
            liveClass: {
                id: liveClass.id,
                title: liveClass.title,
                teacher: liveClass.teacher.name,
                isTeacher,
            }
        });
    } catch (error) {
        console.error('Join live class error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
