import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { LeadStatus } from '@prisma/client';
import { auditAs } from '@/lib/audit';

export async function POST(request: Request) {
    try {
        const admin = await requireAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const { leadIds, action, value } = body;

        if (!Array.isArray(leadIds) || leadIds.length === 0) {
            return NextResponse.json({ error: 'leadIds array is required' }, { status: 400 });
        }

        if (leadIds.length > 500) {
            return NextResponse.json({ error: 'Max 500 leads can be processed at once' }, { status: 400 });
        }

        const audit = auditAs({ id: admin.id, email: admin.email }, request);

        if (action === 'update_status') {
            const status = String(value).toUpperCase();
            if (!(status in LeadStatus)) {
                return NextResponse.json({ error: 'Invalid lead status' }, { status: 400 });
            }

            await prisma.$transaction([
                prisma.lead.updateMany({
                    where: { id: { in: leadIds } },
                    data: { status: status as LeadStatus },
                }),
                ...leadIds.map((id) =>
                    prisma.leadActivity.create({
                        data: {
                            leadId: id,
                            type: 'STATUS_CHANGE',
                            content: `Bulk updated status to ${status}`,
                            performedBy: admin.email,
                        },
                    })
                ),
            ]);

            await audit({
                action: 'lead.bulk_update_status',
                entity: 'Lead',
                after: { leadCount: leadIds.length, newStatus: status },
            });

            return NextResponse.json({ success: true, count: leadIds.length });
        }

        if (action === 'assign_staff') {
            const assignedToId = value ? String(value) : null;

            let staffName = 'Unassigned';
            if (assignedToId) {
                const staff = await prisma.user.findUnique({
                    where: { id: assignedToId },
                    select: { name: true },
                });
                if (staff) staffName = staff.name;
            }

            await prisma.$transaction([
                prisma.lead.updateMany({
                    where: { id: { in: leadIds } },
                    data: { assignedToId },
                }),
                ...leadIds.map((id) =>
                    prisma.leadActivity.create({
                        data: {
                            leadId: id,
                            type: 'NOTE',
                            content: `Lead assigned to ${staffName}`,
                            performedBy: admin.email,
                        },
                    })
                ),
            ]);

            await audit({
                action: 'lead.bulk_assign',
                entity: 'Lead',
                after: { leadCount: leadIds.length, assignedToId, staffName },
            });

            return NextResponse.json({ success: true, count: leadIds.length });
        }

        if (action === 'reschedule') {
            const nextFollowUpAt = value ? new Date(value) : null;
            if (nextFollowUpAt && Number.isNaN(nextFollowUpAt.getTime())) {
                return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
            }

            await prisma.$transaction([
                prisma.lead.updateMany({
                    where: { id: { in: leadIds } },
                    data: { nextFollowUpAt },
                }),
                ...leadIds.map((id) =>
                    prisma.leadActivity.create({
                        data: {
                            leadId: id,
                            type: 'NOTE',
                            content: nextFollowUpAt
                                ? `Follow-up rescheduled to ${nextFollowUpAt.toLocaleDateString('en-IN')}`
                                : 'Follow-up cleared',
                            performedBy: admin.email,
                        },
                    })
                ),
            ]);

            await audit({
                action: 'lead.bulk_reschedule',
                entity: 'Lead',
                after: { leadCount: leadIds.length, nextFollowUpAt: nextFollowUpAt?.toISOString() },
            });

            return NextResponse.json({ success: true, count: leadIds.length });
        }

        if (action === 'delete') {
            await prisma.lead.deleteMany({
                where: { id: { in: leadIds } },
            });

            await audit({
                action: 'lead.bulk_delete',
                entity: 'Lead',
                before: { leadCount: leadIds.length },
            });

            return NextResponse.json({ success: true, count: leadIds.length });
        }

        return NextResponse.json({ error: 'Unknown bulk action' }, { status: 400 });
    } catch (error) {
        console.error('Leads bulk API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
