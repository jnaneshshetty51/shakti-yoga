import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { readJson, str, optStr, ValidationError, handleValidationError } from '@/lib/validation';

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
                avatarUrl: true,
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

        const body = await readJson(request);

        const userData: Record<string, string | null> = {};
        if (body.name !== undefined) userData.name = str(body.name, { label: 'name', min: 1, max: 120 });
        if (body.phone !== undefined) userData.phone = optStr(body.phone, { label: 'phone', max: 32 }) ?? null;
        if (body.country !== undefined) userData.country = optStr(body.country, { label: 'country', max: 80 }) ?? null;
        if (body.timezone !== undefined) userData.timezone = optStr(body.timezone, { label: 'timezone', max: 64 }) ?? 'IST';

        const profileData = {
            goals: optStr(body.goals, { label: 'goals', max: 500 }) ?? null,
            medicalHistory: optStr(body.medicalHistory, { label: 'medicalHistory', max: 2000 }) ?? null,
            communicationPref: optStr(body.communicationPref, { label: 'communicationPref', max: 100 }) ?? null,
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
                avatarUrl: true,
                profile: {
                    select: { goals: true, medicalHistory: true, communicationPref: true },
                },
            },
        });

        return NextResponse.json({ profile: user });
    } catch (error) {
        if (error instanceof ValidationError) return handleValidationError(error);
        console.error('Profile PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
