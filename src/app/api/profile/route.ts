import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

async function getUserId(): Promise<string | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    const payload = await verifyToken(token);
    return payload?.id ?? null;
}

export async function GET() {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                name: true,
                email: true,
                phone: true,
                country: true,
                timezone: true,
                profile: {
                    select: { goals: true, medicalHistory: true, communicationPref: true },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ profile: user });
    } catch (error) {
        console.error('Profile GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const { name, phone, country, timezone, goals, medicalHistory, communicationPref } = body;

        if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
            return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
        }

        const userData: Record<string, string | null> = {};
        if (name !== undefined) userData.name = name.trim();
        if (phone !== undefined) userData.phone = phone || null;
        if (country !== undefined) userData.country = country || null;
        if (timezone !== undefined) userData.timezone = timezone || 'IST';

        const profileData = {
            goals: goals ?? null,
            medicalHistory: medicalHistory ?? null,
            communicationPref: communicationPref ?? null,
        };

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...userData,
                profile: {
                    upsert: {
                        create: profileData,
                        update: profileData,
                    },
                },
            },
            select: {
                name: true,
                email: true,
                phone: true,
                country: true,
                timezone: true,
                profile: {
                    select: { goals: true, medicalHistory: true, communicationPref: true },
                },
            },
        });

        return NextResponse.json({ profile: user });
    } catch (error) {
        console.error('Profile PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
