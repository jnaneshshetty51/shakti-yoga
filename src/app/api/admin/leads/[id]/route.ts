import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { LeadStatus } from '@prisma/client';
import { auditAs } from '@/lib/audit';

const ACTIVITY_TYPES = ['CALL', 'EMAIL', 'WHATSAPP', 'NOTE', 'MEETING'];

/** GET — one lead with its activity timeline. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const lead = await prisma.lead.findUnique({
        where: { id },
        include: {
            assignedTo: { select: { id: true, name: true } },
            activities: { orderBy: { createdAt: 'desc' } },
        },
    });
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ lead });
}

/** POST — log an activity (call / email / note …). */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const type = ACTIVITY_TYPES.includes(String(body.type).toUpperCase()) ? String(body.type).toUpperCase() : 'NOTE';
    const content = String(body.content || '').slice(0, 2000).trim();
    if (!content) return NextResponse.json({ error: 'Say what happened.' }, { status: 400 });

    const lead = await prisma.lead.findUnique({ where: { id }, select: { id: true } });
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const activity = await prisma.leadActivity.create({
        data: { leadId: id, type, content, performedBy: admin.email },
    });
    return NextResponse.json({ activity });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const admin = await requireAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const lead = await prisma.lead.findUnique({ where: { id } });
        if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        await prisma.lead.delete({ where: { id } });

        await auditAs({ id: admin.id, email: admin.email }, request)({
            action: 'lead.delete', entity: 'Lead', entityId: id,
            before: { name: lead.name, email: lead.email, status: lead.status },
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
        const { name, email, phone, country, status, programInterest, campaign, nextFollowUpAt, notes, assignedToId } = body;

        const prev = await prisma.lead.findUnique({ where: { id } });
        if (!prev) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const updateData: Record<string, unknown> = {};
        if (name) updateData.name = String(name).slice(0, 200);
        if (email) updateData.email = String(email).slice(0, 200);
        if (phone !== undefined) updateData.phone = phone || null;
        if (country !== undefined) updateData.country = country || null;
        if (programInterest !== undefined) updateData.programInterest = programInterest || null;
        if (campaign !== undefined) updateData.campaign = campaign || null;
        if (nextFollowUpAt !== undefined) {
            const d = nextFollowUpAt ? new Date(nextFollowUpAt) : null;
            if (d && Number.isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid follow-up date' }, { status: 400 });
            updateData.nextFollowUpAt = d;
        }
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

        if (updateData.status && prev.status && updateData.status !== prev.status) {
            await prisma.leadActivity.create({
                data: { leadId: id, type: 'STATUS_CHANGE', content: `${prev.status} → ${updateData.status}`, performedBy: admin.email },
            }).catch(() => {});
        }

        await auditAs({ id: admin.id, email: admin.email }, request)({
            action: 'lead.update', entity: 'Lead', entityId: id,
            before: { name: prev.name, email: prev.email, status: prev.status, assignedToId: prev.assignedToId, notes: prev.notes },
            after: { name: updatedLead.name, email: updatedLead.email, status: updatedLead.status, assignedToId: updatedLead.assignedToId, notes: updatedLead.notes },
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
