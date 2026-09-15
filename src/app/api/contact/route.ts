import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyAdmin, emailLayout } from '@/lib/email';
import { readJson, str, optStr, email as emailField, ValidationError, handleValidationError } from '@/lib/validation';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { getCampaignFromRequest } from '@/lib/attribution';
import { LeadStatus } from '@prisma/client';

function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/**
 * Subjects that mean "this person is a sales prospect", mapped to the program
 * they're asking about. Everything else (General Inquiry, Billing Issue) is a
 * support matter, not a CRM lead.
 */
const SALES_SUBJECT_PROGRAM: Record<string, string> = {
    'Free Trial Class': 'EVERYDAY_YOGA',
    'Yoga Therapy Consultation': 'YOGA_THERAPY',
};

/**
 * A sales-relevant enquiry also becomes a real CRM Lead — not just a
 * ContactMessage nobody outside the inbox ever sees — so Yoga Therapy
 * enquiries in particular actually enter the pipeline the therapist team
 * works from, with source/campaign/program attribution attached.
 * Never blocks the contact-form response on failure.
 */
async function captureAsLead(params: { name: string; email: string; subject: string; message: string; campaign: string | null }) {
    const programInterest = SALES_SUBJECT_PROGRAM[params.subject];
    if (!programInterest) return;

    try {
        const existing = await prisma.lead.findFirst({
            where: {
                email: { equals: params.email, mode: 'insensitive' },
                status: { notIn: [LeadStatus.CONVERTED, LeadStatus.LOST] },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (existing) {
            await prisma.leadActivity.create({
                data: {
                    leadId: existing.id,
                    type: 'NOTE',
                    content: `Submitted another website enquiry (${params.subject}): ${params.message.slice(0, 500)}`,
                    performedBy: 'system',
                },
            });
            return;
        }

        const lead = await prisma.lead.create({
            data: {
                name: params.name,
                email: params.email,
                source: 'WEBSITE',
                status: LeadStatus.NEW,
                programInterest,
                campaign: params.campaign,
                notes: params.message.slice(0, 2000),
            },
        });
        await prisma.leadActivity.create({
            data: { leadId: lead.id, type: 'NOTE', content: `Website enquiry (${params.subject}): ${params.message.slice(0, 500)}`, performedBy: 'system' },
        });
    } catch (error) {
        console.error('[contact] captureAsLead failed', error);
    }
}

export async function POST(request: Request) {
    try {
        const { allowed, retryAfterSeconds } = await rateLimit(`contact:${getClientIp(request)}`, 5, 60 * 60 * 1000);
        if (!allowed) {
            return NextResponse.json(
                { error: 'Too many messages. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
            );
        }

        const body = await readJson(request);
        const name = str(body.name, { label: 'name', min: 1, max: 120 });
        const email = emailField(body.email);
        const subject = optStr(body.subject, { label: 'subject', max: 150 });
        const message = str(body.message, { label: 'message', min: 1, max: 5000 });

        await prisma.contactMessage.create({
            data: { name, email, subject: subject ?? null, message },
        });

        if (subject) {
            void captureAsLead({ name, email, subject, message, campaign: getCampaignFromRequest(request) });
        }

        // Fire-and-forget admin notification.
        notifyAdmin(
            `New enquiry: ${subject || 'General'} — ${name}`,
            emailLayout(
                `<p><strong>${escapeHtml(name)}</strong> (${escapeHtml(email)}) sent a message:</p>
                 <p style="white-space:pre-wrap;background:#f6f5f2;padding:12px;border-radius:6px">${escapeHtml(message)}</p>`,
            ),
            email,
        ).catch(() => { });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof ValidationError) return handleValidationError(error);
        console.error('Contact API error:', error);
        return NextResponse.json({ error: 'Could not send your message. Please try again.' }, { status: 500 });
    }
}
