import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { notifyAdmin, emailLayout } from '@/lib/email';
import { LeadStatus, LeadSource } from '@prisma/client';

function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export async function POST(request: Request) {
    const ip = getClientIp(request);
    const { allowed } = await rateLimit(`rishikesh-guide:${ip}`, 5, 60 * 60 * 1000);
    if (!allowed) {
        return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 150) : '';
        const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase().slice(0, 150) : '';
        const country = typeof body?.country === 'string' ? body.country.trim().slice(0, 100) : '';
        const whatsapp = typeof body?.whatsapp === 'string' ? body.whatsapp.trim().slice(0, 50) : '';
        const preferredMonth = typeof body?.preferredMonth === 'string' ? body.preferredMonth : 'Spring (Feb–Apr)';

        if (!name || !email) {
            return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
        }

        const leadNotes = [
            `[Retreat Guide Lead Magnet Download]`,
            `Preferred Retreat Month: ${preferredMonth}`,
            `Country: ${country || 'International'}`,
            `WhatsApp: ${whatsapp || 'Not provided'}`,
        ].join('\n');

        const lead = await prisma.lead.create({
            data: {
                name,
                email,
                phone: whatsapp || null,
                country: country || null,
                source: LeadSource.WEBSITE,
                campaign: 'rishikesh_guide_download',
                status: LeadStatus.NEW,
                programInterest: 'RETREAT',
                notes: leadNotes,
            },
        });

        notifyAdmin(
            `📖 Rishikesh Retreat Guide Downloaded: ${name} (${country || 'International'})`,
            emailLayout(
                `<h2>Retreat Guide Requested</h2>
                <p><strong>Name:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
                <p><strong>Country:</strong> ${escapeHtml(country || 'Not specified')}</p>
                <p><strong>WhatsApp:</strong> ${escapeHtml(whatsapp || 'Not provided')}</p>
                <p><strong>Preferred Month:</strong> ${escapeHtml(preferredMonth)}</p>`,
            ),
            email,
        ).catch(() => {});

        return NextResponse.json({
            success: true,
            leadId: lead.id,
            message: 'Your Rishikesh Retreat & Travel Guide is ready!',
            downloadUrl: '/retreats/rishikesh/guide.pdf',
        });
    } catch (error) {
        console.error('Rishikesh guide download error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
