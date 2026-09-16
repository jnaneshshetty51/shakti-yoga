import { NextResponse } from 'next/server';
import { requireDepartment } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { saveIntakeDraft, submitIntake, parseIntakeFields } from '@/lib/therapy-intake';
import { auditAs } from '@/lib/audit';
import { readJson, email as parseEmail, handleValidationError, ValidationError } from '@/lib/validation';
import { TherapyIntakeStatus, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/** GET /api/admin/therapy/intakes?status=&q=&page=&pageSize= — list assessments, newest submission first. */
export async function GET(request: Request) {
    const admin = await requireDepartment(['THERAPIST']);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const q = searchParams.get('q')?.trim();
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE));

    const where: Prisma.TherapyIntakeWhereInput = {
        ...(status && status !== 'all' ? { status: status.toUpperCase() as TherapyIntakeStatus } : {}),
        ...(q ? { OR: [
            { primaryConcern: { contains: q, mode: 'insensitive' } },
            { user: { name: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
        ] } : {}),
    };

    const [intakes, totalCount] = await Promise.all([
        prisma.therapyIntake.findMany({
            where,
            include: { user: { select: { id: true, name: true, email: true, phone: true, country: true } } },
            orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.therapyIntake.count({ where }),
    ]);

    return NextResponse.json({ intakes, page, pageSize, totalCount });
}

/**
 * POST /api/admin/therapy/intakes — record a case history on a member's
 * behalf: a THERAPIST-department admin taking it in person (walk-in or
 * phone) instead of the member self-submitting via the public wizard.
 * Reuses the same save/submit rules as the applicant's own flow, keyed to
 * the member's userId instead of the caller's own session.
 */
export async function POST(request: Request) {
    const admin = await requireDepartment(['THERAPIST']);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const body = await readJson(request);
        const memberEmail = parseEmail(body.email, 'Member email');
        const submit = body.submit === true;

        const user = await prisma.user.findUnique({ where: { email: memberEmail }, select: { id: true } });
        if (!user) return NextResponse.json({ error: 'No member with this email.' }, { status: 404 });

        const fields = parseIntakeFields(body);
        const saved = await saveIntakeDraft(user.id, fields);
        if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: saved.status });

        let intake = saved.intake;
        if (submit) {
            const result = await submitIntake(user.id);
            if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
            intake = result.intake;
        }

        await auditAs(admin, request)({
            action: 'therapy.intake.record',
            entity: 'TherapyIntake',
            entityId: intake.id,
            after: { userId: user.id, email: memberEmail, submitted: submit },
        });

        return NextResponse.json({ intake });
    } catch (error) {
        if (error instanceof ValidationError) return handleValidationError(error);
        console.error('Admin therapy intake POST error:', error);
        return NextResponse.json({ error: 'Could not save the assessment.' }, { status: 500 });
    }
}
