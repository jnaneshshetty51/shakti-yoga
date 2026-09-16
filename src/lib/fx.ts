import { prisma } from '@/lib/prisma';

const RATE_KEY = 'fx_usd_inr_rate';
const RATE_AT_KEY = 'fx_usd_inr_rate_at';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // FX moves slowly enough that daily is plenty for business reporting
const FALLBACK_RATE = 88; // used only if there is no cached rate yet AND the live fetch fails

/**
 * Live USD→INR rate, cached in Settings for up to 24h. The business's own USD
 * plan prices (lib/pricing.ts) are fixed marketing numbers, not derived from
 * this — this rate exists purely to normalize mixed-currency Payment /
 * Subscription / RevenueRecord rows into one INR figure for reporting
 * (dashboard MRR, revenue-by-month, lead-source attribution, etc). Never
 * throws — a reporting feature must not break because an external API is
 * down; it just serves the last known rate (or the hardcoded fallback).
 */
export async function getUsdToInrRate(): Promise<number> {
    const [rateRow, atRow] = await Promise.all([
        prisma.setting.findUnique({ where: { key: RATE_KEY } }),
        prisma.setting.findUnique({ where: { key: RATE_AT_KEY } }),
    ]);
    const cachedRate = rateRow ? Number(rateRow.value) : null;
    const cachedAt = atRow ? new Date(atRow.value).getTime() : 0;
    const fresh = cachedRate != null && Number.isFinite(cachedRate) && Date.now() - cachedAt < CACHE_TTL_MS;
    if (fresh) return cachedRate!;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`FX API returned ${res.status}`);
        const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
        const rate = data.rates?.INR;
        if (data.result !== 'success' || !rate || !Number.isFinite(rate) || rate <= 0) {
            throw new Error('FX API returned no usable INR rate');
        }

        await prisma.$transaction([
            prisma.setting.upsert({ where: { key: RATE_KEY }, create: { key: RATE_KEY, value: String(rate) }, update: { value: String(rate) } }),
            prisma.setting.upsert({ where: { key: RATE_AT_KEY }, create: { key: RATE_AT_KEY, value: new Date().toISOString() }, update: { value: new Date().toISOString() } }),
        ]);
        return rate;
    } catch (error) {
        console.error('[fx] live rate fetch failed, falling back', error);
        return cachedRate ?? FALLBACK_RATE;
    }
}

/** Convert one amount to INR given an already-fetched rate. INR/unrecognized currencies pass through unchanged. */
export function convertToInr(amount: number, currency: string, usdToInrRate: number): number {
    if (currency === 'USD') return amount * usdToInrRate;
    return amount;
}

/** Sum a list of {amount, currency} rows into one INR total, fetching the rate once. */
export async function sumAsInr(rows: { amount: number; currency: string }[]): Promise<number> {
    if (rows.length === 0) return 0;
    const rate = rows.some((r) => r.currency === 'USD') ? await getUsdToInrRate() : 1;
    return rows.reduce((s, r) => s + convertToInr(r.amount, r.currency, rate), 0);
}
