import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { LeadSource, LeadStatus } from '@prisma/client';
import { notifyAdmin, emailLayout } from '@/lib/email';
import { recordAudit } from '@/lib/audit';

export interface MetaLeadField {
    name: string;
    values: string[];
}

export interface MetaLeadPayload {
    id: string;
    created_time?: string;
    ad_id?: string;
    ad_name?: string;
    form_id?: string;
    form_name?: string;
    campaign_name?: string;
    field_data?: MetaLeadField[];
}

/**
 * Validates Meta x-hub-signature-256 header using META_APP_SECRET.
 * Meta sends: "sha256=<hex_hmac>"
 */
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
        console.warn('[meta] META_APP_SECRET is not configured; skipping signature verification in development');
        return process.env.NODE_ENV !== 'production';
    }

    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
        return false;
    }

    try {
        const signatureHex = signatureHeader.slice('sha256='.length);
        const signatureBuf = Buffer.from(signatureHex, 'hex');

        const expectedHex = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
        const expectedBuf = Buffer.from(expectedHex, 'hex');

        if (signatureBuf.length !== expectedBuf.length) {
            return false;
        }

        return timingSafeEqual(signatureBuf, expectedBuf);
    } catch (err) {
        console.error('[meta] signature verification error:', err);
        return false;
    }
}

/**
 * Fetch lead details from Facebook Graph API using the leadgen ID and Page Access Token.
 */
export async function fetchMetaLead(leadgenId: string): Promise<MetaLeadPayload | null> {
    const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
    if (!pageAccessToken) {
        console.error('[meta] META_PAGE_ACCESS_TOKEN is missing. Cannot fetch lead details from Graph API.');
        return null;
    }

    const fields = 'id,created_time,ad_id,ad_name,form_id,form_name,campaign_name,field_data';
    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(leadgenId)}?fields=${fields}&access_token=${encodeURIComponent(pageAccessToken)}`;

    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-store',
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[meta] Graph API error (${res.status}):`, errText);
            return null;
        }

        const data: MetaLeadPayload = await res.json();
        return data;
    } catch (err) {
        console.error('[meta] fetchMetaLead request failed:', err);
        return null;
    }
}

/**
 * Saves a Meta Facebook Lead Ads submission into the database as a Lead.
 */
