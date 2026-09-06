import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyAdmin, emailLayout } from '@/lib/email';
import { readJson, str, optStr, email as emailField, ValidationError, handleValidationError } from '@/lib/validation';

function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export async function POST(request: Request) {
    try {
        const body = await readJson(request);
        const name = str(body.name, { label: 'name', min: 1, max: 120 });
        const email = emailField(body.email);
        const subject = optStr(body.subject, { label: 'subject', max: 150 });
        const message = str(body.message, { label: 'message', min: 1, max: 5000 });

        await prisma.contactMessage.create({
            data: { name, email, subject: subject ?? null, message },
        });

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
