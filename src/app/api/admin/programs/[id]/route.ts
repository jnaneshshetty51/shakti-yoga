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

        await prisma.program.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Program deleted successfully' });
    } catch (error) {
        console.error('Failed to delete program:', error);
        return NextResponse.json({ error: 'Failed to delete program' }, { status: 500 });
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
        const { title, description, duration, level, price, status, thumbnail } = body;

        const updateData: Record<string, unknown> = {};
        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (duration) updateData.duration = duration;
        if (level) updateData.level = level.toUpperCase();
        if (status) updateData.status = status.toUpperCase();
        if (price !== undefined) updateData.price = parseFloat(price);
        if (thumbnail !== undefined) updateData.thumbnail = thumbnail;

        const updatedProgram = await prisma.program.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({
            success: true,
            message: 'Program updated successfully',
            program: updatedProgram
        });
    } catch (error) {
        console.error('Failed to update program:', error);
        return NextResponse.json({ error: 'Failed to update program' }, { status: 500 });
    }
}