export async function saveMetaLead(params: {
    leadgenId: string;
    formId?: string;
    adId?: string;
    pageId?: string;
    createdTime?: number;
}) {
    const { leadgenId, formId, adId, pageId } = params;

    const leadData = await fetchMetaLead(leadgenId);

    // Parse fields from field_data if available
    const fieldsMap: Record<string, string> = {};
    if (leadData?.field_data && Array.isArray(leadData.field_data)) {
        for (const item of leadData.field_data) {
            if (item.name && item.values?.[0]) {
                fieldsMap[item.name.toLowerCase()] = item.values[0];
            }
        }
    }

    // Extract common fields
    const email = fieldsMap['email'] || fieldsMap['email_address'] || (leadData ? null : `lead_${leadgenId}@facebook.lead`);
    const name = fieldsMap['full_name']
        || [fieldsMap['first_name'], fieldsMap['last_name']].filter(Boolean).join(' ')
        || fieldsMap['name']
        || 'Facebook Lead';
    const phone = fieldsMap['phone_number'] || fieldsMap['phone'] || null;
    const country = fieldsMap['country'] || null;
    const programInterest = fieldsMap['program_interest']
        || fieldsMap['interested_in']
        || fieldsMap['what_program_are_you_interested_in']
        || null;

    const campaign = leadData?.campaign_name
        || leadData?.ad_name
        || (adId ? `FB Ad ${adId}` : (formId ? `FB Form ${formId}` : 'Facebook Lead Ad'));

    // Format all other questions/answers into notes
    const formattedAnswers = Object.entries(fieldsMap)
        .map(([k, v]) => `• ${k}: ${v}`)
        .join('\n');

    const notesSummary = [
        `Lead Source: Facebook Lead Ads`,
        leadgenId ? `Leadgen ID: ${leadgenId}` : null,
        formId ? `Form ID: ${formId}${leadData?.form_name ? ` (${leadData.form_name})` : ''}` : null,
        adId ? `Ad ID: ${adId}${leadData?.ad_name ? ` (${leadData.ad_name})` : ''}` : null,
        pageId ? `Page ID: ${pageId}` : null,
        formattedAnswers ? `\nForm Responses:\n${formattedAnswers}` : null,
    ].filter(Boolean).join('\n');

    if (!email) {
        console.warn(`[meta] Lead ${leadgenId} has no email address. Skipping DB save.`);
        return null;
    }

    // Check if an existing lead with this email exists
    const existingLead = await prisma.lead.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        orderBy: { createdAt: 'desc' },
    });

    let savedLead;

    if (existingLead) {
        // Lead already exists; update missing fields and record activity
        savedLead = await prisma.lead.update({
            where: { id: existingLead.id },
            data: {
                phone: existingLead.phone || phone,
                country: existingLead.country || country,
                programInterest: existingLead.programInterest || programInterest,
                notes: existingLead.notes
                    ? `${existingLead.notes}\n\n---\n[Facebook Ad Re-engagement]:\n${notesSummary}`
                    : notesSummary,
            },
        });

        await prisma.leadActivity.create({
            data: {
                leadId: existingLead.id,
                type: 'NOTE',
                content: `New Facebook Lead Ad submission (Form: ${leadData?.form_name || formId || 'N/A'}, Leadgen ID: ${leadgenId})`,
                performedBy: 'system:facebook',
            },
        });

        await recordAudit({
            action: 'lead.updated_from_facebook',
            entity: 'Lead',
            entityId: existingLead.id,
            after: { leadgenId, formId, adId },
        });
    } else {
        // Create new lead
        savedLead = await prisma.lead.create({
            data: {
                name,
                email,
                phone,
                country,
                source: LeadSource.SOCIAL_MEDIA,
                status: LeadStatus.NEW,
                programInterest,
                campaign,
                notes: notesSummary,
                activities: {
                    create: {
                        type: 'NOTE',
                        content: `Lead created from Facebook Lead Ad (Form: ${leadData?.form_name || formId || 'N/A'}, Leadgen ID: ${leadgenId})`,
                        performedBy: 'system:facebook',
                    },
                },
            },
        });

        await recordAudit({
            action: 'lead.created_from_facebook',
            entity: 'Lead',
            entityId: savedLead.id,
            after: { name, email, phone, leadgenId, formId },
        });
    }

    // Send notification email to admin
    try {
        const emailHtml = emailLayout(`
            <h2 style="color:#4A6741;margin-top:0;">New Facebook Lead Ad Received!</h2>
            <p>A new lead has been submitted through Facebook/Instagram Lead Ads:</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
                <tr><td style="padding:6px 0;font-weight:bold;width:120px;">Name:</td><td>${name}</td></tr>
                <tr><td style="padding:6px 0;font-weight:bold;">Email:</td><td><a href="mailto:${email}">${email}</a></td></tr>
                <tr><td style="padding:6px 0;font-weight:bold;">Phone:</td><td>${phone || 'N/A'}</td></tr>
                <tr><td style="padding:6px 0;font-weight:bold;">Campaign:</td><td>${campaign || 'Facebook Ad'}</td></tr>
                ${programInterest ? `<tr><td style="padding:6px 0;font-weight:bold;">Program:</td><td>${programInterest}</td></tr>` : ''}
            </table>
            ${formattedAnswers ? `<div style="background:#f7f7f5;padding:12px;border-radius:6px;margin:12px 0;"><strong>Form Responses:</strong><pre style="white-space:pre-wrap;font-family:inherit;margin:8px 0 0 0;">${formattedAnswers}</pre></div>` : ''}
            <p style="margin-top:20px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/admin/leads" style="display:inline-block;background:#4A6741;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold;">View in Leads CRM</a>
            </p>
        `);

        await notifyAdmin(`[Shakti Yoga CRM] New Facebook Lead: ${name}`, emailHtml);
    } catch (notifyErr) {
        console.error('[meta] Failed to send admin email notification:', notifyErr);
    }

    return savedLead;
}
