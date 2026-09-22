import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { LeadSource, LeadStatus } from '@prisma/client';
import { auditAs } from '@/lib/audit';

type ImportLeadItem = {
    name: string;
    email: string;
    phone?: string;
    country?: string;
    source?: string;
    programInterest?: string;
    campaign?: string;
    notes?: string;
    assignedToId?: string;
};

export async function POST(request: Request) {
    try {
        const admin = await requireAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const rawLeads: ImportLeadItem[] = Array.isArray(body?.leads) ? body.leads : [];

        if (rawLeads.length === 0) {
            return NextResponse.json({ error: 'No leads provided in payload' }, { status: 400 });
        }

        if (rawLeads.length > 500) {
            return NextResponse.json({ error: 'Max 500 leads can be imported at once' }, { status: 400 });
        }

        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];

        // Pre-fetch all emails to check duplicates in one query
        const emailsToCheck = rawLeads
            .map((l) => (typeof l.email === 'string' ? l.email.trim().toLowerCase() : ''))
            .filter((e) => e.length > 0);

        const existingLeadEmails = new Set(
            (
                await prisma.lead.findMany({
                    where: { email: { in: emailsToCheck, mode: 'insensitive' } },
                    select: { email: true },
                })
            ).map((l) => l.email.toLowerCase())
        );

        for (let i = 0; i < rawLeads.length; i++) {
            const item = rawLeads[i];
            const name = String(item.name || '').trim();
            const email = String(item.email || '').trim().toLowerCase();

            if (!name || !email || !email.includes('@')) {
                skipped++;
                errors.push(`Row ${i + 1}: Invalid name or email (${email || 'empty'})`);
                continue;
            }

            if (existingLeadEmails.has(email)) {
                skipped++;
                continue; // duplicate email
            }

            const rawSource = item.source ? String(item.source).toUpperCase() : 'OTHER';
            const dbSource = (rawSource in LeadSource ? rawSource : 'OTHER') as LeadSource;

            try {
                const newLead = await prisma.lead.create({
                    data: {
                        name,
                        email,
                        phone: item.phone ? String(item.phone).trim() : null,
                        country: item.country ? String(item.country).trim() : null,
                        source: dbSource,
                        status: LeadStatus.NEW,
                        programInterest: item.programInterest ? String(item.programInterest).trim() : null,
                        campaign: item.campaign ? String(item.campaign).trim() : 'bulk_import',
                        notes: item.notes ? String(item.notes).trim() : null,
                        assignedToId: item.assignedToId || null,
                    },
                });

                await prisma.leadActivity.create({
                    data: {
                        leadId: newLead.id,
                        type: 'NOTE',
                        content: `Lead imported via bulk import by ${admin.email}`,
                        performedBy: admin.email,
                    },
                });

                existingLeadEmails.add(email);
                imported++;
            } catch (err) {
                console.error(`Error creating lead for ${email}:`, err);
                skipped++;
                errors.push(`Row ${i + 1} (${email}): Failed to save`);
            }
        }

        await auditAs({ id: admin.id, email: admin.email }, request)({
            action: 'lead.import',
            entity: 'Lead',
            after: { totalProvided: rawLeads.length, imported, skipped },
        });

        return NextResponse.json({
            success: true,
            imported,
            skipped,
            errors,
            message: `Successfully imported ${imported} lead${imported === 1 ? '' : 's'}${skipped > 0 ? ` (${skipped} skipped as duplicates or invalid)` : ''}.`,
        });
    } catch (error) {
        console.error('Leads import API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
