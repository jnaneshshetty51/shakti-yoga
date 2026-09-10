import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDepartment } from '@/lib/admin-auth';
import { auditAs } from '@/lib/audit';
import { ContentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const cap = (v: unknown, max: number) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, max).trim();
const toStatus = (v: unknown): ContentStatus => {
    const s = String(v || '').toUpperCase();
    return s in ContentStatus ? (s as ContentStatus) : ContentStatus.DRAFT;
};

export async function GET() {
    if (!(await requireDepartment('CONTENT'))) return forbidden();
    const rows = await prisma.fAQ.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] });
    return NextResponse.json({
        faqs: rows.map((f) => ({
            id: f.id,
            question: f.question,
            answer: f.answer,
            category: f.category,
            sortOrder: f.sortOrder,
            status: f.status,
        })),
    });
}

function data(body: Record<string, unknown>) {
    return {
        question: cap(body.question, 300),
        answer: cap(body.answer, 4000),
        category: cap(body.category || 'General', 60),
        sortOrder: Math.trunc(Number(body.sortOrder) || 0),
        status: toStatus(body.status),
    };
}

export async function POST(request: Request) {
    const admin = await requireDepartment('CONTENT');
    if (!admin) return forbidden();
    const body = await request.json().catch(() => ({}));
    const d = data(body);
    if (!d.question || !d.answer) return NextResponse.json({ error: 'Question and answer are required.' }, { status: 400 });
    const row = await prisma.fAQ.create({ data: d });
    await auditAs({ id: admin.id, email: admin.email }, request)({ action: 'faq.create', entity: 'FAQ', entityId: row.id, after: d });
    return NextResponse.json({ id: row.id });
}

export async function PATCH(request: Request) {
    const admin = await requireDepartment('CONTENT');
    if (!admin) return forbidden();
    const body = await request.json().catch(() => ({}));
    if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const d = data(body);
    const row = await prisma.fAQ.update({ where: { id: String(body.id) }, data: d });
    await auditAs({ id: admin.id, email: admin.email }, request)({ action: 'faq.update', entity: 'FAQ', entityId: row.id, after: d });
    return NextResponse.json({ id: row.id });
}

export async function DELETE(request: Request) {
    const admin = await requireDepartment('CONTENT');
    if (!admin) return forbidden();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await prisma.fAQ.delete({ where: { id } });
    await auditAs({ id: admin.id, email: admin.email }, request)({ action: 'faq.delete', entity: 'FAQ', entityId: id });
    return NextResponse.json({ ok: true });
}
