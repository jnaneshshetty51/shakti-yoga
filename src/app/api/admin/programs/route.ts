import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const admin = await requireAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const dbPrograms = await prisma.program.findMany({
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ programs: dbPrograms });
    } catch (error) {
        console.error('Admin programs API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const admin = await requireAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const { title, description, duration, level, price, status, thumbnail } = body;

        if (!title || !description) {
            return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
        }

        const newProgram = await prisma.program.create({
            data: {
                title,
                description,
                duration: duration || 'Ongoing',
                level: level ? level.toUpperCase() : 'ALL_LEVELS',
                status: status ? status.toUpperCase() : 'DRAFT',
                price: parseFloat(price) || 0,
                thumbnail: thumbnail || null
            }
        });

        return NextResponse.json({ success: true, program: newProgram });
    } catch (error) {
        console.error('Admin programs POST API error:', error);
        return NextResponse.json({ error: 'Failed to create program' }, { status: 500 });
    }
}
