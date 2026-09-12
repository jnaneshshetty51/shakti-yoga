import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { notifyAdmin, emailLayout } from '@/lib/email';

function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/** POST /api/retreats/[id]/enquire — public enquiry for a published retreat/workshop/event. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const ip = getClientIp(request);
    const { allowed } = rateLimit(`retreat-enquiry:${ip}`, 5, 60 * 60 * 1000);
    if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });

    const retreat = await prisma.retreat.findUnique({ where: { id } });
    if (!retreat || retreat.status !== 'PUBLISHED') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 200) : '';
    const email = typeof body?.email === 'string' ? body.email.trim().slice(0, 200) : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim().slice(0, 40) : null;
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 2000) : null;
    const participantsCount = Math.max(1, Math.min(20, Number(body?.participantsCount) || 1));

    if (!name || !email) return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });

    const enquiry = await prisma.retreatEnquiry.create({
        data: { retreatId: id, name, email, phone, message, participantsCount },
    });

    notifyAdmin(
        `New retreat enquiry: ${retreat.name} — ${name}`,
        emailLayout(
            `<p><strong>${escapeHtml(name)}</strong> (${escapeHtml(email)}${phone ? `, ${escapeHtml(phone)}` : ''}) — ${participantsCount} participant${participantsCount === 1 ? '' : 's'}</p>
             <p>Retreat: ${escapeHtml(retreat.name)}</p>
             ${message ? `<p style="white-space:pre-wrap;background:#f6f5f2;padding:12px;border-radius:6px">${escapeHtml(message)}</p>` : ''}`,
        ),
        email,
    ).catch(() => { });

    return NextResponse.json({ enquiry: { id: enquiry.id } });
}
