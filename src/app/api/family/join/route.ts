import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { joinFamily } from '@/lib/family';

export const dynamic = 'force-dynamic';

/** POST /api/family/join { code } — redeem a family seat. */
export async function POST(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { allowed } = rateLimit(`family-join:${session.id}`, 8, 60 * 60 * 1000);
    if (!allowed) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });

    try {
        const body = await request.json().catch(() => ({}));
        const result = await joinFamily(session.id, String(body.code ?? ''));
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
        return NextResponse.json({ ok: true, role: result.role });
    } catch (error) {
        console.error('Family join error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
