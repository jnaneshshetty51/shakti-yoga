import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { requireAdmin, requireSuperAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { hashPassword } from '@/lib/auth';
import { readJson, str, optStr, email as parseEmail, ValidationError, handleValidationError } from '@/lib/validation';
import { sendEmail, emailLayout } from '@/lib/email';
import { deleteFile, toStorageKey } from '@/lib/storage';
import { SITE_URL } from '@/lib/site';
import { Role } from '@prisma/client';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const STAFF_ROLES: Role[] = [Role.TEACHER, Role.STAFF_ADMIN, Role.SUPER_ADMIN];
const CREATABLE: Role[] = [Role.TEACHER, Role.STAFF_ADMIN];

function serialize(u: {
    id: string; name: string; email: string; phone: string | null; role: Role; avatarUrl: string | null;
    staffProfile: { title: string | null; bio: string | null; specialties: string[]; yearsExperience: number | null; displayOrder: number; publicVisible: boolean } | null;
    _count?: { classesTaught: number; sessionsTaught: number; availability: number };
}) {
    return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone ?? '',
        role: u.role,
        photoUrl: u.avatarUrl ?? null,
        title: u.staffProfile?.title ?? '',
        bio: u.staffProfile?.bio ?? '',
        specialties: u.staffProfile?.specialties ?? [],
        yearsExperience: u.staffProfile?.yearsExperience ?? null,
        displayOrder: u.staffProfile?.displayOrder ?? 0,
        publicVisible: u.staffProfile?.publicVisible ?? true,
        classesTaught: u._count?.classesTaught ?? 0,
        sessionsTaught: u._count?.sessionsTaught ?? 0,
        availabilityWindows: u._count?.availability ?? 0,
    };
}

const staffSelect = {
    id: true, name: true, email: true, phone: true, role: true, avatarUrl: true,
    staffProfile: {
        select: { title: true, bio: true, specialties: true, yearsExperience: true, displayOrder: true, publicVisible: true },
    },
    _count: { select: { classesTaught: true, sessionsTaught: true, availability: true } },
} as const;

export async function GET() {
    if (!(await requireAdmin())) return forbidden();
    const staff = await prisma.user.findMany({
        where: { role: { in: STAFF_ROLES } },
        select: staffSelect,
        orderBy: [{ staffProfile: { displayOrder: 'asc' } }, { name: 'asc' }],
    });
    return NextResponse.json({
        staff: staff.map(serialize),
        roles: CREATABLE,
    });
}

