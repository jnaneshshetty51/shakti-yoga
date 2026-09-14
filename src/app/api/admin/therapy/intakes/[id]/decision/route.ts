import { NextResponse } from 'next/server';
import { requireDepartment } from '@/lib/admin-auth';
import { decideIntake, type Decision } from '@/lib/therapy-intake';
import { readJson, oneOf, optStr, handleValidationError } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const DECISIONS = ['RECOMMENDED', 'RECOMMENDED_WITH_CONDITIONS', 'NOT_RECOMMENDED'] as const;

/** POST /api/admin/therapy/intakes/[id]/decision { decision, notes } — record the therapist's call. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const admin = await requireDepartment('THERAPIST');
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await context.params;
        const body = await readJson(request);
        const decision = oneOf<Decision>(body.decision, DECISIONS, 'decision');
        const notes = optStr(body.notes, { label: 'notes', max: 4000 });

        const intake = await decideIntake(id, admin.id, decision, notes);
        return NextResponse.json({ intake });
    } catch (error) {
        return handleValidationError(error);
    }
}
