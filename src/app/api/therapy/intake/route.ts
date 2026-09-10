import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getIntake, saveIntakeDraft, applicantFacingStatus, type IntakeDraftFields } from '@/lib/therapy-intake';
import { readJson, handleValidationError, ValidationError } from '@/lib/validation';

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

function num(value: unknown, label: string): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const n = Number(value);
    if (!Number.isFinite(n)) throw new ValidationError(`${label} must be a number.`);
    return n;
}

function txt(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') throw new ValidationError('Expected a string field.');
    return value.trim() || undefined;
}

/** POST /api/therapy/intake — save (create or update) the caller's draft, one field or all. */
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await readJson(request);
        const fields: IntakeDraftFields = {
            fullName: txt(body.fullName),
            age: num(body.age, 'Age'),
            gender: txt(body.gender),
            heightCm: num(body.heightCm, 'Height'),
            weightKg: num(body.weightKg, 'Weight'),
            primaryConcern: txt(body.primaryConcern),
            concernDuration: txt(body.concernDuration),
            concernDescription: txt(body.concernDescription),
            injuriesSurgeries: txt(body.injuriesSurgeries),
            medicalConditions: txt(body.medicalConditions),
            medications: txt(body.medications),
            familyHistory: txt(body.familyHistory),
            priorYogaTherapy: txt(body.priorYogaTherapy),
            emergencyContactName: txt(body.emergencyContactName),
            emergencyContactPhone: txt(body.emergencyContactPhone),
        };
        if (typeof body.consentGiven === 'boolean') fields.consentGiven = body.consentGiven;

        // Drop undefined keys so a partial save doesn't clobber previously-saved fields.
        (Object.keys(fields) as (keyof IntakeDraftFields)[]).forEach((k) => {
            if (fields[k] === undefined) delete fields[k];
        });

        const result = await saveIntakeDraft(session.id, fields);
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
        return NextResponse.json({ intake: serialize(result.intake) });
    } catch (error) {
        return handleValidationError(error);
    }
}
