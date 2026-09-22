import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { LeadSource, LeadStatus, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

type Row = Record<string, string | number | null>;

function toCsv(rows: Row[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const esc = (v: string | number | null) => {
        const s = v == null ? '' : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : '');

export async function GET(request: Request) {
    try {
        const admin = await requireAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const source = searchParams.get('source');
        const programInterest = searchParams.get('programInterest');
        const assignedToId = searchParams.get('assignedToId');
        const search = searchParams.get('search')?.trim();

        const whereClause: Prisma.LeadWhereInput = {};

        if (status && status !== 'all' && status.toUpperCase() in LeadStatus) {
            whereClause.status = status.toUpperCase() as LeadStatus;
        }

        if (source && source !== 'all' && source.toUpperCase() in LeadSource) {
            whereClause.source = source.toUpperCase() as LeadSource;
        }

        if (programInterest && programInterest !== 'all') {
            whereClause.programInterest = programInterest;
        }

        if (assignedToId && assignedToId !== 'all') {
            whereClause.assignedToId = assignedToId === 'unassigned' ? null : assignedToId;
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
            ];
        }

        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: {
                assignedTo: { select: { name: true } },
                _count: { select: { activities: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 5000,
        });

        const rows: Row[] = leads.map((l) => ({
            ID: l.id,
            Name: l.name,
            Email: l.email,
            Phone: l.phone ?? '',
            Country: l.country ?? '',
            Status: l.status,
            Source: l.source,
            ProgramInterest: l.programInterest ?? '',
            Campaign: l.campaign ?? '',
            AssignedTo: l.assignedTo?.name ?? 'Unassigned',
            NextFollowUp: iso(l.nextFollowUpAt),
            TrialDate: iso(l.trialDate),
            TrialAttended: l.trialAttended ? 'Yes' : 'No',
            Converted: l.convertedAt ? 'Yes' : 'No',
            ConvertedAt: iso(l.convertedAt),
            ActivitiesCount: l._count.activities,
            Notes: l.notes ? l.notes.replace(/\r?\n/g, ' ') : '',
            CreatedAt: iso(l.createdAt),
        }));

        const csv = toCsv(rows);
        const filename = `shakti-leads-export-${new Date().toISOString().slice(0, 10)}.csv`;

        await auditAs({ id: admin.id, email: admin.email }, request)({
            action: 'lead.export',
            entity: 'Lead',
            after: { count: rows.length, filterStatus: status || 'all' },
        });

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Leads export error:', error);
        return NextResponse.json({ error: 'Failed to export leads' }, { status: 500 });
    }
}
