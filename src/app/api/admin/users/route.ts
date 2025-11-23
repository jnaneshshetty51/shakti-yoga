import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || (payload.role !== 'SUPER_ADMIN' && payload.role !== 'STAFF_ADMIN')) {
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

