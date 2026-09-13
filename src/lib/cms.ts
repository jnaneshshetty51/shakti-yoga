import { prisma } from '@/lib/prisma';

export interface AboutPageContent {
    header_title: string;
    header_subtitle: string;
    story_title: string;
    story_p1: string;
    story_p2: string;
    story_p3: string;
    mission_quote: string;
    founder_title: string;
    founder_tagline: string;
    founder_bio_p1: string;
    founder_bio_p2: string;
    founder_bio_p3: string;
}

export interface HomePageContent {
    hero_headline: string;
    hero_subtext: string;
    hero_badge: string;
    target_audience_title: string;
    difference_title: string;
    difference_subtitle: string;
}

export interface CorporatePageContent {
    title: string;
    subtitle: string;
    metric_1_stat: string;
    metric_1_label: string;
    metric_2_stat: string;
    metric_2_label: string;
    metric_3_stat: string;
    metric_3_label: string;
}

export const CMS_DEFAULTS = {
    // About
    about_header_title: "About Shakti Yoga Kendra",
    about_header_subtitle: "A sanctuary for authentic yoga, healing, and self-discovery, bridging sacred Indian wisdom with modern daily living.",
    about_story_title: "Born from Ancient Soil, Guided to the World",
    about_story_p1: "Shakti Yoga Kendra was founded in Udupi, Karnataka — a sacred coastal land known for its centuries of contemplative tradition, temple architecture, and vibrant yogic heritage.",
    about_story_p2: "While modern yoga is often reduced to fast-paced physical acrobatics, we created Shakti Yoga to preserve yoga’s true essence: a holistic discipline unifying the physical sheath (Annamaya), breath energy (Pranamaya), and contemplative mind (Manomaya).",
    about_story_p3: "Today, our teachers broadcast live every day from India to dedicated students, NRIs, and seekers across North America, the UK, Europe, Australia, and the Middle East — cultivating personal connection across continents.",
    about_mission_quote: "To empower seekers worldwide to rediscover their dormant inner vitality (Shakti) through the living science of traditional yoga, bringing balance, healing, and peace to modern life.",
    about_founder_title: "Meet Acharya Swastik",
    about_founder_tagline: "Yoga was not merely a career decision. It completely rewired how I perceive vitality, human suffering, and spiritual freedom.",
    about_founder_bio_p1: "Acharya Swastik’s path to yoga began far from a mat — in the demanding field of engineering. Experiencing firsthand the cognitive strain, physical stagnation, and inner restlessness of modern work, a deeper calling led him to walk away from corporate life and dedicate himself fully to the traditional yogic sciences.",
    about_founder_bio_p2: "He earned his Master of Science (M.Sc.) in Yogic Science from Mangalore University, immersing himself in classical texts, human anatomy, therapeutic yoga protocols, and Sanskrit scriptures.",
    about_founder_bio_p3: "Steeped in the coastal Devi tradition, Acharya Swastik established Shakti Yoga Kendra as a sanctuary where seekers are recognized, corrected, and nurtured through disciplined, compassionate daily sadhana.",

    // Home
    home_hero_headline: "Authentic Yoga & Personalized Therapy, Guided Live from India to the World",
    home_hero_subtext: "Daily live classes across global time zones + dedicated 1:1 clinical yoga therapy.",
    home_hero_badge: "Live from India · Batches for US, UK, Europe & Asia · Direct teacher corrections",
    home_target_audience_title: "Who This Is For",
    home_difference_title: "From Udupi → To the World",
    home_difference_subtitle: "We believe authentic yoga should be accessible beyond borders.",

    // Corporate
    corporate_title: "Corporate Wellness & Leadership Vitality",
    corporate_subtitle: "Traditional yoga science and clinical postural recovery engineered for modern, distributed teams. Boost focus, relieve desk strain, and nurture sustainable vitality.",
    corporate_metric_1_stat: "84%",
    corporate_metric_1_label: "Reported reduction in work-related neck and lower back discomfort within 4 weeks",
    corporate_metric_2_stat: "2.4x",
    corporate_metric_2_label: "Increase in reported afternoon focus and energy post-session",
    corporate_metric_3_stat: "100%",
    corporate_metric_3_label: "Live instruction by certified Indian master teachers with personalized camera feedback",
} as const;

