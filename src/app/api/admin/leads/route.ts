import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { LeadSource, LeadStatus, Prisma } from '@prisma/client';
import { auditAs } from '@/lib/audit';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
    try {
        const admin = await requireAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search')?.trim();
        const page = Math.max(1, Number(searchParams.get('page')) || 1);
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE));

        const whereClause: Prisma.LeadWhereInput = {};

        if (status && status !== 'all' && status.toUpperCase() in LeadStatus) {
            whereClause.status = status.toUpperCase() as LeadStatus;
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [leads, totalCount] = await Promise.all([
            prisma.lead.findMany({
                where: whereClause,
                include: {
                    assignedTo: { select: { id: true, name: true } },
                    _count: { select: { activities: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.lead.count({ where: whereClause }),
        ]);

        return NextResponse.json({ leads, page, pageSize, totalCount });
    } catch (error) {
        console.error('Admin leads API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const admin = await requireAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const { name, email, phone, country, source, programInterest, campaign, notes, assignedToId, confirmDuplicate } = body;

        if (!name || !email) {
            return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
        }

        const rawSource = source ? String(source).toUpperCase() : 'WEBSITE';
        const dbSource = (rawSource in LeadSource ? rawSource : 'OTHER') as LeadSource;

        if (!confirmDuplicate) {
            const [existingUser, existingLead] = await Promise.all([
                prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true, name: true, role: true } }),
                prisma.lead.findFirst({
                    where: { email: { equals: email, mode: 'insensitive' } },
                    select: { id: true, name: true, status: true, createdAt: true },
                    orderBy: { createdAt: 'desc' },
                }),
            ]);
            if (existingUser || existingLead) {
                return NextResponse.json({
                    error: 'duplicate',
                    message: existingUser
                        ? `${existingUser.name} already has an account with this email.`
                        : `${existingLead!.name} is already a lead with this email (status: ${existingLead!.status}).`,
                    existingUser,
                    existingLead,
                }, { status: 409 });
            }
        }

        const newLead = await prisma.lead.create({
            data: {
                name,
                email,
                phone,
                country,
                source: dbSource,
                status: 'NEW',
                programInterest: programInterest || null,
                campaign: campaign || null,
                notes,
                assignedToId: assignedToId || undefined
            },
            include: {
                assignedTo: { select: { id: true, name: true } },
                _count: { select: { activities: true } }
            }
        });

        await auditAs({ id: admin.id, email: admin.email }, request)({
            action: 'lead.create', entity: 'Lead', entityId: newLead.id, after: { name, email, source: dbSource },
        });

        return NextResponse.json(newLead);
    } catch (error) {
        console.error('Admin leads POST API error:', error);
        return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
    }
}
