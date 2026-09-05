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

        // Using soft delete by setting active to false
        await prisma.classBatch.update({
            where: { id },
            data: { active: false }
        });

        return NextResponse.json({ success: true, message: 'Class batch deactivated successfully' });
    } catch (error) {
        console.error('Failed to delete class batch:', error);
        return NextResponse.json({ error: 'Failed to delete class batch' }, { status: 500 });
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
        const { name, planType, daysOfWeek, timeSlot, teacherId, active } = body;

        const updateData: Record<string, unknown> = {};
        if (name) updateData.name = name;
        if (planType) {
            updateData.planType = planType === 'EVERYDAY_YOGA' ? 'EVERYDAY_YOGA' : planType === 'YOGA_THERAPY' ? 'YOGA_THERAPY' : 'TRIAL';
        }
        if (daysOfWeek) {
            updateData.daysOfWeek = Array.isArray(daysOfWeek) ? daysOfWeek : daysOfWeek.split(',').map((d:string)=>d.trim());
        }
        if (timeSlot) updateData.timeSlot = timeSlot;
        if (teacherId) updateData.teacherId = teacherId;
        if (active !== undefined) updateData.active = active;

        const updatedBatch = await prisma.classBatch.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({
            success: true,
            message: 'Class batch updated successfully',
            class: updatedBatch
        });
    } catch (error) {
        console.error('Failed to update class batch:', error);
        return NextResponse.json({ error: 'Failed to update class batch' }, { status: 500 });
    }
}
