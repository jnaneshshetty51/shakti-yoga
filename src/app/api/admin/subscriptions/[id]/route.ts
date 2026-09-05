import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || (payload.role !== 'admin' && payload.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.subscription.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Subscription deleted successfully' });
    } catch (error) {
        console.error('Failed to delete subscription:', error);
        return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
    }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || (payload.role !== 'admin' && payload.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { plan, amount, renewalDate, status } = body;

        const updateData: Record<string, unknown> = {};
        if (plan) {
            updateData.planType = plan === 'Everyday Yoga' ? 'EVERYDAY_YOGA' : plan === 'Yoga Therapy' ? 'YOGA_THERAPY' : 'TRIAL';
        }
        if (amount !== undefined) {
            updateData.amount = parseFloat(amount);
        }
        if (renewalDate) {
            updateData.renewalDate = new Date(renewalDate);
        }
        if (status) {
            updateData.status = status.toUpperCase();
        }

        const updatedSub = await prisma.subscription.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({
            success: true,
            message: 'Subscription updated successfully',
            subscription: updatedSub
        });
    } catch (error) {
        console.error('Failed to update subscription:', error);
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }
}
