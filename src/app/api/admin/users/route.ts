import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/admin-auth';
import { Role } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            include: {
                subscription: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const formattedUsers = users.map(user => {
            const subscription = user.subscription;
            let status: 'Active' | 'Inactive' | 'Trial' = 'Inactive';

            if (subscription) {
                if (subscription.status === 'ACTIVE') {
                    status = 'Active';
                } else if (subscription.status === 'TRIAL') {
                    status = 'Trial';
                }
            } else if (user.role === 'TRIAL') {
                status = 'Trial';
            }

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role.toLowerCase(),
                credits: user.credits,
                status,
                plan: subscription ?
                    subscription.planType === 'EVERYDAY_YOGA' ? 'Everyday Yoga' :
                        subscription.planType === 'YOGA_THERAPY' ? 'Yoga Therapy' : 'Trial' : undefined,
                lastLogin: user.lastLogin ? formatRelativeTime(user.lastLogin) : 'Never',
                joinedAt: formatDate(user.createdAt),
            };
        });

        return NextResponse.json({ users: formattedUsers });
    } catch (error) {
        console.error('Admin users API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();

    try {
        const body = await request.json().catch(() => ({}));
        const { id, name, role, credits, phone, country } = body;
        if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });

        if (role && !(role in Role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        const data: Record<string, unknown> = {};
        if (name !== undefined) data.name = String(name).trim();
        if (role !== undefined) data.role = role as Role;
        if (credits !== undefined) data.credits = Math.max(0, Math.trunc(Number(credits) || 0));
        if (phone !== undefined) data.phone = phone || null;
        if (country !== undefined) data.country = country || null;

        const user = await prisma.user.update({ where: { id }, data });
        return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role } });
    } catch (error) {
        console.error('Admin users PATCH error:', error);
        return NextResponse.json({ error: 'Could not update user' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();

    try {
        const id = new URL(request.url).searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
        if (id === admin.id) {
            return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
        }

        // Clear dependent rows that have no cascade, then delete.
        await prisma.$transaction([
            prisma.subscription.deleteMany({ where: { userId: id } }),
            prisma.payment.deleteMany({ where: { userId: id } }),
            prisma.booking.deleteMany({ where: { OR: [{ userId: id }, { teacherId: id }] } }),
            prisma.classAttendance.deleteMany({ where: { userId: id } }),
            prisma.story.deleteMany({ where: { userId: id } }),
            prisma.user.delete({ where: { id } }),
        ]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin users DELETE error:', error);
        return NextResponse.json({ error: 'Could not delete user' }, { status: 500 });
    }
}

function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    return formatDate(date);
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
}

