import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { isRazorpayConfigured } from '@/lib/razorpay';

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const DEFAULTS: Record<string, string> = {
    platformName: 'Shakti Yoga',
    supportEmail: 'support@shaktiyoga.com',
    defaultTimezone: 'IST',
};

export async function GET() {
    if (!(await requireSuperAdmin())) return forbidden();

    const rows = await prisma.setting.findMany();
    const settings = { ...DEFAULTS };
    for (const row of rows) settings[row.key] = row.value;

    const integrations = {
        razorpay: isRazorpayConfigured(),
        minio: Boolean(process.env.MINIO_ENDPOINT && process.env.MINIO_ACCESS_KEY),
    };

    return NextResponse.json({ settings, integrations });
}

export async function PUT(request: Request) {
    const admin = await requireSuperAdmin();
    if (!admin) return forbidden();

    try {
        const body = await request.json().catch(() => ({}));
        const allowed = Object.keys(DEFAULTS);
        const entries = Object.entries(body ?? {})
            .filter(([k, v]) => allowed.includes(k) && typeof v === 'string' && v.length <= 500)
            .map(([k, v]) => [k, (v as string).trim()] as const);

        await prisma.$transaction(
            entries.map(([key, value]) =>
                prisma.setting.upsert({
                    where: { key },
                    create: { key, value },
                    update: { value },
                }),
            ),
        );

        await recordAudit({
            actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
            action: 'settings.update', entity: 'Setting',
            after: Object.fromEntries(entries),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin settings PUT error:', error);
        return NextResponse.json({ error: 'Could not save settings' }, { status: 500 });
    }
}
