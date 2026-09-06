import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { Role } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const GROUP_ROLES: Role[] = [
    Role.MEMBER_EVERYDAY,
    Role.MEMBER_THERAPY,
    Role.TRIAL,
    Role.TEACHER,
];

function serialize(g: {
    id: string; name: string; role: Role; link: string; pinnedMessage: string | null; active: boolean;
}) {
    return {
        id: g.id,
        name: g.name,
        role: g.role,
        whatsappLink: g.link,
        pinnedMessage: g.pinnedMessage ?? '',
        active: g.active,
    };
}

export async function GET() {
    if (!(await requireAdmin())) return forbidden();
    try {
        const groups = await prisma.whatsAppGroup.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] });
        return NextResponse.json({
            groups: groups.map(serialize),
            roles: GROUP_ROLES,
        });
    } catch (error) {
        console.error('Admin community GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();
    try {
        const b = await request.json().catch(() => ({}));
        const name = String(b.name ?? '').trim().slice(0, 120);
        const link = String(b.whatsappLink ?? b.link ?? '').trim().slice(0, 500);
        const role = String(b.role ?? '').toUpperCase();
        if (!name || !link) return NextResponse.json({ error: 'Name and link are required' }, { status: 400 });
        if (!(role in Role)) return NextResponse.json({ error: 'Pick a valid audience role' }, { status: 400 });

        const group = await prisma.whatsAppGroup.create({
            data: {
                name,
                link,
                role: role as Role,
                pinnedMessage: String(b.pinnedMessage ?? '').trim().slice(0, 1000) || null,
                active: b.active === undefined ? true : Boolean(b.active),
            },
        });
        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'community.group.create', entity: 'WhatsAppGroup', entityId: group.id, after: serialize(group),
        });
        return NextResponse.json({ group: serialize(group) });
    } catch (error) {
        console.error('Admin community POST error:', error);
        return NextResponse.json({ error: 'Could not create group' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();
    try {
        const b = await request.json().catch(() => ({}));
        if (!b.id) return NextResponse.json({ error: 'Group id is required' }, { status: 400 });

        const before = await prisma.whatsAppGroup.findUnique({ where: { id: b.id } });
        if (!before) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

        const data: Record<string, unknown> = {};
        if (b.name !== undefined) data.name = String(b.name).trim().slice(0, 120);
        if (b.whatsappLink !== undefined || b.link !== undefined) {
            data.link = String(b.whatsappLink ?? b.link).trim().slice(0, 500);
        }
        if (b.pinnedMessage !== undefined) data.pinnedMessage = String(b.pinnedMessage).trim().slice(0, 1000) || null;
        if (b.active !== undefined) data.active = Boolean(b.active);
        if (b.role !== undefined) {
            const role = String(b.role).toUpperCase();
            if (!(role in Role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
            data.role = role as Role;
        }

        const group = await prisma.whatsAppGroup.update({ where: { id: b.id }, data });
        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'community.group.update', entity: 'WhatsAppGroup', entityId: group.id,
            before: serialize(before), after: serialize(group),
        });
        return NextResponse.json({ group: serialize(group) });
    } catch (error) {
        console.error('Admin community PATCH error:', error);
        return NextResponse.json({ error: 'Could not update group' }, { status: 500 });
    }
}

// Keep PUT as an alias for PATCH so the old client shape still works.
export const PUT = PATCH;

export async function DELETE(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();
    try {
        const id = new URL(request.url).searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing group id' }, { status: 400 });
        const before = await prisma.whatsAppGroup.findUnique({ where: { id } });
        await prisma.whatsAppGroup.delete({ where: { id } });
        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'community.group.delete', entity: 'WhatsAppGroup', entityId: id,
            before: before ? serialize(before) : undefined,
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin community DELETE error:', error);
        return NextResponse.json({ error: 'Could not delete group' }, { status: 500 });
    }
}
