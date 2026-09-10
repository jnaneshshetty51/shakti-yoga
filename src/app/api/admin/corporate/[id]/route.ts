import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { CorporateLeadStatus } from '@prisma/client';

const ACTIVITY_TYPES = ['CALL', 'EMAIL', 'WHATSAPP', 'NOTE', 'MEETING'];

/** GET — one corporate lead with its activity timeline. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const lead = await prisma.corporateLead.findUnique({
        where: { id },
        include: {
            assignedTo: { select: { id: true, name: true } },
            activities: { orderBy: { createdAt: 'desc' } },
        },
    });
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ lead });
}

/** POST — log an activity. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const type = ACTIVITY_TYPES.includes(String(body.type).toUpperCase()) ? String(body.type).toUpperCase() : 'NOTE';
    const content = String(body.content || '').slice(0, 2000).trim();
    if (!content) return NextResponse.json({ error: 'Say what happened.' }, { status: 400 });

    const lead = await prisma.corporateLead.findUnique({ where: { id }, select: { id: true } });
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const activity = await prisma.corporateLeadActivity.create({
        data: { corporateLeadId: id, type, content, performedBy: admin.email },
    });
    return NextResponse.json({ activity });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const admin = await requireAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        await prisma.corporateLead.delete({ where: { id } });
        return NextResponse.json({ success: true, message: 'Corporate lead deleted successfully' });
    } catch (error) {
        console.error('Failed to delete corporate lead:', error);
        return NextResponse.json({ error: 'Failed to delete corporate lead' }, { status: 500 });
    }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const admin = await requireAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const { companyName, contactName, contactEmail, contactPhone, employeeCount, requirement, programInterest, status, dealValue, notes, assignedToId } = body;

        const before = await prisma.corporateLead.findUnique({ where: { id } });
        if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const data: Record<string, unknown> = {};
        if (companyName) data.companyName = String(companyName).slice(0, 200);
        if (contactName) data.contactName = String(contactName).slice(0, 200);
        if (contactEmail) data.contactEmail = String(contactEmail).slice(0, 200);
        if (contactPhone !== undefined) data.contactPhone = contactPhone || null;
        if (employeeCount !== undefined) data.employeeCount = employeeCount === '' ? null : Number(employeeCount);
        if (requirement !== undefined) data.requirement = requirement || null;
        if (programInterest !== undefined) data.programInterest = programInterest || null;
        if (dealValue !== undefined) data.dealValue = dealValue === '' ? null : Number(dealValue);
        if (notes !== undefined) data.notes = notes || null;
        if (assignedToId !== undefined) data.assignedToId = assignedToId === '' ? null : assignedToId;
        if (status) {
            const s = String(status).toUpperCase();
            if (!(s in CorporateLeadStatus)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
            data.status = s;
        }

        const lead = await prisma.corporateLead.update({
            where: { id },
            data,
            include: { assignedTo: { select: { id: true, name: true } }, _count: { select: { activities: true } } },
        });

        if (status && String(status).toUpperCase() !== before.status) {
            await prisma.corporateLeadActivity.create({
                data: {
                    corporateLeadId: id,
                    type: 'STATUS_CHANGE',
                    content: `${before.status} → ${String(status).toUpperCase()}`,
                    performedBy: admin.email,
                },
            });
        }

        return NextResponse.json({ success: true, message: 'Corporate lead updated successfully', lead });
    } catch (error) {
        console.error('Failed to update corporate lead:', error);
        return NextResponse.json({ error: 'Failed to update corporate lead' }, { status: 500 });
    }
}
