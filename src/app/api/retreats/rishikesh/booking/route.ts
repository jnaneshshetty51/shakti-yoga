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
    const { allowed } = await rateLimit(`rishikesh-booking:${ip}`, 5, 60 * 60 * 1000);
    if (!allowed) {
        return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 150) : '';
        const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase().slice(0, 150) : '';
        const phone = typeof body?.phone === 'string' ? body.phone.trim().slice(0, 50) : '';
        const country = typeof body?.country === 'string' ? body.country.trim().slice(0, 100) : '';
        const roomType = typeof body?.roomType === 'string' ? body.roomType : 'Private Room';
        const cohortDate = typeof body?.cohortDate === 'string' ? body.cohortDate : 'Upcoming Spring Cohort';
        const guestCount = Math.max(1, Math.min(10, Number(body?.guestCount) || 1));
        const yogaExperience = typeof body?.yogaExperience === 'string' ? body.yogaExperience.slice(0, 200) : 'Not specified';
        const dietary = typeof body?.dietary === 'string' ? body.dietary.slice(0, 500) : 'None';
        const medicalNotes = typeof body?.medicalNotes === 'string' ? body.medicalNotes.slice(0, 1000) : '';
        const arrivalDetails = typeof body?.arrivalDetails === 'string' ? body.arrivalDetails.slice(0, 500) : '';
        const paymentPreference = typeof body?.paymentPreference === 'string' ? body.paymentPreference : 'Credit Card (Stripe/International)';

        if (!name || !email) {
            return NextResponse.json({ error: 'Full name and email are required.' }, { status: 400 });
        }

        // 1. Create or link CRM Lead
        const leadNotes = [
            `[7-Day Rishikesh Retreat Reservation]`,
            `Cohort: ${cohortDate}`,
            `Room: ${roomType} (${guestCount} guest${guestCount > 1 ? 's' : ''})`,
            `Country: ${country || 'International / Unspecified'}`,
            `Phone/WhatsApp: ${phone || 'Not provided'}`,
            `Yoga Experience: ${yogaExperience}`,
            `Dietary Requirements: ${dietary}`,
            medicalNotes ? `Health/Mobility: ${medicalNotes}` : null,
            arrivalDetails ? `Arrival/Travel: ${arrivalDetails}` : null,
            `Payment Preference: ${paymentPreference}`,
        ].filter(Boolean).join('\n');

        const lead = await prisma.lead.create({
            data: {
                name,
                email,
                phone: phone || null,
                country: country || null,
                source: LeadSource.WEBSITE,
                campaign: 'rishikesh_yoga_retreat',
                status: LeadStatus.NEW,
                programInterest: 'RETREAT',
                notes: leadNotes,
            },
        });

        await prisma.leadActivity.create({
            data: {
                leadId: lead.id,
                type: 'NOTE',
                content: `Submitted 7-Day Rishikesh Retreat Reservation for ${cohortDate} (${roomType})`,
                performedBy: 'system',
            },
        });

        // 2. Link to RetreatEnquiry if Rishikesh retreat exists in DB
        const rishikeshRetreat = await prisma.retreat.findFirst({
            where: {
                OR: [
                    { name: { contains: 'Rishikesh', mode: 'insensitive' } },
                    { location: { contains: 'Rishikesh', mode: 'insensitive' } },
                ],
                status: 'PUBLISHED',
            },
            orderBy: { startDate: 'asc' },
        });

        if (rishikeshRetreat) {
            await prisma.retreatEnquiry.create({
                data: {
                    retreatId: rishikeshRetreat.id,
                    name,
                    email,
                    phone: phone || null,
                    participantsCount: guestCount,
                    message: leadNotes,
                },
            }).catch(() => {});
        }

        // 3. Notify Admin immediately
        notifyAdmin(
            `🧘 New Rishikesh Retreat Reservation: ${name} (${country || 'International'})`,
            emailLayout(
                `<h2>New 7-Day Rishikesh Retreat Booking Request</h2>
                <p><strong>Guest:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
                <p><strong>WhatsApp / Phone:</strong> ${escapeHtml(phone || 'Not specified')}</p>
                <p><strong>Country / Origin:</strong> ${escapeHtml(country || 'Not specified')}</p>
                <p><strong>Cohort:</strong> ${escapeHtml(cohortDate)}</p>
                <p><strong>Room Choice:</strong> ${escapeHtml(roomType)} (${guestCount} guest${guestCount > 1 ? 's' : ''})</p>
                <p><strong>Yoga Experience:</strong> ${escapeHtml(yogaExperience)}</p>
                <p><strong>Dietary & Health:</strong> ${escapeHtml(dietary)} ${medicalNotes ? `| Medical: ${escapeHtml(medicalNotes)}` : ''}</p>
                <p><strong>Travel/Arrival:</strong> ${escapeHtml(arrivalDetails || 'Assistance requested')}</p>
                <p><strong>Payment Method:</strong> ${escapeHtml(paymentPreference)}</p>
                <div style="margin-top:20px;padding:12px;background:#f5f4f0;border-left:4px solid #C68E5D;border-radius:4px;">
                    <strong>Next Steps:</strong> Contact guest on WhatsApp within 12 hours with their welcome kit, verify dates, and share the secure invoice link.
                </div>`,
            ),
            email,
        ).catch(() => {});

        return NextResponse.json({
            success: true,
            leadId: lead.id,
            message: 'Your retreat reservation has been received. Our retreat director will contact you on WhatsApp / email within 12 hours with your welcome kit and next steps.',
        });
    } catch (error) {
        console.error('Rishikesh retreat booking error:', error);
        return NextResponse.json({ error: 'Internal server error while reserving retreat.' }, { status: 500 });
    }
}
