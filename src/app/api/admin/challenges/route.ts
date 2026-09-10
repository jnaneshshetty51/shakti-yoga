import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { toStorageKey, mediaSrc, deleteFile } from '@/lib/storage';
import { toChallengeGoal } from '@/lib/challenges';
import { ContentStatus } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

function cap(v: unknown, max: number): string {
    const s = typeof v === 'string' ? v : v == null ? '' : String(v);
    return s.slice(0, max).trim();
}
function toStatus(v: unknown): ContentStatus {
    const s = String(v || '').toUpperCase();
    return s in ContentStatus ? (s as ContentStatus) : ContentStatus.DRAFT;
}
function toDate(v: unknown): Date | null {
    if (!v) return null;
    const d = new Date(String(v));
    return Number.isNaN(+d) ? null : d;
}
function mediaOrNull(v: unknown): string | null | undefined {
    if (v === '') return null;
    if (typeof v === 'string' && toStorageKey(v)) return mediaSrc(toStorageKey(v)!);
    return undefined;
}

export async function GET() {
    if (!(await requireDepartment('CONTENT'))) return forbidden();
    const rows = await prisma.challenge.findMany({
        orderBy: { startDate: 'desc' },
        include: { _count: { select: { participants: true } } },
    });
    return NextResponse.json({
        challenges: rows.map((c) => ({
            id: c.id,
            title: c.title,
            description: c.description || '',
            goalType: c.goalType,
            goalTarget: c.goalTarget,
            startDate: c.startDate.toISOString().slice(0, 10),
            endDate: c.endDate.toISOString().slice(0, 10),
            imageUrl: c.imageUrl || '',
            status: c.status,
            participantCount: c._count.participants,
        })),
    });
}

async function upsert(body: Record<string, unknown>, id?: string) {
    const start = toDate(body.startDate) ?? new Date();
    const end = toDate(body.endDate) ?? new Date(start.getTime() + 30 * 86_400_000);
    if (end <= start) throw new Error('End date must be after the start date.');
    const img = mediaOrNull(body.imageUrl);
    const data = {
        title: cap(body.title || 'Challenge', 160),
        description: cap(body.description, 4000) || null,
        goalType: toChallengeGoal(body.goalType),
        goalTarget: Math.min(1000, Math.max(1, Math.trunc(Number(body.goalTarget) || 30))),
        startDate: start,
        endDate: end,
        status: toStatus(body.status),
        ...(img !== undefined ? { imageUrl: img } : {}),
    };
    return id
        ? prisma.challenge.update({ where: { id }, data })
        : prisma.challenge.create({ data });
}

export async function POST(request: Request) {
    const admin = await requireDepartment('CONTENT');
    if (!admin) return forbidden();
    try {
        const created = await upsert(await request.json().catch(() => ({})));
        await auditAs({ id: admin.id, email: admin.email }, request)({ action: 'challenge.create', entity: 'Challenge', entityId: created.id, after: { title: created.title } });
        return NextResponse.json({ id: created.id });
    } catch (e) {
        const message = e instanceof Error && e.message.length < 200 ? e.message : 'Could not save';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

export async function PATCH(request: Request) {
    const admin = await requireDepartment('CONTENT');
    if (!admin) return forbidden();
    try {
        const body = await request.json().catch(() => ({}));
        if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        const updated = await upsert(body, body.id);
        await auditAs({ id: admin.id, email: admin.email }, request)({ action: 'challenge.update', entity: 'Challenge', entityId: updated.id, after: { title: updated.title, status: updated.status } });
        return NextResponse.json({ id: updated.id });
    } catch (e) {
        const message = e instanceof Error && e.message.length < 200 ? e.message : 'Could not save';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

export async function DELETE(request: Request) {
    const admin = await requireDepartment('CONTENT');
    if (!admin) return forbidden();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const row = await prisma.challenge.findUnique({ where: { id }, select: { imageUrl: true, title: true } });
    await prisma.challenge.delete({ where: { id } });
    if (row?.imageUrl) await deleteFile(row.imageUrl).catch(() => {});
    await auditAs({ id: admin.id, email: admin.email }, request)({ action: 'challenge.delete', entity: 'Challenge', entityId: id, before: { title: row?.title } });
    return NextResponse.json({ ok: true });
}
