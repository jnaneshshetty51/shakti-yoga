import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { submitIntake } from '@/lib/therapy-intake';

export const dynamic = 'force-dynamic';

/** POST /api/therapy/intake/submit — finalize the caller's assessment for therapist review. */
export async function POST() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await submitIntake(session.id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ intake: result.intake });
}
