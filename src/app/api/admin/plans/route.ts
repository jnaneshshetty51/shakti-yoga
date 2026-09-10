import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { PLANS, LADDER, type PlanKey } from '@/lib/pricing';
import { getPlanOverrides, setPlanOverrides, resolvedPlans, type PlanOverrides } from '@/lib/plans';

export const dynamic = 'force-dynamic';
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

/** GET — the ladder with code defaults, current overrides, and resolved values. */
export async function GET() {
    if (!(await requireSuperAdmin())) return forbidden();
    const [overrides, resolved] = await Promise.all([getPlanOverrides(), resolvedPlans()]);

    return NextResponse.json({
        plans: LADDER.map((key) => {
            const base = PLANS[key];
            const r = resolved[key];
            return {
                key,
                name: base.name,
                tier: base.tier,
                interval: base.interval,
                // entitlements — read-only, from code
                role: base.role,
                credits: base.credits,
                sessionsPerCycle: base.sessionsPerCycle,
                weeklyClassLimit: base.weeklyClassLimit,
                // editable — code default vs live
                defaultInr: base.inr,
                defaultUsd: base.usd,
                defaultFeatures: base.features,
                inr: r.inr,
                usd: r.usd,
                features: r.features,
                recommended: !!r.recommended,
                overridden: !!overrides[key],
            };
        }),
    });
}

/** PUT — replace the override set.  { overrides: { [planKey]: { inr, usd, features, recommended } } } */
export async function PUT(request: Request) {
    const admin = await requireSuperAdmin();
    if (!admin) return forbidden();

    const body = await request.json().catch(() => ({}));
    const raw = (body.overrides ?? {}) as Record<string, unknown>;
    const overrides: PlanOverrides = {};
    for (const [key, v] of Object.entries(raw)) {
        if (!(key in PLANS) || !v || typeof v !== 'object') continue;
        const o = v as Record<string, unknown>;
        overrides[key as PlanKey] = {
            ...(o.inr != null && o.inr !== '' ? { inr: Number(o.inr) } : {}),
            ...(o.usd != null && o.usd !== '' ? { usd: Number(o.usd) } : {}),
            ...(Array.isArray(o.features)
                ? { features: (o.features as unknown[]).map(String) }
                : typeof o.features === 'string' && o.features.trim()
                    ? { features: o.features.split('\n').map((s) => s.trim()).filter(Boolean) }
                    : {}),
            ...(typeof o.recommended === 'boolean' ? { recommended: o.recommended } : {}),
        };
    }

    await setPlanOverrides(overrides);
    await recordAudit({
        actorId: admin.id, actorEmail: admin.email, ip: getClientIp(request),
        action: 'plans.pricing.update', entity: 'Setting', entityId: 'plan_overrides',
        after: overrides,
    });

    return NextResponse.json({ ok: true });
}
