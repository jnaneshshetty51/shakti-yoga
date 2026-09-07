import { prisma } from '@/lib/prisma';

/**
 * Runtime feature flags / experiment config. Backed by `Setting` rows so the
 * team can flip them from /admin/settings without a deploy.
 */

export interface Flags {
    /** Show in-app purchases where the native SDK is available (else web checkout). */
    iapEnabled: boolean;
    /** Paywall preselects the annual toggle. */
    annualDefault: boolean;
    /** Show the Starter tier on the paywall. */
    showStarter: boolean;
    /** Show the Family plan on the paywall. */
    showFamily: boolean;
    /** Day of the trial the app hard-gates behind the paywall. */
    trialPaywallDay: number;
}

const DEFAULTS: Flags = {
    iapEnabled: true,
    annualDefault: true,
    showStarter: true,
    showFamily: true,
    trialPaywallDay: 6,
};

export const FLAG_KEYS = [
    'flag_iapEnabled',
    'flag_annualDefault',
    'flag_showStarter',
    'flag_showFamily',
    'flag_trialPaywallDay',
] as const;

export async function getFlags(): Promise<Flags> {
    try {
        const rows = await prisma.setting.findMany({ where: { key: { in: [...FLAG_KEYS] } } });
        const map = new Map(rows.map((r) => [r.key, r.value]));
        const bool = (k: string, d: boolean) => {
            const v = map.get(k);
            return v == null ? d : v === 'true';
        };
        return {
            iapEnabled: bool('flag_iapEnabled', DEFAULTS.iapEnabled),
            annualDefault: bool('flag_annualDefault', DEFAULTS.annualDefault),
            showStarter: bool('flag_showStarter', DEFAULTS.showStarter),
            showFamily: bool('flag_showFamily', DEFAULTS.showFamily),
            trialPaywallDay: Number(map.get('flag_trialPaywallDay')) || DEFAULTS.trialPaywallDay,
        };
    } catch {
        return DEFAULTS;
    }
}
