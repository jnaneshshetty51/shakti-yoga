import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';
import { toStorageKey, mediaSrc, deleteFile } from '@/lib/storage';
import { toContentCategory } from '@/lib/content';
import { toPracticeLevel } from '@/lib/practice';
import { ContentStatus } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

function cap(v: unknown, max: number): string {
    const s = typeof v === 'string' ? v : v == null ? '' : String(v);
    return s.slice(0, max).trim();
}
function slugify(s: string) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function toStatus(v: unknown): ContentStatus {
    const s = String(v || '').toUpperCase();
    return s in ContentStatus ? (s as ContentStatus) : ContentStatus.DRAFT;
}
function mediaOrNull(v: unknown): string | null | undefined {
    if (v === '') return null;
    if (typeof v === 'string' && toStorageKey(v)) return mediaSrc(toStorageKey(v)!);
    return undefined;
}

export async function GET() {
    if (!(await requireDepartment('CONTENT'))) return forbidden();
    const rows = await prisma.practice.findMany({ orderBy: { createdAt: 'desc' } });
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
    if (!(await requireDepartment('CONTENT'))) return forbidden();
    try {
        const created = await upsert(await request.json().catch(() => ({})));
        return NextResponse.json({ id: created.id });
    } catch (e) {
        console.error('[admin/practices] POST', e);
        return NextResponse.json({ error: 'Could not save' }, { status: 400 });
    }
}

export async function PATCH(request: Request) {
    if (!(await requireDepartment('CONTENT'))) return forbidden();
    try {
        const body = await request.json().catch(() => ({}));
        if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        const updated = await upsert(body, body.id);
        return NextResponse.json({ id: updated.id });
    } catch (e) {
        console.error('[admin/practices] PATCH', e);
        return NextResponse.json({ error: 'Could not save' }, { status: 400 });
    }
}

export async function DELETE(request: Request) {
    if (!(await requireDepartment('CONTENT'))) return forbidden();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const row = await prisma.practice.findUnique({ where: { id }, select: { thumbnailUrl: true } });
    await prisma.practice.delete({ where: { id } });
    if (row?.thumbnailUrl) await deleteFile(row.thumbnailUrl).catch(() => {});
    return NextResponse.json({ ok: true });
}
