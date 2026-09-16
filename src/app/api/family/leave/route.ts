import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { leaveFamily } from '@/lib/family';

export const dynamic = 'force-dynamic';

/** POST /api/family/leave — leave current family plan. */
export async function POST() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const result = await leaveFamily(session.id);
        if (!result.ok) {
            return NextResponse.json({ error: result.error || 'Failed to leave family plan' }, { status: 400 });
        }
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Family leave error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
