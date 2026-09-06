import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { availableSlots } from '@/lib/booking';

/**
 * Open 1:1 slots across all teachers for a given IST date (?date=YYYY-MM-DD).
 * If no teacher has posted availability yet, returns a sensible default set so
 * the booking UI still works during soft launch.
 */
const DEFAULT_SLOTS = [
    '08:00 AM - 08:45 AM',
    '10:00 AM - 10:45 AM',
    '04:00 PM - 04:45 PM',
    '06:00 PM - 06:45 PM',
];

export async function GET(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const date = new URL(request.url).searchParams.get('date') ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: 'date=YYYY-MM-DD required' }, { status: 400 });
    }

    const teachers = await prisma.user.findMany({ where: { role: 'TEACHER' }, select: { id: true } });
    const anyRules = await prisma.teacherAvailability.count({ where: { active: true } });

    if (anyRules === 0) {
        // filter defaults to future-only for today
        const now = Date.now();
        const isToday = date === new Date(now + 5.5 * 3_600_000).toISOString().slice(0, 10);
        return NextResponse.json({ slots: isToday ? [] : DEFAULT_SLOTS, source: 'default' });
    }

    const sets = await Promise.all(teachers.map((t) => availableSlots(t.id, date)));
    const merged = [...new Set(sets.flat())].sort();
    return NextResponse.json({ slots: merged, source: 'availability' });
}
