import { prisma } from '@/lib/prisma';
import { LeadStatus, type PlanType } from '@prisma/client';
import { recordAudit } from '@/lib/audit';

/**
 * Called once, at account registration. Links any CRM lead for this email to
 * the account it became — but does NOT mark it CONVERTED. Signing up is not
 * a conversion; it's the account existing. A lead is only `CONVERTED` once it
 * clears markLeadConverted() below, on an actual qualifying payment. Advances
 * NEW/CONTACTED leads to TRIAL (they've now started using the product) but
 * never downgrades a lead already at TRIAL/CONVERTED/LOST.
 */
export async function linkLeadToUser(userId: string, email: string): Promise<void> {
    try {
        const leads = await prisma.lead.findMany({
            where: { email: { equals: email, mode: 'insensitive' }, linkedUserId: null },
            select: { id: true, status: true },
        });
        if (leads.length === 0) return;

        for (const lead of leads) {
            const nextStatus = lead.status === LeadStatus.NEW || lead.status === LeadStatus.CONTACTED
                ? LeadStatus.TRIAL
                : lead.status;

            await prisma.$transaction([
                prisma.lead.update({
                    where: { id: lead.id },
                    data: { linkedUserId: userId, status: nextStatus },
                }),
                prisma.leadActivity.create({
                    data: {
                        leadId: lead.id,
                        type: 'STATUS_CHANGE',
                        content: nextStatus === lead.status
                            ? 'Signed up for an account'
                            : `Signed up for an account — ${lead.status} → ${nextStatus}`,
                        performedBy: 'system',
                    },
                }),
            ]);

            await recordAudit({
                action: 'lead.linked',
                entity: 'Lead',
                entityId: lead.id,
                before: { status: lead.status, linkedUserId: null },
                after: { status: nextStatus, linkedUserId: userId },
            });
        }
    } catch (error) {
        console.error('[leads] linkLeadToUser failed', error);
    }
}

/**
 * Call on a user's first qualifying paid subscription (never for a trial) —
 * the same event and condition that triggers markReferralConverted in
 * lib/referral.ts. Finds the lead already linked to this user (from signup);
 * falls back to matching by email for a lead created *after* the person
 * already had an account, so a late-created lead still gets credited.
 * Never overwrites an existing convertedAt (idempotent against webhook redelivery).
 */
export async function markLeadConverted(userId: string, planType?: PlanType): Promise<void> {
    try {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
        if (!user) return;

        const lead = await prisma.lead.findFirst({
            where: {
                convertedAt: null,
                OR: [
                    { linkedUserId: userId },
                    { email: { equals: user.email, mode: 'insensitive' } },
                ],
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!lead) return;

        // Claim atomically — confirmAndActivate() can legitimately run twice
        // for the same payment (the client's /api/checkout/verify call and the
        // Razorpay webhook both call it, by design, so whichever arrives second
        // reconciles a payment the other missed). Without this, a near-
        // simultaneous double-call would both pass the findFirst above and each
        // write a duplicate LeadActivity/AuditLog entry.
        const claim = await prisma.lead.updateMany({
            where: { id: lead.id, convertedAt: null },
            data: {
                status: LeadStatus.CONVERTED,
                convertedToUserId: userId,
                convertedAt: new Date(),
                linkedUserId: lead.linkedUserId ?? userId,
            },
        });
        if (claim.count === 0) return;

        await prisma.leadActivity.create({
            data: {
                leadId: lead.id,
                type: 'STATUS_CHANGE',
                content: `${lead.status} → CONVERTED — first paid membership${planType ? ` (${planType})` : ''}`,
                performedBy: 'system',
            },
        });

        await recordAudit({
            action: 'lead.converted',
            entity: 'Lead',
            entityId: lead.id,
            before: { status: lead.status, convertedAt: null },
            after: { status: 'CONVERTED', convertedToUserId: userId, planType: planType ?? null },
        });
    } catch (error) {
        console.error('[leads] markLeadConverted failed', error);
    }
}
