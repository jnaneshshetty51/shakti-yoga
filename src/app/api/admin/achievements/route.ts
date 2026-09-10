import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { ACHIEVEMENTS, achievementDef } from '@/lib/achievements';

export const dynamic = 'force-dynamic';
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/** GET — the badge catalogue with earned counts; ?email= adds that member's earned keys. */
export async function GET(request: Request) {
    if (!(await requireDepartment('CONTENT'))) return forbidden();

    const email = new URL(request.url).searchParams.get('email')?.trim().toLowerCase();

    const counts = await prisma.userAchievement.groupBy({ by: ['key'], _count: { _all: true } });
    const countByKey = new Map(counts.map((c) => [c.key, c._count._all]));

    let member: { id: string; name: string; email: string; earned: string[] } | null = null;
    if (email) {
        const u = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true, achievements: { select: { key: true } } },
        });
        if (u) member = { id: u.id, name: u.name, email: u.email, earned: u.achievements.map((a) => a.key) };
    }

    return NextResponse.json({
        achievements: ACHIEVEMENTS.map((a) => ({ ...a, earnedBy: countByKey.get(a.key) ?? 0 })),
        totalMembers: await prisma.user.count({ where: { role: { in: ['MEMBER_EVERYDAY', 'MEMBER_STARTER', 'MEMBER_THERAPY', 'TRIAL'] } } }),
        member,
    });
}

/** POST — grant or revoke a badge for a member.  { email, key, grant } */
export async function POST(request: Request) {
    const admin = await requireDepartment('CONTENT');
    if (!admin) return forbidden();

    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const key = String(body.key || '');
    const grant = body.grant === true;

    if (!achievementDef(key)) return NextResponse.json({ error: 'Unknown badge.' }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'Member not found.' }, { status: 404 });

    if (grant) {
        await prisma.userAchievement.upsert({
            where: { userId_key: { userId: user.id, key } },
            create: { userId: user.id, key },
            update: {},
        });
    } else {
        await prisma.userAchievement.deleteMany({ where: { userId: user.id, key } });
    }

    await auditAs({ id: admin.id, email: admin.email }, request)({
        action: grant ? 'achievement.grant' : 'achievement.revoke',
        entity: 'UserAchievement', entityId: user.id, after: { key },
    });

    return NextResponse.json({ ok: true, granted: grant });
}
