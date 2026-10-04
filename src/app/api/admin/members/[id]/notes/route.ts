import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await ctx.params;

    const notes = await prisma.auditLog.findMany({
        where: { entityId: id, action: 'student.note.create' },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });

    const parsed = notes.map((n) => {
        const payload = (n.after as { category?: string; note?: string; isPinned?: boolean }) || {};
        return {
            id: n.id,
            author: n.actorEmail || 'Staff',
            category: payload.category || 'GENERAL',
            note: payload.note || (typeof n.after === 'string' ? n.after : ''),
            isPinned: Boolean(payload.isPinned),
            at: n.createdAt.toISOString(),
        };
    });

    // Pinned notes first, then chronological
    parsed.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

    return NextResponse.json({ notes: parsed });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    if (!body || !body.note || typeof body.note !== 'string' || !body.note.trim()) {
        return NextResponse.json({ error: 'Note text is required' }, { status: 400 });
    }

    const category = body.category || 'HEALTH';
    const isPinned = Boolean(body.isPinned);
    const noteText = body.note.trim();

    const entry = await prisma.auditLog.create({
        data: {
            actorId: admin.id,
            actorEmail: admin.email,
            action: 'student.note.create',
            entity: 'User',
            entityId: id,
            after: {
                category,
                note: noteText,
                isPinned,
            },
        },
    });

    return NextResponse.json({
        success: true,
        note: {
            id: entry.id,
            author: admin.email,
            category,
            note: noteText,
            isPinned,
            at: entry.createdAt.toISOString(),
        },
    });
}
