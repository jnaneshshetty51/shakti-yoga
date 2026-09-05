import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Contact API error:', error);
        return NextResponse.json({ error: 'Could not send your message. Please try again.' }, { status: 500 });
    }
}
