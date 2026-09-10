import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { CorporateLeadStatus } from '@prisma/client';

export async function GET(request: Request) {
    try {
        const admin = await requireAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');

        const where: Record<string, unknown> = {};
        if (status && status !== 'all') where.status = status.toUpperCase();
        if (search) {
            where.OR = [
                { companyName: { contains: search, mode: 'insensitive' } },
                { contactEmail: { contains: search, mode: 'insensitive' } },
            ];
        }

        const leads = await prisma.corporateLead.findMany({
            where,
            include: {
                assignedTo: { select: { id: true, name: true } },
                _count: { select: { activities: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(leads);
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
        const { companyName, contactName, contactEmail, contactPhone, employeeCount, requirement, programInterest, notes, assignedToId } = body;

        if (!companyName || !contactName || !contactEmail) {
            return NextResponse.json({ error: 'Company name, contact name and email are required' }, { status: 400 });
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

        return NextResponse.json(lead);
    } catch (error) {
        console.error('Admin corporate leads POST error:', error);
        return NextResponse.json({ error: 'Failed to create corporate lead' }, { status: 500 });
    }
}
