import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { uploadFile, deleteFile, keyFromUrl } from '@/lib/storage';
import { validateImageField } from '@/lib/image-upload';
import { Role } from '@prisma/client';

const STAFF_ROLES: Role[] = [Role.TEACHER, Role.STAFF_ADMIN, Role.SUPER_ADMIN];

/** Admin uploads / replaces a staff member's photo (multipart: staffId + file). */
export async function POST(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { allowed, retryAfterSeconds } = rateLimit(`staff-photo:${admin.id}`, 20, 60 * 60 * 1000);
    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many uploads. Try again later.' },
            { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
        );
    }

    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }
    const staffId = String(form.get('staffId') ?? '');
    if (!staffId) return NextResponse.json({ error: 'staffId is required' }, { status: 400 });

    const img = await validateImageField(form.get('file'));
    if (!img.ok) return NextResponse.json({ error: img.error }, { status: img.status });

    const staff = await prisma.user.findUnique({ where: { id: staffId }, select: { role: true, avatarUrl: true, name: true } });
    if (!staff || !STAFF_ROLES.includes(staff.role)) {
        return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    try {
        const key = `staff/${staffId}-${Date.now()}.${img.ext}`;
        const url = await uploadFile(img.file, key, { contentType: img.contentType, acl: 'public-read' });

        await prisma.user.update({ where: { id: staffId }, data: { avatarUrl: url } });

        if (staff.avatarUrl) {
            const oldKey = keyFromUrl(staff.avatarUrl);
            if (oldKey && oldKey.startsWith('staff/')) deleteFile(oldKey).catch(() => { });
        }

        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'staff.photo.update', entity: 'User', entityId: staffId,
        });

        return NextResponse.json({ photoUrl: url });
    } catch (error) {
        console.error('Staff photo upload error:', error);
        return NextResponse.json({ error: 'Could not upload the photo. Please try again.' }, { status: 500 });
    }
}

/** Remove a staff member's photo. */
export async function DELETE(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const staffId = new URL(request.url).searchParams.get('staffId');
    if (!staffId) return NextResponse.json({ error: 'staffId is required' }, { status: 400 });

    const staff = await prisma.user.findUnique({ where: { id: staffId }, select: { role: true, avatarUrl: true } });
    if (!staff || !STAFF_ROLES.includes(staff.role)) {
        return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    if (staff.avatarUrl) {
        const key = keyFromUrl(staff.avatarUrl);
        if (key && key.startsWith('staff/')) deleteFile(key).catch(() => { });
    }
    await prisma.user.update({ where: { id: staffId }, data: { avatarUrl: null } });
    return NextResponse.json({ success: true });
}
