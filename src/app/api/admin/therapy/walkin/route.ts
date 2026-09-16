import { NextResponse } from 'next/server';
import { requireDepartment } from '@/lib/admin-auth';
import { getPlan, isPlanKey } from '@/lib/pricing';
import { registerWalkInMember, WalkInConflictError, PAYMENT_METHODS } from '@/lib/walkin';
import { readJson, str, optStr, email as parseEmail, oneOf, ValidationError, handleValidationError } from '@/lib/validation';

const THERAPY_PLAN_KEYS = ['therapy', 'therapy_annual'];

/**
 * POST /api/admin/therapy/walkin — a THERAPIST-department admin registering a
 * walk-in Yoga Therapy client themselves, without needing the (admin-only)
 * Students hub. Scoped to therapy plans only; full member management for any
 * plan stays behind /api/admin/members.
 */
export async function POST(request: Request) {
    const admin = await requireDepartment(['THERAPIST']);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const body = await readJson(request);
        const name = str(body.name, { label: 'Name', min: 1, max: 120 });
        const email = parseEmail(body.email, 'Email');
        const phone = optStr(body.phone, { label: 'Phone', max: 40 });

        const planKeyRaw = str(body.planKey, { label: 'Plan' });
        if (!isPlanKey(planKeyRaw) || !THERAPY_PLAN_KEYS.includes(planKeyRaw)) {
            throw new ValidationError('Plan must be Yoga Therapy or Yoga Therapy Annual.');
        }
        const plan = getPlan(planKeyRaw);

        const amount = Number(body.amount);
        if (!Number.isFinite(amount) || amount <= 0) throw new ValidationError('Enter a valid amount.');
        const currency = String(body.currency || 'INR').toUpperCase().slice(0, 3);
        const method = oneOf(body.method, PAYMENT_METHODS, 'Payment method');
        const note = optStr(body.note, { label: 'Note', max: 200 });

        const result = await registerWalkInMember({ actor: admin, request, name, email, phone, plan, amount, currency, method, note });
        return NextResponse.json({ id: result.userId, tempPassword: result.tempPassword });
    } catch (error) {
        if (error instanceof ValidationError) return handleValidationError(error);
        if (error instanceof WalkInConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
        console.error('Admin therapy walk-in POST error:', error);
        return NextResponse.json({ error: 'Could not register the client.' }, { status: 500 });
    }
}
