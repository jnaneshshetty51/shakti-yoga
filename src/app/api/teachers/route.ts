import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

const STAFF_ROLES: Role[] = [Role.TEACHER, Role.STAFF_ADMIN, Role.SUPER_ADMIN];

/** GET /api/teachers — public "Meet Our Teachers" roster (publicly-visible staff only). */
export async function GET() {
    const staff = await prisma.user.findMany({
        where: { role: { in: STAFF_ROLES }, staffProfile: { publicVisible: true } },
        select: {
            id: true,
            name: true,
            avatarUrl: true,
            staffProfile: { select: { title: true, bio: true, specialties: true, yearsExperience: true } },
        },
        orderBy: [{ staffProfile: { displayOrder: 'asc' } }, { name: 'asc' }],
    });

    const teachers = staff.map((s) => ({
        id: s.id,
        name: s.name,
        photoUrl: s.avatarUrl ?? null,
        title: s.staffProfile?.title ?? null,
        bio: s.staffProfile?.bio ?? null,
        specialties: s.staffProfile?.specialties ?? [],
        yearsExperience: s.staffProfile?.yearsExperience ?? null,
    }));

    return NextResponse.json({ teachers }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
