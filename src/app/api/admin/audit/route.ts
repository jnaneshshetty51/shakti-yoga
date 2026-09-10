import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/admin-auth';
import type { Prisma } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

function buildWhere(url: URL): Prisma.AuditLogWhereInput {
    const entity = url.searchParams.get('entity');
    const action = url.searchParams.get('action');
    const actor = url.searchParams.get('actor')?.trim();
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const createdAt: Prisma.DateTimeFilter = {};
    if (from && !Number.isNaN(Date.parse(from))) createdAt.gte = new Date(from);
    if (to && !Number.isNaN(Date.parse(to))) createdAt.lte = new Date(`${to}T23:59:59.999Z`);
    return {
        ...(entity ? { entity } : {}),
        ...(action ? { action: { startsWith: action } } : {}),
        ...(actor ? { actorEmail: { contains: actor, mode: 'insensitive' } } : {}),
        ...(from || to ? { createdAt } : {}),
    };
}

export async function GET(request: Request) {
    if (!(await requireSuperAdmin())) return forbidden();
    try {
        const url = new URL(request.url);
        const where = buildWhere(url);

        // CSV export — flat, no pagination (capped).
        if (url.searchParams.get('format') === 'csv') {
            const rows = await prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 5000 });
            const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
            const csv = [
                'at,actor,action,entity,entityId,ip',
                ...rows.map((l) => [l.createdAt.toISOString(), l.actorEmail ?? l.actorId ?? 'system', l.action, l.entity, l.entityId ?? '', l.ip ?? ''].map(esc).join(',')),
            ].join('\n');
            return new NextResponse(csv, {
                headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="audit-log.csv"' },
            });
        }

        const take = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')) || 100));
        const cursor = url.searchParams.get('cursor');

        const logs = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: take + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = logs.length > take;
        const page = hasMore ? logs.slice(0, take) : logs;

        return NextResponse.json({
            logs: page.map((l) => ({
                id: l.id,
                at: l.createdAt.toISOString(),
                actor: l.actorEmail ?? l.actorId ?? 'system',
                action: l.action,
                entity: l.entity,
                entityId: l.entityId,
                before: l.before,
                after: l.after,
                ip: l.ip,
            })),
            nextCursor: hasMore ? page[page.length - 1].id : null,
        });
    } catch (error) {
        console.error('Admin audit GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
