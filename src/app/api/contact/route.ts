import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyAdmin, emailLayout } from '@/lib/email';

function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function isEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const name = String(body.name || '').trim();
        const email = String(body.email || '').trim();
        const subject = String(body.subject || '').trim();
        const message = String(body.message || '').trim();

        if (!name || !email || !message) {
            return NextResponse.json({ error: 'Name, email and message are required.' }, { status: 400 });
        }
        if (!isEmail(email)) {
            return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
        }
        if (message.length > 5000) {
            return NextResponse.json({ error: 'Message is too long.' }, { status: 400 });
        }

        await prisma.contactMessage.create({
            data: { name, email, subject: subject || null, message },
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
        console.error('Contact API error:', error);
        return NextResponse.json({ error: 'Could not send your message. Please try again.' }, { status: 500 });
    }
}
