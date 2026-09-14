import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { readJson, str, optStr, email as emailField, ValidationError, handleValidationError } from '@/lib/validation';
import { notifyAdmin, emailLayout } from '@/lib/email';

function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/** POST /api/corporate/enquiry — public corporate wellness intake. */
export async function POST(request: Request) {
    const ip = getClientIp(request);
    const { allowed } = await rateLimit(`corporate-enquiry:${ip}`, 5, 60 * 60 * 1000);
    if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });

    try {
        const body = await readJson(request);
        const companyName = str(body.companyName, { label: 'Company name', min: 1, max: 200 });
        const contactName = str(body.contactName, { label: 'Contact name', min: 1, max: 200 });
        const contactEmail = emailField(body.contactEmail, 'Contact email');
        const contactPhone = optStr(body.contactPhone, { label: 'Contact phone', max: 40 }) ?? null;
        const employeeCount = body.employeeCount ? Number(body.employeeCount) : null;
        const requirement = optStr(body.requirement, { label: 'Requirement', max: 2000 }) ?? null;
        const programInterest = optStr(body.programInterest, { label: 'Program interest', max: 200 }) ?? null;
        const message = optStr(body.message, { label: 'Message', max: 2000 }) ?? null;

        await prisma.corporateLead.create({
            data: {
                companyName, contactName, contactEmail, contactPhone,
                employeeCount: Number.isFinite(employeeCount) ? employeeCount : null,
                requirement, programInterest,
                message,
            },
        });

        // Fire-and-forget admin notification — previously this enquiry sat
        // silently as a DB row with nobody alerted to follow up.
        notifyAdmin(
            `New corporate enquiry: ${companyName}`,
            emailLayout(
                `<p><strong>${escapeHtml(companyName)}</strong> — ${escapeHtml(contactName)} (${escapeHtml(contactEmail)}${contactPhone ? `, ${escapeHtml(contactPhone)}` : ''})</p>
                 ${employeeCount ? `<p>Employees: ${employeeCount}</p>` : ''}
                 ${programInterest ? `<p>Interested in: ${escapeHtml(programInterest)}</p>` : ''}
                 ${requirement ? `<p>Requirement: ${escapeHtml(requirement)}</p>` : ''}
                 ${message ? `<p style="white-space:pre-wrap;background:#f6f5f2;padding:12px;border-radius:6px">${escapeHtml(message)}</p>` : ''}`,
            ),
            contactEmail,
        ).catch(() => { });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof ValidationError) return handleValidationError(error);
        console.error('Corporate enquiry error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
