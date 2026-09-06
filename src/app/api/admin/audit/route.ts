import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    try {
        const url = new URL(request.url);
        const take = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')) || 100));
        const cursor = url.searchParams.get('cursor');
        const entity = url.searchParams.get('entity');
        const action = url.searchParams.get('action');

        const logs = await prisma.auditLog.findMany({
            where: {
                ...(entity ? { entity } : {}),
                ...(action ? { action: { startsWith: action } } : {}),
            },
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