export async function POST(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();
    try {
        const body = await readJson(request);
        const name = str(body.name, { label: 'Name', min: 1, max: 120 });
        const email = parseEmail(body.email, 'Email');
        const roleRaw = str(body.role, { label: 'Role' }).toUpperCase();
        if (!(CREATABLE as string[]).includes(roleRaw)) {
            throw new ValidationError('Role must be TEACHER or STAFF_ADMIN.');
        }
        const role = roleRaw as Role;

        // Granting a staff-admin seat is a super-admin action.
        if (role === Role.STAFF_ADMIN && !(await requireSuperAdmin())) {
            return NextResponse.json({ error: 'Only a super admin can add a staff admin.' }, { status: 403 });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
        }

        const phone = optStr(body.phone, { label: 'Phone', max: 40 });
        const title = optStr(body.title, { label: 'Title', max: 120 });
        const bio = optStr(body.bio, { label: 'Bio', max: 3000 });
        const specialties = Array.isArray(body.specialties)
            ? (body.specialties as unknown[]).map((s) => String(s).trim()).filter(Boolean).slice(0, 20)
            : optStr(body.specialties, { label: 'Specialties', max: 500 })?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
        const yearsExperience = body.yearsExperience != null && body.yearsExperience !== ''
            ? Math.max(0, Math.min(80, Math.trunc(Number(body.yearsExperience))))
            : null;

        // Random password; the person sets their own via the emailed link.
        const tempPassword = randomBytes(18).toString('base64url');
        const passwordHash = await hashPassword(tempPassword);

        const user = await prisma.user.create({
            data: {
                name, email, passwordHash, role,
                phone: phone ?? null,
                staffProfile: {
                    create: {
                        title: title ?? null,
                        bio: bio ?? null,
                        specialties,
                        yearsExperience,
                        publicVisible: body.publicVisible === undefined ? true : Boolean(body.publicVisible),
                        displayOrder: Math.trunc(Number(body.displayOrder) || 0),
                    },
                },
            },
            select: staffSelect,
        });

        // Send a set-password link (reuses the reset-token mechanism).
        const rawToken = randomBytes(32).toString('hex');
        await prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                tokenHash: createHash('sha256').update(rawToken).digest('hex'),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days for onboarding
            },
        });
        const setupUrl = `${SITE_URL}/reset-password?token=${rawToken}`;
        sendEmail({
            to: email,
            subject: 'Set up your Shakti Yoga staff account',
            html: emailLayout(
                `<p>Hi ${name.split(' ')[0] || 'there'},</p>
                 <p>An account has been created for you on the Shakti Yoga platform. Set your password to sign in:</p>
                 <p><a href="${setupUrl}" style="color:#4A6741;font-weight:bold">Set your password</a></p>
                 <p>This link is valid for 7 days.</p>`,
            ),
        }).catch(() => { });

        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'staff.create', entity: 'User', entityId: user.id,
            after: { name, email, role },
        });

        return NextResponse.json({ staff: serialize(user), setupEmailSent: true });
    } catch (error) {
        if (error instanceof ValidationError) return handleValidationError(error);
        console.error('Admin staff POST error:', error);
        return NextResponse.json({ error: 'Could not create staff member.' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();
    try {
        const body = await readJson(request);
        const id = str(body.id, { label: 'id' });

        const before = await prisma.user.findUnique({ where: { id }, select: staffSelect });
        if (!before || !(STAFF_ROLES as string[]).includes(before.role)) {
            return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
        }

        // Changing to/from a *_ADMIN role is super-only.
        const userData: Record<string, unknown> = {};
        if (body.name !== undefined) userData.name = str(body.name, { label: 'Name', min: 1, max: 120 });
        if (body.phone !== undefined) userData.phone = optStr(body.phone, { label: 'Phone', max: 40 }) ?? null;
        if (body.role !== undefined) {
            const r = String(body.role).toUpperCase();
            if (!(STAFF_ROLES as string[]).includes(r)) {
                return NextResponse.json({ error: 'Invalid staff role.' }, { status: 400 });
            }
            const touchesAdmin = r === 'STAFF_ADMIN' || r === 'SUPER_ADMIN' ||
                before.role === Role.STAFF_ADMIN || before.role === Role.SUPER_ADMIN;
            if (touchesAdmin && !(await requireSuperAdmin())) {
                return NextResponse.json({ error: 'Only a super admin can change admin roles.' }, { status: 403 });
            }
            userData.role = r as Role;
        }

        const profileData: Record<string, unknown> = {};
        if (body.title !== undefined) profileData.title = optStr(body.title, { label: 'Title', max: 120 }) ?? null;
        if (body.bio !== undefined) profileData.bio = optStr(body.bio, { label: 'Bio', max: 3000 }) ?? null;
        if (body.specialties !== undefined) {
            profileData.specialties = Array.isArray(body.specialties)
                ? (body.specialties as unknown[]).map((s) => String(s).trim()).filter(Boolean).slice(0, 20)
                : String(body.specialties).split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20);
        }
        if (body.yearsExperience !== undefined) {
            profileData.yearsExperience = body.yearsExperience === '' || body.yearsExperience == null
                ? null : Math.max(0, Math.min(80, Math.trunc(Number(body.yearsExperience))));
        }
        if (body.displayOrder !== undefined) profileData.displayOrder = Math.trunc(Number(body.displayOrder) || 0);
        if (body.publicVisible !== undefined) profileData.publicVisible = Boolean(body.publicVisible);

        const updated = await prisma.user.update({
            where: { id },
            data: {
                ...userData,
                ...(Object.keys(profileData).length
                    ? { staffProfile: { upsert: { create: profileData, update: profileData } } }
                    : {}),
            },
            select: staffSelect,
        });

        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'staff.update', entity: 'User', entityId: id,
            before: { name: before.name, role: before.role, title: before.staffProfile?.title },
            after: { name: updated.name, role: updated.role, title: updated.staffProfile?.title },
        });

        return NextResponse.json({ staff: serialize(updated) });
    } catch (error) {
        if (error instanceof ValidationError) return handleValidationError(error);
        console.error('Admin staff PATCH error:', error);
        return NextResponse.json({ error: 'Could not update staff member.' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return forbidden();
    try {
        const id = new URL(request.url).searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const target = await prisma.user.findUnique({
            where: { id },
            select: {
                email: true, name: true, role: true, avatarUrl: true,
                _count: { select: { classesTaught: true, sessionsTaught: true } },
            },
        });
        if (!target || !(STAFF_ROLES as string[]).includes(target.role)) {
            return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
        }
        if (id === admin.id) {
            return NextResponse.json({ error: 'You cannot remove your own account here.' }, { status: 400 });
        }
        if ((target.role === Role.STAFF_ADMIN || target.role === Role.SUPER_ADMIN) && !(await requireSuperAdmin())) {
            return NextResponse.json({ error: 'Only a super admin can remove an admin.' }, { status: 403 });
        }
        if (target.role === Role.SUPER_ADMIN) {
            const supers = await prisma.user.count({ where: { role: Role.SUPER_ADMIN } });
            if (supers <= 1) {
                return NextResponse.json({ error: 'Cannot remove the only super admin.' }, { status: 400 });
            }
        }
        if (target._count.classesTaught > 0) {
            return NextResponse.json(
                { error: `${target.name} is assigned to ${target._count.classesTaught} class batch(es). Reassign those first.` },
                { status: 409 },
            );
        }

        // Detach any therapy sessions (keep the booking history, drop the teacher link is not
        // possible — teacherId is required — so refuse if there are upcoming ones).
        const upcoming = await prisma.booking.count({
            where: { teacherId: id, status: { in: ['PENDING', 'CONFIRMED'] }, date: { gt: new Date() } },
        });
        if (upcoming > 0) {
            return NextResponse.json(
                { error: `${target.name} has ${upcoming} upcoming session(s). Reassign or cancel them first.` },
                { status: 409 },
            );
        }

        await prisma.$transaction([
            prisma.teacherAvailability.deleteMany({ where: { teacherId: id } }),
            prisma.booking.deleteMany({ where: { teacherId: id } }), // only past/cancelled remain by here
            prisma.user.delete({ where: { id } }), // cascades StaffProfile
        ]);

        if (target.avatarUrl) {
            const key = toStorageKey(target.avatarUrl);
            if (key && key.startsWith('staff/')) deleteFile(key).catch(() => { });
        }

        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'staff.delete', entity: 'User', entityId: id,
            before: { name: target.name, email: target.email, role: target.role },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin staff DELETE error:', error);
        return NextResponse.json({ error: 'Could not remove staff member.' }, { status: 500 });
    }
}
