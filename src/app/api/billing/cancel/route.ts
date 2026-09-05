import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const subscription = await prisma.subscription.findUnique({ where: { userId: payload.id } });
        if (!subscription) {
            return NextResponse.json({ error: 'No active subscription' }, { status: 404 });
        }

        // Mark cancelled — access continues until renewalDate, then a future job/login can downgrade.
        const updated = await prisma.subscription.update({
            where: { userId: payload.id },
            data: { status: 'CANCELLED' },
        });

        return NextResponse.json({ subscription: updated });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
