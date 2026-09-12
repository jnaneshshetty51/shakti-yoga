import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { notifyAdmin, emailLayout } from '@/lib/email';

function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/** POST /api/corporate/enquiry — public corporate wellness intake. */
export async function POST(request: Request) {
    const ip = getClientIp(request);
    const { allowed } = rateLimit(`corporate-enquiry:${ip}`, 5, 60 * 60 * 1000);
    if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });

    const body = await request.json().catch(() => ({}));
    const companyName = typeof body?.companyName === 'string' ? body.companyName.trim().slice(0, 200) : '';
    const contactName = typeof body?.contactName === 'string' ? body.contactName.trim().slice(0, 200) : '';
    const contactEmail = typeof body?.contactEmail === 'string' ? body.contactEmail.trim().slice(0, 200) : '';
    const contactPhone = typeof body?.contactPhone === 'string' ? body.contactPhone.trim().slice(0, 40) : null;
    const employeeCount = body?.employeeCount ? Number(body.employeeCount) : null;
    const requirement = typeof body?.requirement === 'string' ? body.requirement.trim().slice(0, 2000) : null;
    const programInterest = typeof body?.programInterest === 'string' ? body.programInterest.trim().slice(0, 200) : null;
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 2000) : null;

    if (!companyName || !contactName || !contactEmail) {
        return NextResponse.json({ error: 'Company name, contact name and email are required' }, { status: 400 });
    }

    await prisma.corporateLead.create({
        data: {
            companyName, contactName, contactEmail, contactPhone,
            employeeCount: Number.isFinite(employeeCount) ? employeeCount : null,
            requirement, programInterest,
            message,
        },
    });

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
}
