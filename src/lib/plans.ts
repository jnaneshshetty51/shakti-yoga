import { prisma } from '@/lib/prisma';
import { PLANS, type PlanConfig, type PlanKey } from '@/lib/pricing';

/**
 * Admin display-overrides for the plan ladder. Stored as JSON in the `Setting`
 * KV (`plan_overrides`) — no migration. Only display fields are overridable
 * (price, feature list, "recommended" flag); entitlements (role, credits, class
 * limits, store product ids) stay in `src/lib/pricing.ts`.
 */

const KEY = 'plan_overrides';

export interface PlanOverride {
    inr?: number;
    usd?: number;
    features?: string[];
    recommended?: boolean;
}

export type PlanOverrides = Partial<Record<PlanKey, PlanOverride>>;

export async function getPlanOverrides(): Promise<PlanOverrides> {
    try {
        const row = await prisma.setting.findUnique({ where: { key: KEY } });
        if (!row) return {};
        const parsed = JSON.parse(row.value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

export async function setPlanOverrides(overrides: PlanOverrides): Promise<void> {
    const clean: PlanOverrides = {};
    for (const [k, v] of Object.entries(overrides)) {
        if (!(k in PLANS) || !v || typeof v !== 'object') continue;
        const o: PlanOverride = {};
        if (typeof v.inr === 'number' && v.inr >= 0) o.inr = Math.round(v.inr);
        if (typeof v.usd === 'number' && v.usd >= 0) o.usd = Math.round(v.usd);
        if (Array.isArray(v.features)) o.features = v.features.map(String).filter(Boolean).slice(0, 12);
        if (typeof v.recommended === 'boolean') o.recommended = v.recommended;
        if (Object.keys(o).length) clean[k as PlanKey] = o;
    }
    await prisma.setting.upsert({
        where: { key: KEY },
        create: { key: KEY, value: JSON.stringify(clean) },
        update: { value: JSON.stringify(clean) },
    });
}

/** `PLANS` with admin overrides overlaid. Falls back to code values on any error. */
export async function resolvedPlans(): Promise<Record<PlanKey, PlanConfig>> {
    const overrides = await getPlanOverrides();
    const out = {} as Record<PlanKey, PlanConfig>;
    for (const [key, plan] of Object.entries(PLANS) as [PlanKey, PlanConfig][]) {
        const o = overrides[key];
        out[key] = o
            ? {
                  ...plan,
                  ...(typeof o.inr === 'number' ? { inr: o.inr } : {}),
                  ...(typeof o.usd === 'number' ? { usd: o.usd } : {}),
                  ...(o.features && o.features.length ? { features: o.features } : {}),
                  ...(typeof o.recommended === 'boolean' ? { recommended: o.recommended } : {}),
              }
            : plan;
    }
    return out;
}

export async function resolvedPlan(key: string | null | undefined): Promise<PlanConfig> {
    const all = await resolvedPlans();
    return key && key in all ? all[key as PlanKey] : all.everyday;
}
