import { NextResponse } from 'next/server';
import { verifyToken, mapDatabaseRole } from '@/lib/auth';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { syncSubscriptionState } from '@/lib/subscription';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ user: null });
        }

        const payload = await verifyToken(token);

        if (!payload) {
            return NextResponse.json({ user: null });
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true,
                country: true,
                timezone: true,
                avatarUrl: true,
                credits: true,
            },
        });

        if (!user) {
            return NextResponse.json({ user: null });
        }

        const effectiveRole = await syncSubscriptionState(user.id, user.role);

        return NextResponse.json({
            user: {
                ...user,
                role: mapDatabaseRole(effectiveRole)
            }
        });
    } catch (error) {
        console.error('Me API error:', error);
        return NextResponse.json({ user: null });
    }
}
