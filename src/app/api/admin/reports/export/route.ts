import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';

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

const REPORTS = {
    async payments(): Promise<Row[]> {
        const rows = await prisma.payment.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5000,
            include: { user: { select: { name: true, email: true } } },
        });
        return rows.map((p) => ({
            date: iso(p.createdAt),
            member: p.user?.name ?? '',
            email: p.user?.email ?? '',
            plan: p.planType,
            amount: p.amount,
            currency: p.currency,
            status: p.status,
            provider: p.provider,
            providerPaymentId: p.providerPaymentId ?? '',
        }));
    },
    async members(): Promise<Row[]> {
        const rows = await prisma.user.findMany({
            where: { role: { in: ['MEMBER_EVERYDAY', 'MEMBER_THERAPY', 'TRIAL'] } },
            orderBy: { createdAt: 'desc' },
            take: 5000,
            include: { subscription: { select: { planType: true, status: true, renewalDate: true } } },
        });
        return rows.map((u) => ({
            name: u.name,
            email: u.email,
            phone: u.phone ?? '',
            country: u.country ?? '',
            role: u.role,
            plan: u.subscription?.planType ?? '',
            subStatus: u.subscription?.status ?? '',
            renewalDate: iso(u.subscription?.renewalDate),
            credits: u.credits,
            joined: iso(u.createdAt),
            lastLogin: iso(u.lastLogin),
        }));
    },
    async subscriptions(): Promise<Row[]> {
        const rows = await prisma.subscription.findMany({
            orderBy: { renewalDate: 'asc' },
            take: 5000,
            include: { user: { select: { name: true, email: true } } },
        });
        return rows.map((s) => ({
            member: s.user?.name ?? '',
            email: s.user?.email ?? '',
            plan: s.planType,
            amount: s.amount,
            currency: s.currency,
            status: s.status,
            recurring: s.recurring ? 'yes' : 'no',
            startDate: iso(s.startDate),
            renewalDate: iso(s.renewalDate),
        }));
    },
    async bookings(): Promise<Row[]> {
        const rows = await prisma.booking.findMany({
            orderBy: { date: 'desc' },
            take: 5000,
            include: {
                user: { select: { name: true, email: true } },
                teacher: { select: { name: true } },
            },
        });
        return rows.map((b) => ({
            date: b.date.toISOString(),
            member: b.user?.name ?? '',
            email: b.user?.email ?? '',
            teacher: b.teacher?.name ?? '',
            type: b.type,
            status: b.status,
            hasMeetingLink: b.meetingLink ? 'yes' : 'no',
        }));
    },
} as const;

type ReportType = keyof typeof REPORTS;

export async function GET(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return new Response('Forbidden', { status: 403 });

    const type = new URL(request.url).searchParams.get('type') as ReportType | null;
    if (!type || !(type in REPORTS)) {
        return new Response('Unknown report type', { status: 400 });
    }

    try {
        const rows = await REPORTS[type]();
        const csv = toCsv(rows);

        await recordAudit({
            actorId: admin.id,
            actorEmail: admin.email,
            ip: getClientIp(request),
            action: 'reports.export',
            entity: 'Report',
            after: { type, rows: rows.length },
        });

        const date = new Date().toISOString().slice(0, 10);
        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="shakti-${type}-${date}.csv"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Admin reports export error:', error);
        return new Response('Export failed', { status: 500 });
    }
}
