import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { toStorageKey, mediaSrc, deleteFile } from '@/lib/storage';
import { toContentCategory } from '@/lib/content';
import { toPracticeLevel } from '@/lib/practice';
import { truncate as cap, enumOrDefault } from '@/lib/validation';
import { ContentStatus } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

function slugify(s: string) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function toStatus(v: unknown): ContentStatus {
    return enumOrDefault(v, ContentStatus, ContentStatus.DRAFT);
}
function mediaOrNull(v: unknown): string | null | undefined {
    if (v === '') return null;
    if (typeof v === 'string' && toStorageKey(v)) return mediaSrc(toStorageKey(v)!);
    return undefined;
}

export async function GET() {
    if (!(await requireDepartment('CONTENT'))) return forbidden();
    const rows = await prisma.practice.findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { completions: true } } },
    });
    const since = new Date(Date.now() - 30 * 86_400_000);
    const recent = await prisma.practiceCompletion.groupBy({
        by: ['practiceId'],
        where: { completedAt: { gte: since } },
        _count: { _all: true },
    });
    const recentByPractice = new Map(recent.map((r) => [r.practiceId, r._count._all]));

    return NextResponse.json({
        practices: rows.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            description: p.description || '',
            steps: p.steps || '',
            category: p.category,
            level: p.level,
            durationMin: p.durationMin,
            videoUrl: p.videoUrl || '',
            thumbnailUrl: p.thumbnailUrl || '',
            status: p.status,
            completions: p._count.completions,
            completions30d: recentByPractice.get(p.id) ?? 0,
        })),
    });
}

async function upsert(body: Record<string, unknown>, id?: string) {
    const title = cap(body.title || 'Untitled practice', 160);
    const status = toStatus(body.status);
    const thumb = mediaOrNull(body.thumbnailUrl);
    const data = {
        title,
        description: cap(body.description, 4000) || null,
        steps: cap(body.steps, 8000) || null,
        category: toContentCategory(body.category),
        level: toPracticeLevel(body.level),
        durationMin: Math.min(180, Math.max(1, Math.trunc(Number(body.durationMin) || 10))),
        videoUrl: cap(body.videoUrl, 400) || null,
        status,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        ...(thumb !== undefined ? { thumbnailUrl: thumb } : {}),
    };

    if (!id) {
        return prisma.practice.create({
            data: { ...data, slug: cap(body.slug, 160) || slugify(title) || `p-${Date.now()}` },
        });
    }
    const patch: Record<string, unknown> = { ...data };
    if (cap(body.slug, 160)) patch.slug = slugify(cap(body.slug, 160));
    // Don't stomp publishedAt on every edit of an already-live practice.
    const current = await prisma.practice.findUnique({ where: { id }, select: { publishedAt: true } });
    if (status === 'PUBLISHED') patch.publishedAt = current?.publishedAt ?? new Date();
    return prisma.practice.update({ where: { id }, data: patch });
}

export async function POST(request: Request) {
    const admin = await requireDepartment('CONTENT');
    if (!admin) return forbidden();
    try {
        const created = await upsert(await request.json().catch(() => ({})));
        await auditAs({ id: admin.id, email: admin.email }, request)({ action: 'practice.create', entity: 'Practice', entityId: created.id, after: { title: created.title } });
        return NextResponse.json({ id: created.id });
    } catch (e) {
        console.error('[admin/practices] POST', e);
        return NextResponse.json({ error: 'Could not save' }, { status: 400 });
    }
}

export async function PATCH(request: Request) {
    const admin = await requireDepartment('CONTENT');
    if (!admin) return forbidden();
    try {
        const body = await request.json().catch(() => ({}));
        if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        const updated = await upsert(body, body.id);
        await auditAs({ id: admin.id, email: admin.email }, request)({ action: 'practice.update', entity: 'Practice', entityId: updated.id, after: { title: updated.title, status: updated.status } });
        return NextResponse.json({ id: updated.id });
    } catch (e) {
        console.error('[admin/practices] PATCH', e);
        return NextResponse.json({ error: 'Could not save' }, { status: 400 });
    }
}

export async function DELETE(request: Request) {
    const admin = await requireDepartment('CONTENT');
    if (!admin) return forbidden();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const row = await prisma.practice.findUnique({ where: { id }, select: { thumbnailUrl: true, title: true } });
    await prisma.practice.delete({ where: { id } });
    if (row?.thumbnailUrl) await deleteFile(row.thumbnailUrl).catch(() => {});
    await auditAs({ id: admin.id, email: admin.email }, request)({ action: 'practice.delete', entity: 'Practice', entityId: id, before: { title: row?.title } });
    return NextResponse.json({ ok: true });
}
