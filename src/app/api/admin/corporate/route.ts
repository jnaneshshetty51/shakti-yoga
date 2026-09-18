import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { CorporateLeadStatus, Prisma } from '@prisma/client';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
    try {
        const admin = await requireAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const q = searchParams.get('q')?.trim();
        const view = searchParams.get('view');
        const isKanban = view === 'kanban';
        const page = Math.max(1, Number(searchParams.get('page')) || 1);
        const maxLimit = isKanban ? 300 : MAX_PAGE_SIZE;
        const pageSize = Math.min(maxLimit, Math.max(1, Number(searchParams.get('pageSize')) || (isKanban ? 200 : DEFAULT_PAGE_SIZE)));

        const statusKey = status?.toUpperCase();
        const where: Prisma.CorporateLeadWhereInput = {
            ...(statusKey && statusKey !== 'ALL' && statusKey in CorporateLeadStatus
                ? { status: statusKey as CorporateLeadStatus }
                : {}),
            ...(q
                ? {
                      OR: [
                          { companyName: { contains: q, mode: 'insensitive' } },
                          { contactName: { contains: q, mode: 'insensitive' } },
                          { contactEmail: { contains: q, mode: 'insensitive' } },
                          { contactPhone: { contains: q, mode: 'insensitive' } },
                      ],
                  }
                : {}),
        };

        const [leads, totalCount, stageGroup, totalValueAgg, wonValueAgg] = await Promise.all([
            prisma.corporateLead.findMany({
                where,
                include: {
                    assignedTo: { select: { id: true, name: true } },
                    _count: { select: { activities: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: isKanban ? 0 : (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.corporateLead.count({ where }),
            prisma.corporateLead.groupBy({
                by: ['status'],
                _count: { id: true },
                _sum: { dealValue: true },
            }),
            prisma.corporateLead.aggregate({
                where: { status: { not: CorporateLeadStatus.LOST } },
                _sum: { dealValue: true },
            }),
            prisma.corporateLead.aggregate({
                where: { status: { in: [CorporateLeadStatus.CONFIRMED, CorporateLeadStatus.PAYMENT, CorporateLeadStatus.COMPLETED] } },
                _sum: { dealValue: true },
            }),
        ]);

        const stageBreakdown: Record<string, { count: number; value: number }> = {};
        for (const g of stageGroup) {
            stageBreakdown[g.status] = {
                count: g._count.id,
                value: g._sum.dealValue || 0,
            };
        }

        const metrics = {
            totalDeals: totalCount,
            totalPipelineValue: totalValueAgg._sum.dealValue || 0,
            wonValue: wonValueAgg._sum.dealValue || 0,
            stageBreakdown,
        };

        return NextResponse.json({ leads, page, pageSize, totalCount, metrics });
    } catch (error) {
        console.error('Admin corporate leads API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const admin = await requireAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const { companyName, contactName, contactEmail, contactPhone, employeeCount, requirement, programInterest, notes, assignedToId, confirmDuplicate } = body;

        if (!companyName || !contactName || !contactEmail) {
            return NextResponse.json({ error: 'Company name, contact name and email are required' }, { status: 400 });
        }

        if (!confirmDuplicate) {
            const existing = await prisma.corporateLead.findFirst({
                where: {
                    status: { notIn: [CorporateLeadStatus.COMPLETED, CorporateLeadStatus.LOST] },
                    OR: [
                        { contactEmail: { equals: contactEmail, mode: 'insensitive' } },
                        { companyName: { equals: companyName, mode: 'insensitive' } },
                    ],
                },
                select: { id: true, companyName: true, contactEmail: true, status: true },
                orderBy: { createdAt: 'desc' },
            });
            if (existing) {
                return NextResponse.json({
                    error: 'duplicate',
                    message: `${existing.companyName} already has an open deal (status: ${existing.status}).`,
                    existingLead: existing,
                }, { status: 409 });
            }
        }

        const lead = await prisma.corporateLead.create({
            data: {
                companyName, contactName, contactEmail,
                contactPhone: contactPhone || null,
                employeeCount: employeeCount ? Number(employeeCount) : null,
                requirement: requirement || null,
                programInterest: programInterest || null,
                notes: notes || null,
                assignedToId: assignedToId || undefined,
                status: CorporateLeadStatus.NEW,
            },
            include: {
                assignedTo: { select: { id: true, name: true } },
                _count: { select: { activities: true } },
            },
        });

        await auditAs({ id: admin.id, email: admin.email }, request)({ action: 'corporate.create', entity: 'CorporateLead', entityId: lead.id, after: { companyName } });
        return NextResponse.json(lead);
    } catch (error) {
        console.error('Admin corporate leads POST error:', error);
        return NextResponse.json({ error: 'Failed to create corporate lead' }, { status: 500 });
    }
}
