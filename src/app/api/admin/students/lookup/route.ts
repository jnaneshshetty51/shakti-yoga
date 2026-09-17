import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { Prisma } from '@prisma/client';

export type StudentLookupItem = {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    role: string;
    active: boolean;
    status: 'Active' | 'Trial' | 'Inactive' | 'Expired';
    plan: string;
    therapyCredits: number;
    renewalDate: string | null;
    country: string | null;
};

const PLAN_DISPLAY_NAMES: Record<string, string> = {
    EVERYDAY_YOGA: 'Everyday Yoga',
    YOGA_THERAPY: 'Yoga Therapy',
    STARTER: 'Starter Plan',
    FAMILY: 'Family Plan',
    TRIAL: 'Free Trial',
};

export async function GET(request: Request) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const url = new URL(request.url);
        const q = url.searchParams.get('q')?.trim();
        const limitParam = Number(url.searchParams.get('limit')) || 20;
        const limit = Math.min(50, Math.max(1, limitParam));

        // Students / members: exclude staff & admins
        const baseWhere: Prisma.UserWhereInput = {
            role: {
                notIn: ['SUPER_ADMIN', 'STAFF_ADMIN', 'TEACHER'],
            },
        };

        const where: Prisma.UserWhereInput = q
            ? {
                ...baseWhere,
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { email: { contains: q, mode: 'insensitive' } },
                    { phone: { contains: q, mode: 'insensitive' } },
                ],
            }
            : baseWhere;

        const users = await prisma.user.findMany({
            where,
            take: limit,
            orderBy: [
                { lastLogin: { sort: 'desc', nulls: 'last' } },
                { updatedAt: 'desc' },
            ],
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatarUrl: true,
                role: true,
                active: true,
                credits: true,
                subscription: {
                    select: {
                        planType: true,
                        status: true,
                        renewalDate: true,
                    },
                },
                country: true,
            },
        });

        const now = new Date();

        const students: StudentLookupItem[] = users.map((user) => {
            const sub = user.subscription;
            let status: 'Active' | 'Trial' | 'Inactive' | 'Expired' = 'Inactive';
            let plan = 'No active plan';

            if (sub) {
                plan = PLAN_DISPLAY_NAMES[sub.planType] || sub.planType;
                if (sub.status === 'ACTIVE') {
                    status = sub.renewalDate && sub.renewalDate < now ? 'Expired' : 'Active';
                } else if (sub.status === 'TRIAL') {
                    status = 'Trial';
                } else if (sub.status === 'EXPIRED') {
                    status = 'Expired';
                } else {
                    status = 'Inactive';
                }
            } else if (user.role === 'TRIAL') {
                status = 'Trial';
                plan = 'Free Trial';
            } else if (user.role === 'MEMBER_EVERYDAY') {
                plan = 'Everyday Yoga';
            } else if (user.role === 'MEMBER_THERAPY') {
                plan = 'Yoga Therapy';
            } else if (user.role === 'MEMBER_STARTER') {
                plan = 'Starter Plan';
            }

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                avatarUrl: user.avatarUrl,
                role: user.role,
                active: user.active,
                status,
                plan,
                therapyCredits: user.credits,
                renewalDate: sub?.renewalDate ? sub.renewalDate.toISOString() : null,
                country: user.country || null,
            };
        });

        return NextResponse.json({ students });
    } catch (error) {
        console.error('Student lookup API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
