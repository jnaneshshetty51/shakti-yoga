import { NextResponse } from 'next/server';
import { requireDepartment } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { TherapyIntakeStatus } from '@prisma/client';
import { beginReview } from '@/lib/therapy-intake';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/therapy/intakes/[id] — full detail. Opening a still-SUBMITTED
 * intake moves it to UNDER_REVIEW, which locks the applicant out of edits.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const admin = await requireDepartment(['THERAPIST']);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await context.params;
    let intake = await prisma.therapyIntake.findUnique({
        where: { id },
        include: {
            user: { select: { id: true, name: true, email: true, phone: true, country: true } },
            reviewedBy: { select: { id: true, name: true } },
        },
    });
    if (!intake) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (intake.status === TherapyIntakeStatus.SUBMITTED) {
        await beginReview(intake.id);
        intake = await prisma.therapyIntake.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true, country: true } },
                reviewedBy: { select: { id: true, name: true } },
            },
        });
    }

    return NextResponse.json({ intake });
}
