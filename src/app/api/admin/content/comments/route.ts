import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/** GET /api/admin/content/comments — reported first, then most recent. */
export async function GET() {
    if (!(await requireAdmin())) return forbidden();
    try {
        const rows = await prisma.contentComment.findMany({
            orderBy: [{ reportCount: 'desc' }, { createdAt: 'desc' }],
            take: 200,
            select: {
                id: true, body: true, hidden: true, reportCount: true, createdAt: true,
                user: { select: { name: true, email: true } },
                content: { select: { id: true, title: true, type: true } },
            },
        });
        return NextResponse.json({
            comments: rows.map((r) => ({
                id: r.id,
                body: r.body,
                hidden: r.hidden,
                reportCount: r.reportCount,
                createdAt: r.createdAt.toISOString(),
                author: r.user.name,
                authorEmail: r.user.email,
                contentId: r.content.id,
                contentTitle: r.content.title,
                contentType: r.content.type,
            })),
        });
    } catch (error) {
        console.error('[admin/comments] failed', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/** PATCH { id, hidden } — hide / unhide, keeping Content.commentCount in step. */
export async function PATCH(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    const body = await request.json().catch(() => ({}));
    const id = String(body.id ?? '');
    const hidden = Boolean(body.hidden);
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const comment = await prisma.contentComment.findUnique({ where: { id }, select: { hidden: true, contentId: true } });
    if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (comment.hidden === hidden) return NextResponse.json({ ok: true });

    await prisma.$transaction([
        prisma.contentComment.update({ where: { id }, data: { hidden } }),
        prisma.content.update({
            where: { id: comment.contentId },
            data: { commentCount: { [hidden ? 'decrement' : 'increment']: 1 } },
        }),
    ]);
    return NextResponse.json({ ok: true });
}

/** DELETE ?id= — remove a comment for good. */
export async function DELETE(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const comment = await prisma.contentComment.findUnique({ where: { id }, select: { hidden: true, contentId: true } });
    if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.$transaction([
        prisma.contentComment.delete({ where: { id } }),
        ...(comment.hidden
            ? []
            : [prisma.content.update({ where: { id: comment.contentId }, data: { commentCount: { decrement: 1 } } })]),
    ]);
    return NextResponse.json({ ok: true });
}
