import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { LeadSource } from '@prisma/client';

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || (payload.role !== 'admin' && payload.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');

        const whereClause: Record<string, unknown> = {};
        
        if (status && status !== 'all') {
            whereClause.status = status.toUpperCase();
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }

        const dbLeads = await prisma.lead.findMany({
            where: whereClause,
            include: {
                assignedTo: { select: { id: true, name: true } },
                _count: { select: { activities: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(dbLeads);
    } catch (error) {
        console.error('Admin leads API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
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
        const { name, email, phone, country, source, notes, assignedToId } = body;

        if (!name || !email) {
            return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
        }

        const dbSource = source ? source.toUpperCase() : 'WEBSITE';

        const newLead = await prisma.lead.create({
            data: {
                name,
                email,
                phone,
                country,
                source: dbSource as LeadSource,
                status: 'NEW',
                notes,
                assignedToId: assignedToId || undefined
            },
            include: {
                assignedTo: { select: { id: true, name: true } },
                _count: { select: { activities: true } }
            }
        });

        return NextResponse.json(newLead);
    } catch (error) {
        console.error('Admin leads POST API error:', error);
        return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
    }
}
