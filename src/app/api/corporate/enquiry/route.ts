import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { readJson, str, optStr, email as emailField, ValidationError, handleValidationError } from '@/lib/validation';

/** POST /api/corporate/enquiry — public corporate wellness intake. */
export async function POST(request: Request) {
    const ip = getClientIp(request);
    const { allowed } = rateLimit(`corporate-enquiry:${ip}`, 5, 60 * 60 * 1000);
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

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof ValidationError) return handleValidationError(error);
        console.error('Corporate enquiry error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
