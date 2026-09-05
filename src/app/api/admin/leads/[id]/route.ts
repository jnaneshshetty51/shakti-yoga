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

        await prisma.lead.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Lead deleted successfully' });
    } catch (error) {
        console.error('Failed to delete lead:', error);
        return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
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
        const { name, email, phone, country, status, notes, assignedToId } = body;

        const updateData: Record<string, unknown> = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (country !== undefined) updateData.country = country;
        if (status) updateData.status = status.toUpperCase();
        if (notes !== undefined) updateData.notes = notes;
        if (assignedToId !== undefined) {
            updateData.assignedToId = assignedToId === '' ? null : assignedToId;
        }

        const updatedLead = await prisma.lead.update({
            where: { id },
            data: updateData,
            include: {
                assignedTo: { select: { id: true, name: true } },
                _count: { select: { activities: true } }
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Lead updated successfully',
            lead: updatedLead
        });
    } catch (error) {
        console.error('Failed to update lead:', error);
        return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
    }
}
