import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { LeadStatus } from '@prisma/client';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const admin = await requireAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
        const admin = await requireAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const { name, email, phone, country, status, notes, assignedToId } = body;

        const updateData: Record<string, unknown> = {};
        if (name) updateData.name = String(name).slice(0, 200);
        if (email) updateData.email = String(email).slice(0, 200);
        if (phone !== undefined) updateData.phone = phone || null;
        if (country !== undefined) updateData.country = country || null;
        if (status) {
            const s = String(status).toUpperCase();
            if (!(s in LeadStatus)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
            updateData.status = s;
        }
        if (notes !== undefined) updateData.notes = notes || null;
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
