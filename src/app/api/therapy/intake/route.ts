import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getIntake, saveIntakeDraft, applicantFacingStatus, parseIntakeFields } from '@/lib/therapy-intake';
import { readJson, handleValidationError } from '@/lib/validation';

export const dynamic = 'force-dynamic';

function serialize(intake: NonNullable<Awaited<ReturnType<typeof getIntake>>>) {
    return { ...intake, status: applicantFacingStatus(intake.status) };
}

/** GET /api/therapy/intake — the caller's assessment (or null if not started). */
export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const intake = await getIntake(session.id);
    return NextResponse.json({ intake: intake ? serialize(intake) : null }, { headers: { 'Cache-Control': 'no-store' } });
}

/** POST /api/therapy/intake — save (create or update) the caller's draft, one field or all. */
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await readJson(request);
        const fields = parseIntakeFields(body);
        const result = await saveIntakeDraft(session.id, fields);
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
        return NextResponse.json({ intake: serialize(result.intake) });
    } catch (error) {
        return handleValidationError(error);
    }
}
