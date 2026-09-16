import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { auditAs } from '@/lib/audit';
import { Role } from '@prisma/client';

const RATE_KEYS = { class: 'teacher_rate_class', session: 'teacher_rate_session' } as const;
const RATE_DEFAULTS = { class: 500, session: 800 };

function monthBounds(monthKey?: string | null): { start: Date; end: Date } {
    const now = new Date();
    if (monthKey && /^\d{4}-\d{2}$/.test(monthKey)) {
        const [y, m] = monthKey.split('-').map(Number);
        return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
    }
    return { start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) };
}

/**
 * GET ?month=YYYY-MM (default: current month) — every teacher's computed
 * earnings for that period (fresh, from ClassInstance/Booking counts — never
 * trust a client-submitted number) plus whether a TeacherPayout already
 * exists for it, so the admin can see who's pending vs already paid.
 */
export async function GET(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const { start, end } = monthBounds(searchParams.get('month'));

    try {
        const [teachers, rateRows, existingPayouts] = await Promise.all([
            prisma.user.findMany({
                where: { role: Role.TEACHER },
                select: { id: true, name: true, email: true, staffProfile: { select: { classRate: true, sessionRate: true } } },
                orderBy: { name: 'asc' },
            }),
            prisma.setting.findMany({ where: { key: { in: [RATE_KEYS.class, RATE_KEYS.session] } } }),
            prisma.teacherPayout.findMany({
                where: { periodStart: start, periodEnd: end },
                select: { teacherId: true, id: true, amount: true, status: true, paidAt: true },
            }),
        ]);

        const studioRate = (which: keyof typeof RATE_DEFAULTS) => {
            const row = rateRows.find((r) => r.key === RATE_KEYS[which]);
            const n = row ? Number(row.value) : NaN;
            return Number.isFinite(n) && n >= 0 ? n : RATE_DEFAULTS[which];
        };
        const studio = { class: studioRate('class'), session: studioRate('session') };
        const payoutByTeacher = new Map(existingPayouts.map((p) => [p.teacherId, p]));

        const rows = await Promise.all(
            teachers.map(async (t) => {
                const classRate = typeof t.staffProfile?.classRate === 'number' && t.staffProfile.classRate >= 0 ? t.staffProfile.classRate : studio.class;
                const sessionRate = typeof t.staffProfile?.sessionRate === 'number' && t.staffProfile.sessionRate >= 0 ? t.staffProfile.sessionRate : studio.session;
                const [classes, sessions] = await Promise.all([
                    // Own batches, minus any occurrence a substitute covered
                    // (that credit belongs to whoever actually taught it),
                    // plus any occurrence of someone else's batch they covered.
                    prisma.classInstance.count({
                        where: {
                            OR: [{ teacherId: t.id }, { teacherId: null, batch: { teacherId: t.id } }],
                            status: 'Completed', date: { gte: start, lt: end },
                        },
                    }),
                    prisma.booking.count({ where: { teacherId: t.id, status: 'COMPLETED', date: { gte: start, lt: end } } }),
                ]);
                const amount = classes * classRate + sessions * sessionRate;
                const existing = payoutByTeacher.get(t.id);
                return {
                    teacherId: t.id, name: t.name, email: t.email,
                    classes, sessions, classRate, sessionRate, amount,
                    payoutId: existing?.id ?? null,
                    status: existing?.status ?? (amount > 0 ? 'PENDING' : null),
                    paidAt: existing?.paidAt?.toISOString() ?? null,
                };
            }),
        );

        return NextResponse.json({
            month: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`,
            periodStart: start.toISOString(),
            periodEnd: end.toISOString(),
            studioRates: studio,
            rows,
        }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Admin staff payouts GET error:', error);
        return NextResponse.json({ error: 'Failed to load payouts' }, { status: 500 });
    }
}

/** POST — record a payout for one teacher/period, snapshotting the rates and computed figures so a later rate change never rewrites it. */
export async function POST(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const body = await request.json();
        const teacherId = String(body.teacherId || '');
        const { start, end } = monthBounds(body.month);
        const notes = typeof body.notes === 'string' ? body.notes.slice(0, 1000) : null;

        const teacher = await prisma.user.findUnique({
            where: { id: teacherId },
            select: { id: true, role: true, staffProfile: { select: { classRate: true, sessionRate: true } } },
        });
        if (!teacher || teacher.role !== Role.TEACHER) {
            return NextResponse.json({ error: 'Unknown teacher' }, { status: 404 });
        }

        const rateRows = await prisma.setting.findMany({ where: { key: { in: [RATE_KEYS.class, RATE_KEYS.session] } } });
        const studioRate = (which: keyof typeof RATE_DEFAULTS) => {
            const row = rateRows.find((r) => r.key === RATE_KEYS[which]);
            const n = row ? Number(row.value) : NaN;
            return Number.isFinite(n) && n >= 0 ? n : RATE_DEFAULTS[which];
        };
        const classRate = typeof teacher.staffProfile?.classRate === 'number' && teacher.staffProfile.classRate >= 0 ? teacher.staffProfile.classRate : studioRate('class');
        const sessionRate = typeof teacher.staffProfile?.sessionRate === 'number' && teacher.staffProfile.sessionRate >= 0 ? teacher.staffProfile.sessionRate : studioRate('session');

        const [classes, sessions] = await Promise.all([
            prisma.classInstance.count({
                where: {
                    OR: [{ teacherId }, { teacherId: null, batch: { teacherId } }],
                    status: 'Completed', date: { gte: start, lt: end },
                },
            }),
            prisma.booking.count({ where: { teacherId, status: 'COMPLETED', date: { gte: start, lt: end } } }),
        ]);
        const amount = classes * classRate + sessions * sessionRate;

        const payout = await prisma.teacherPayout.create({
            data: {
                teacherId, periodStart: start, periodEnd: end,
                classes, sessions, classRate, sessionRate, amount,
                status: 'PAID', paidAt: new Date(), paidById: admin.id, notes,
            },
        }).catch((e) => {
            if (e?.code === 'P2002') return null; // unique (teacherId, periodStart, periodEnd) — already recorded
            throw e;
        });
        if (!payout) {
            return NextResponse.json({ error: 'A payout for this teacher and period is already recorded.' }, { status: 409 });
        }

        await auditAs({ id: admin.id, email: admin.email }, request)({
            action: 'teacher.payout.recorded', entity: 'TeacherPayout', entityId: payout.id,
            after: { teacherId, periodStart: start.toISOString(), periodEnd: end.toISOString(), amount, classes, sessions },
        });

        return NextResponse.json({ payout });
    } catch (error) {
        console.error('Admin staff payouts POST error:', error);
        return NextResponse.json({ error: 'Failed to record payout' }, { status: 500 });
    }
}
