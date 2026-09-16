import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { removeFamilyMember } from '@/lib/family';

export const dynamic = 'force-dynamic';

/** POST /api/family/remove { memberId } — remove a member from owner's family plan. */
export async function POST(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json().catch(() => ({}));
        const memberId = String(body.memberId ?? '').trim();
        if (!memberId) {
            return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
        }

        const result = await removeFamilyMember(session.id, memberId);
        if (!result.ok) {
            return NextResponse.json({ error: result.error || 'Failed to remove member' }, { status: 400 });
        }
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Family remove member error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
