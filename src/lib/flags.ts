import { prisma } from '@/lib/prisma';

/**
 * Runtime feature flags / experiment config. Backed by `Setting` rows so the
 * team can flip them without a deploy (an admin screen can edit these). PostHog
 * experiments can layer on top client-side later.
 */

export interface Flags {
    /** Show in-app purchases where the native SDK is available (else web checkout). */
    iapEnabled: boolean;
    /** Paywall preselects the annual plan. */
    annualDefault: boolean;
    /** Which paywall layout to render. */
    paywallVariant: 'ladder' | 'simple';
    /** Days into the trial before the hard paywall. */
    trialPaywallDay: number;
}

const DEFAULTS: Flags = {
    iapEnabled: true,
    annualDefault: true,
    paywallVariant: 'ladder',
    trialPaywallDay: 6,
};

const KEYS = ['flag_iapEnabled', 'flag_annualDefault', 'flag_paywallVariant', 'flag_trialPaywallDay'];

export async function getFlags(): Promise<Flags> {
    try {
        const rows = await prisma.setting.findMany({ where: { key: { in: KEYS } } });
        const map = new Map(rows.map((r) => [r.key, r.value]));
        const bool = (k: string, d: boolean) => {
            const v = map.get(k);
            return v == null ? d : v === 'true';
        };
        return {
            iapEnabled: bool('flag_iapEnabled', DEFAULTS.iapEnabled),
            annualDefault: bool('flag_annualDefault', DEFAULTS.annualDefault),
            paywallVariant: (map.get('flag_paywallVariant') as Flags['paywallVariant']) || DEFAULTS.paywallVariant,
            trialPaywallDay: Number(map.get('flag_trialPaywallDay')) || DEFAULTS.trialPaywallDay,
        };
    } catch {
        return DEFAULTS;
    }
}