export type CmsKey = keyof typeof CMS_DEFAULTS;

export async function getCmsValues<T extends object>(prefix: string, defaultObj: T): Promise<T> {
    try {
        const rows = await prisma.setting.findMany({
            where: {
                key: { startsWith: `page_${prefix}_` },
            },
        });
        const result: Record<string, string> = { ...(defaultObj as unknown as Record<string, string>) };
        for (const row of rows) {
            const field = row.key.replace(`page_${prefix}_`, '');
            if (field in result) {
                result[field] = row.value;
            }
        }
        return result as unknown as T;
    } catch {
        return defaultObj;
    }
}

export async function getAboutPageContent(): Promise<AboutPageContent> {
    const defaults: AboutPageContent = {
        header_title: CMS_DEFAULTS.about_header_title,
        header_subtitle: CMS_DEFAULTS.about_header_subtitle,
        story_title: CMS_DEFAULTS.about_story_title,
        story_p1: CMS_DEFAULTS.about_story_p1,
        story_p2: CMS_DEFAULTS.about_story_p2,
        story_p3: CMS_DEFAULTS.about_story_p3,
        mission_quote: CMS_DEFAULTS.about_mission_quote,
        founder_title: CMS_DEFAULTS.about_founder_title,
        founder_tagline: CMS_DEFAULTS.about_founder_tagline,
        founder_bio_p1: CMS_DEFAULTS.about_founder_bio_p1,
        founder_bio_p2: CMS_DEFAULTS.about_founder_bio_p2,
        founder_bio_p3: CMS_DEFAULTS.about_founder_bio_p3,
    };
    return getCmsValues('about', defaults);
}

export async function getHomePageContent(): Promise<HomePageContent> {
    const defaults: HomePageContent = {
        hero_headline: CMS_DEFAULTS.home_hero_headline,
        hero_subtext: CMS_DEFAULTS.home_hero_subtext,
        hero_badge: CMS_DEFAULTS.home_hero_badge,
        target_audience_title: CMS_DEFAULTS.home_target_audience_title,
        difference_title: CMS_DEFAULTS.home_difference_title,
        difference_subtitle: CMS_DEFAULTS.home_difference_subtitle,
    };
    return getCmsValues('home', defaults);
}

export async function getCorporatePageContent(): Promise<CorporatePageContent> {
    const defaults: CorporatePageContent = {
        title: CMS_DEFAULTS.corporate_title,
        subtitle: CMS_DEFAULTS.corporate_subtitle,
        metric_1_stat: CMS_DEFAULTS.corporate_metric_1_stat,
        metric_1_label: CMS_DEFAULTS.corporate_metric_1_label,
        metric_2_stat: CMS_DEFAULTS.corporate_metric_2_stat,
        metric_2_label: CMS_DEFAULTS.corporate_metric_2_label,
        metric_3_stat: CMS_DEFAULTS.corporate_metric_3_stat,
        metric_3_label: CMS_DEFAULTS.corporate_metric_3_label,
    };
    return getCmsValues('corporate', defaults);
}

export async function saveCmsValues(prefix: string, data: Record<string, string>): Promise<void> {
    const entries = Object.entries(data);
    await prisma.$transaction(
        entries.map(([field, value]) =>
            prisma.setting.upsert({
                where: { key: `page_${prefix}_${field}` },
                create: { key: `page_${prefix}_${field}`, value: String(value ?? '') },
                update: { value: String(value ?? '') },
            })
        )
    );
}
