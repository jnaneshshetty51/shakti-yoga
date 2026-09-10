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
    const [benefits, stats] = await Promise.all([
        prisma.whyUsBenefit.findMany({ orderBy: { sortOrder: 'asc' } }),
        prisma.siteStats.findMany({ orderBy: { statKey: 'asc' } }),
    ]);
    return NextResponse.json({
        benefits: benefits.map((b) => ({ id: b.id, icon: b.icon, title: b.title, description: b.description, sortOrder: b.sortOrder, status: b.status })),
        stats: stats.map((s) => ({ id: s.id, statKey: s.statKey, statValue: s.statValue, category: s.category })),
    });
}

export async function POST(request: Request) {
    const admin = await requireDepartment('CONTENT');
    if (!admin) return forbidden();
    const body = await request.json().catch(() => ({}));
    const audit = auditAs({ id: admin.id, email: admin.email }, request);

    if (body.kind === 'benefit') {
        const d = {
            icon: cap(body.icon, 8) || '✨',
            title: cap(body.title, 120),
            description: cap(body.description, 600),
            sortOrder: Math.trunc(Number(body.sortOrder) || 0),
            status: toStatus(body.status),
        };
        if (!d.title || !d.description) return NextResponse.json({ error: 'Title and description are required.' }, { status: 400 });
        const row = body.id
            ? await prisma.whyUsBenefit.update({ where: { id: String(body.id) }, data: d })
            : await prisma.whyUsBenefit.create({ data: d });
        await audit({ action: body.id ? 'whyus.update' : 'whyus.create', entity: 'WhyUsBenefit', entityId: row.id, after: d });
        return NextResponse.json({ id: row.id });
    }

    if (body.kind === 'stat') {
        const statKey = cap(body.statKey, 60);
        const statValue = cap(body.statValue, 200);
        const category = cap(body.category || 'general', 40);
        if (!statKey) return NextResponse.json({ error: 'A key is required.' }, { status: 400 });
        const row = await prisma.siteStats.upsert({
            where: { statKey },
            create: { statKey, statValue, category },
            update: { statValue, category },
        });
        await audit({ action: 'sitestat.set', entity: 'SiteStats', entityId: row.id, after: { statKey, statValue } });
        return NextResponse.json({ id: row.id });
    }

    return NextResponse.json({ error: 'Unknown kind' }, { status: 400 });
}

export async function DELETE(request: Request) {
    const admin = await requireDepartment('CONTENT');
    if (!admin) return forbidden();
    const url = new URL(request.url);
    const kind = url.searchParams.get('kind');
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    if (kind === 'benefit') await prisma.whyUsBenefit.delete({ where: { id } });
    else if (kind === 'stat') await prisma.siteStats.delete({ where: { id } });
    else return NextResponse.json({ error: 'Unknown kind' }, { status: 400 });
    await auditAs({ id: admin.id, email: admin.email }, request)({ action: `${kind}.delete`, entity: kind === 'benefit' ? 'WhyUsBenefit' : 'SiteStats', entityId: id });
    return NextResponse.json({ ok: true });
}
