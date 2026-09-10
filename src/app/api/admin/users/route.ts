import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, requireSuperAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { Role } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET() {
    try {
        const payload = await requireAdmin();
        if (!payload) return forbidden();

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
                active: user.active,
                phone: user.phone,
                country: user.country,
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
        const { id, name, role, credits, phone, country, active } = body;
        if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
        if (active === false && id === admin.id) {
            return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 });
        }

        if (role && !(role in Role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        const before = await prisma.user.findUnique({
            where: { id },
            select: { name: true, role: true, credits: true, phone: true, country: true, active: true },
        });
        if (!before) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Granting OR removing an admin tier is a super-admin-only action.
        const ADMIN_ROLES = ['SUPER_ADMIN', 'STAFF_ADMIN'];
        const touchesAdmin =
            role !== undefined && (ADMIN_ROLES.includes(role) || ADMIN_ROLES.includes(before.role));
        if (touchesAdmin && !(await requireSuperAdmin())) {
            return NextResponse.json(
                { error: 'Only a super admin can change admin roles.' },
                { status: 403 },
            );
        }

        const data: Record<string, unknown> = {};
        if (name !== undefined) data.name = String(name).trim();
        if (role !== undefined) data.role = role as Role;
        if (credits !== undefined) data.credits = Math.max(0, Math.trunc(Number(credits) || 0));
        if (phone !== undefined) data.phone = phone || null;
        if (country !== undefined) data.country = country || null;
        if (active !== undefined) {
            data.active = Boolean(active);
            // Revoke live sessions when deactivating.
            if (!active) data.tokenVersion = { increment: 1 };
        }

        const user = await prisma.user.update({ where: { id }, data });

        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: active === false ? 'user.deactivate' : active === true ? 'user.reactivate' : 'user.update',
            entity: 'User', entityId: id,
            before, after: { name: user.name, role: user.role, credits: user.credits, phone: user.phone, country: user.country, active: user.active },
        });

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

        const target = await prisma.user.findUnique({
            where: { id }, select: { email: true, name: true, role: true },
        });
        if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Clear dependent rows that have no cascade, then delete.
        await prisma.$transaction([
            prisma.subscription.deleteMany({ where: { userId: id } }),
            prisma.payment.deleteMany({ where: { userId: id } }),
            prisma.booking.deleteMany({ where: { OR: [{ userId: id }, { teacherId: id }] } }),
            prisma.classAttendance.deleteMany({ where: { userId: id } }),
            prisma.story.deleteMany({ where: { userId: id } }),
            prisma.user.delete({ where: { id } }),
        ]);

        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'user.delete', entity: 'User', entityId: id, before: target,
        });
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

