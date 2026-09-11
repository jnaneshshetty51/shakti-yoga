import { prisma } from '@/lib/prisma';

const DEFAULTS = {
    referral_referrer_reward: '500', // ₹ credited to the referrer on a qualifying payment
    referral_referee_discount: '250', // ₹ off the referee's first qualifying payment
    referral_validity_days: '90', // referral lapses (no reward) if unconverted after this many days
    social_instagram_url: '',
    social_youtube_url: '',
    social_facebook_url: '',
    social_whatsapp_url: 'https://wa.me/917760222478', // matches the site's previous hardcoded link
} as const;

export type SettingKey = keyof typeof DEFAULTS;

export async function getSetting(key: SettingKey): Promise<string> {
    const row = await prisma.setting.findUnique({ where: { key } });
    return row?.value ?? DEFAULTS[key];
}

export async function getSettingNumber(key: SettingKey): Promise<number> {
    const raw = Number(await getSetting(key));
    return Number.isFinite(raw) ? raw : Number(DEFAULTS[key]);
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export interface ReferralSettings {
    referrerReward: number;
    refereeDiscount: number;
    validityDays: number;
}

export async function getReferralSettings(): Promise<ReferralSettings> {
    const [referrerReward, refereeDiscount, validityDays] = await Promise.all([
        getSettingNumber('referral_referrer_reward'),
        getSettingNumber('referral_referee_discount'),
        getSettingNumber('referral_validity_days'),
    ]);
    return { referrerReward, refereeDiscount, validityDays };
}

export interface SocialLinks {
    instagram: string;
    youtube: string;
    facebook: string;
    whatsapp: string;
}

export async function getSocialLinks(): Promise<SocialLinks> {
    const [instagram, youtube, facebook, whatsapp] = await Promise.all([
        getSetting('social_instagram_url'),
        getSetting('social_youtube_url'),
        getSetting('social_facebook_url'),
        getSetting('social_whatsapp_url'),
    ]);
    return { instagram, youtube, facebook, whatsapp };
}
