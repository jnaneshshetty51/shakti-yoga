import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) return NextResponse.json({ groups: [] });

        const payload = await verifyToken(token);
        if (!payload) return NextResponse.json({ groups: [] });

        const user = await prisma.user.findUnique({
            where: { id: payload.id },
            select: { role: true },
        });
        if (!user) return NextResponse.json({ groups: [] });

        const roles: Role[] = [user.role];
        // Therapy members also see the everyday community.
        if (user.role === Role.MEMBER_THERAPY) roles.push(Role.MEMBER_EVERYDAY);

        const groups = await prisma.whatsAppGroup.findMany({
            where: { active: true, role: { in: roles } },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json({
            groups: groups.map(g => ({
                id: g.id,
                name: g.name,
                whatsappLink: g.link,
                pinnedMessage: g.pinnedMessage || '',
            })),
        });
    } catch (error) {
        console.error('Community API error:', error);
        return NextResponse.json({ groups: [] });
    }
}
