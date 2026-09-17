import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { deleteFile } from '@/lib/storage';
import { truncate as cap } from '@/lib/validation';

export const dynamic = 'force-dynamic';
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/**
 * Private, staff-only modules for one therapy patient — notes, program
 * toggles, and/or an attachment. Never exposed through any patient-facing
 * route; see prisma/schema.prisma's TherapyModule doc comment.
 */

/** GET — every module for this patient. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    if (!(await requireDepartment('THERAPIST'))) return forbidden();
    const { id } = await ctx.params;

    const rows = await prisma.therapyModule.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { name: true } }, updatedBy: { select: { name: true } } },
    });

    return NextResponse.json({
        modules: rows.map((m) => ({
            id: m.id,
            title: m.title,
            body: m.body,
            enabled: m.enabled,
            attachmentUrl: m.attachmentUrl,
            attachmentName: m.attachmentName,
            createdBy: m.createdBy?.name ?? null,
            updatedBy: m.updatedBy?.name ?? null,
            createdAt: m.createdAt.toISOString(),
            updatedAt: m.updatedAt.toISOString(),
        })),
    });
}

/** POST — add a module for this patient. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const admin = await requireDepartment('THERAPIST');
    if (!admin) return forbidden();
    const { id } = await ctx.params;

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const title = cap(body.title, 120);
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    const m = await prisma.therapyModule.create({
        data: {
            userId: id,
            title,
            body: cap(body.body, 10_000) || null,
            enabled: body.enabled === undefined ? true : Boolean(body.enabled),
            attachmentUrl: cap(body.attachmentUrl, 300) || null,
            attachmentName: cap(body.attachmentName, 200) || null,
            createdById: admin.id,
        },
    });

    await auditAs({ id: admin.id, email: admin.email }, request)({
        action: 'therapy.module.create', entity: 'TherapyModule', entityId: m.id, after: { userId: id, title },
    });
    return NextResponse.json({ id: m.id });
}

/** PATCH — update a module. Body: { moduleId, title?, body?, enabled?, attachmentUrl?, attachmentName? }. */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const admin = await requireDepartment('THERAPIST');
    if (!admin) return forbidden();
    const { id } = await ctx.params;

    const body = await request.json().catch(() => ({}));
    const moduleId = String(body.moduleId || '');
    if (!moduleId) return NextResponse.json({ error: 'Missing moduleId' }, { status: 400 });

    const existing = await prisma.therapyModule.findUnique({ where: { id: moduleId }, select: { userId: true, attachmentUrl: true } });
    if (!existing || existing.userId !== id) return NextResponse.json({ error: 'Module not found for this patient' }, { status: 404 });

    const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
    const data: Record<string, unknown> = { updatedById: admin.id };
    if (has('title')) {
        const title = cap(body.title, 120);
        if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        data.title = title;
    }
    if (has('body')) data.body = cap(body.body, 10_000) || null;
    if (has('enabled')) data.enabled = Boolean(body.enabled);
    if (has('attachmentUrl')) {
        const nextUrl = cap(body.attachmentUrl, 300) || null;
        if (existing.attachmentUrl && existing.attachmentUrl !== nextUrl) await deleteFile(existing.attachmentUrl).catch(() => {});
        data.attachmentUrl = nextUrl;
        data.attachmentName = cap(body.attachmentName, 200) || null;
    }

    const updated = await prisma.therapyModule.update({ where: { id: moduleId }, data });
    await auditAs({ id: admin.id, email: admin.email }, request)({
        action: 'therapy.module.update', entity: 'TherapyModule', entityId: moduleId, after: { userId: id },
    });
    return NextResponse.json({ id: updated.id });
}

/** DELETE ?moduleId= — scoped to the patient in the URL, not just the id. */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const admin = await requireDepartment('THERAPIST');
    if (!admin) return forbidden();
    const { id } = await ctx.params;
    const moduleId = new URL(request.url).searchParams.get('moduleId');
    if (!moduleId) return NextResponse.json({ error: 'Missing moduleId' }, { status: 400 });

    const existing = await prisma.therapyModule.findUnique({ where: { id: moduleId }, select: { userId: true, attachmentUrl: true } });
    if (!existing || existing.userId !== id) return NextResponse.json({ error: 'Module not found for this patient' }, { status: 404 });

    await prisma.therapyModule.delete({ where: { id: moduleId } });
    if (existing.attachmentUrl) await deleteFile(existing.attachmentUrl).catch(() => {});

    await auditAs({ id: admin.id, email: admin.email }, request)({
        action: 'therapy.module.delete', entity: 'TherapyModule', entityId: moduleId, after: { userId: id },
    });
    return NextResponse.json({ ok: true });
}
