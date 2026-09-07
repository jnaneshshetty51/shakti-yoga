import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { familyView } from '@/lib/family';

export const dynamic = 'force-dynamic';

/** GET /api/family — the caller's family-plan status, seats and invite code. */
export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const view = await familyView(session.id);
    return NextResponse.json(view, { headers: { 'Cache-Control': 'no-store' } });
}
