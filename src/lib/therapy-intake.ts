import { prisma } from '@/lib/prisma';
import { TherapyIntakeStatus, type TherapyIntake } from '@prisma/client';

/** Fields the applicant can fill in, one sitting, saved as they go. */
export interface IntakeDraftFields {
    fullName?: string;
    age?: number;
    gender?: string;
    heightCm?: number;
    weightKg?: number;
    primaryConcern?: string;
    concernDuration?: string;
    concernDescription?: string;
    injuriesSurgeries?: string;
    medicalConditions?: string;
    medications?: string;
    familyHistory?: string;
    priorYogaTherapy?: string;
    consentGiven?: boolean;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
}

// Once a therapist has opened it for review, the applicant can no longer edit.
const EDITABLE_STATUSES: TherapyIntakeStatus[] = [TherapyIntakeStatus.DRAFT, TherapyIntakeStatus.SUBMITTED];

export function isEditable(status: TherapyIntakeStatus): boolean {
    return EDITABLE_STATUSES.includes(status);
}

export async function getIntake(userId: string): Promise<TherapyIntake | null> {
    return prisma.therapyIntake.findUnique({ where: { userId } });
}

export type SaveResult =
    | { ok: true; intake: TherapyIntake }
    | { ok: false; error: string; status: number };

/** Create-or-update the caller's draft. Refuses once a therapist has started reviewing it. */
export async function saveIntakeDraft(userId: string, fields: IntakeDraftFields): Promise<SaveResult> {
    const existing = await prisma.therapyIntake.findUnique({ where: { userId } });
    if (existing && !isEditable(existing.status)) {
        return { ok: false, error: 'Your assessment is already under review and can no longer be edited.', status: 409 };
    }
    const intake = await prisma.therapyIntake.upsert({
        where: { userId },
        create: { userId, ...fields },
        update: fields,
    });
    return { ok: true, intake };
}

const REQUIRED_FOR_SUBMIT: (keyof IntakeDraftFields)[] = [
    'fullName', 'age', 'gender', 'primaryConcern', 'concernDescription', 'emergencyContactName', 'emergencyContactPhone',
];

export async function submitIntake(userId: string): Promise<SaveResult> {
    const existing = await prisma.therapyIntake.findUnique({ where: { userId } });
    if (!existing) return { ok: false, error: 'Start your assessment before submitting.', status: 404 };
    if (!isEditable(existing.status)) {
        return { ok: false, error: 'Your assessment is already under review.', status: 409 };
    }
    const missing = REQUIRED_FOR_SUBMIT.filter((k) => existing[k] === null || existing[k] === undefined || existing[k] === '');
    if (missing.length > 0) {
        return { ok: false, error: `Please complete: ${missing.join(', ')}.`, status: 400 };
    }
    if (!existing.consentGiven) {
        return { ok: false, error: 'Please give consent to continue.', status: 400 };
    }
    const intake = await prisma.therapyIntake.update({
        where: { userId },
        data: { status: TherapyIntakeStatus.SUBMITTED, submittedAt: new Date() },
    });
    return { ok: true, intake };
}

export type Decision = 'RECOMMENDED' | 'RECOMMENDED_WITH_CONDITIONS' | 'NOT_RECOMMENDED';

/** Admin marks an intake as opened for review — locks it from further applicant edits. */
export async function beginReview(intakeId: string): Promise<TherapyIntake> {
    return prisma.therapyIntake.update({
        where: { id: intakeId },
        data: { status: TherapyIntakeStatus.UNDER_REVIEW },
    });
}

export async function decideIntake(
    intakeId: string,
    adminId: string,
    decision: Decision,
    notes: string | undefined,
): Promise<TherapyIntake> {
    return prisma.therapyIntake.update({
        where: { id: intakeId },
        data: {
            status: decision,
            reviewedAt: new Date(),
            reviewedById: adminId,
            reviewNotes: notes ?? null,
        },
    });
}

/**
 * What the applicant is shown — collapses NOT_RECOMMENDED into the same neutral
 * "still reviewing" message as UNDER_REVIEW. Per plan: a non-recommendation is
 * communicated by the team directly, never surfaced as a status in the product.
 */
export function applicantFacingStatus(status: TherapyIntakeStatus): TherapyIntakeStatus {
    return status === TherapyIntakeStatus.NOT_RECOMMENDED ? TherapyIntakeStatus.UNDER_REVIEW : status;
}
