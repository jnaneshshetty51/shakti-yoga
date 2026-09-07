import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/** GET — community posts + comments, most-reported first. */
export async function GET() {
    if (!(await requireAdmin())) return forbidden();
    const [posts, comments] = await Promise.all([
        prisma.communityPost.findMany({
            orderBy: [{ reportCount: 'desc' }, { createdAt: 'desc' }],
            take: 200,
            select: {
                id: true, body: true, hidden: true, reportCount: true, likeCount: true,
                commentCount: true, createdAt: true, user: { select: { name: true, email: true } },
            },
        }),
        prisma.communityComment.findMany({
            where: { reportCount: { gt: 0 } },
            orderBy: [{ reportCount: 'desc' }, { createdAt: 'desc' }],
            take: 200,
            select: {
                id: true, body: true, hidden: true, reportCount: true, createdAt: true, postId: true,
                user: { select: { name: true, email: true } },
            },
        }),
    ]);

    return NextResponse.json({
        posts: posts.map((p) => ({
            id: p.id, body: p.body, hidden: p.hidden, reportCount: p.reportCount,
            likeCount: p.likeCount, commentCount: p.commentCount, createdAt: p.createdAt.toISOString(),
            author: p.user.name, authorEmail: p.user.email,
        })),
        comments: comments.map((c) => ({
            id: c.id, body: c.body, hidden: c.hidden, reportCount: c.reportCount,
            createdAt: c.createdAt.toISOString(), postId: c.postId,
            author: c.user.name, authorEmail: c.user.email,
        })),
    });
}

/** PATCH { kind: 'post'|'comment', id, hidden } */
export async function PATCH(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    const b = await request.json().catch(() => ({}));
    const id = String(b.id ?? '');
    const hidden = Boolean(b.hidden);
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    if (b.kind === 'comment') {
        const c = await prisma.communityComment.findUnique({ where: { id }, select: { hidden: true, postId: true } });
        if (!c || c.hidden === hidden) return NextResponse.json({ ok: true });
        await prisma.$transaction([
            prisma.communityComment.update({ where: { id }, data: { hidden } }),
            prisma.communityPost.update({
                where: { id: c.postId },
                data: { commentCount: { [hidden ? 'decrement' : 'increment']: 1 } },
            }),
        ]);
        return NextResponse.json({ ok: true });
    }

    await prisma.communityPost.update({ where: { id }, data: { hidden } });
    return NextResponse.json({ ok: true });
}

/** DELETE ?kind=post|comment&id= */
export async function DELETE(request: Request) {
    if (!(await requireAdmin())) return forbidden();
    const url = new URL(request.url);
    const kind = url.searchParams.get('kind');
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    if (kind === 'comment') {
        const c = await prisma.communityComment.findUnique({ where: { id }, select: { hidden: true, postId: true } });
        if (c) {
            await prisma.$transaction([
                prisma.communityComment.delete({ where: { id } }),
                ...(c.hidden
                    ? []
                    : [prisma.communityPost.update({ where: { id: c.postId }, data: { commentCount: { decrement: 1 } } })]),
            ]);
        }
    } else {
        await prisma.communityPost.delete({ where: { id } }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
}
