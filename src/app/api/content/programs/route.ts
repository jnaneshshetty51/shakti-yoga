import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Fallback programs for when DB is unavailable
const FALLBACK_PROGRAMS = [
    {
        id: 'fallback-1',
        title: "Yoga for General Wellness",
        subtitle: "Thematic Weekly Practice",
        description: "Achieve holistic well-being with our structured theme-based yoga modules, practiced from Monday to Friday. This program ensures a balanced approach by systematically focusing on different aspects of the body and mind throughout the week.",
        weeklySessions: [
            { day: "Monday", name: "Basic Hatha Yoga", detail: "Gentle yet powerful classical yoga to improve flexibility, alignment, and breath awareness." },
            { day: "Tuesday", name: "Upper Body & Balance", detail: "Strengthen the shoulders, arms, and back while enhancing stability and coordination." },
            { day: "Wednesday", name: "Core & Strength", detail: "Build core strength and overall endurance with dynamic asanas and targeted sequences." },
            { day: "Thursday", name: "Detox & Cleansing", detail: "Purify the body with kriyas, twists, and pranayama (breathwork) for internal cleansing." },
            { day: "Friday", name: "Yoga for Self-Love", detail: "A restorative session with deep relaxation, meditation, and self-care practices to nourish the mind and soul." },
        ],
        featured: true,
        price: 4900
    },
    {
        id: 'fallback-2',
        title: "Yoga Chikitsa",
        subtitle: "Yoga Therapy",
        description: "A holistic approach to managing and healing lifestyle disorders through yoga. Our therapy sessions help in maintaining and curing:",
        conditions: [
            "Obesity, Stress, Diabetes, and Insomnia",
            "Back/Neck Pain & Musculoskeletal Disorders",
            "Asthma & Other Respiratory Issues",
            "Digestive Disorders & Poor Cognition",
            "Cardiovascular Disorders & Thyroid Problems",
            "Menstrual Disorders & Hormonal Imbalance",
        ],
        featured: false,
        price: 9900
    },
    {
        id: 'fallback-3',
        title: "Pre & Post Natal Yoga",
        subtitle: "For Expecting and New Mothers",
        description: "A nurturing and supportive yoga program specially designed for expecting and new mothers. Our sessions focus on enhancing physical comfort, emotional well-being, breath awareness, and relaxation during and after pregnancy.",
        sessions: [
            { name: "Prenatal Yoga", detail: "Gentle asanas, pranayama (breathwork), and relaxation techniques to support a healthy and comfortable pregnancy journey." },
            { name: "Postnatal Yoga", detail: "Safe recovery practices to rebuild strength, improve posture, restore core stability, and promote emotional balance after childbirth." },
            { name: "Garbhasamskara", detail: "Meditation and mindfulness practices to cultivate calmness, confidence, and inner connection during motherhood." },
        ],
        featured: false,
        price: 7500
    },
    {
        id: 'fallback-4',
        title: "Deha Shodhana",
        subtitle: "Detoxification",
        description: "Toxins disrupt the body's natural balance. Our specialized Kriya-based cleansing techniques help eliminate impurities, restoring organ function and promoting overall vitality. Experience deep purification and immediate relief through this powerful detox program.",
        featured: false,
        price: 3000
    },
    {
        id: 'fallback-5',
        title: "Chandrayana Vrata",
        subtitle: "Tool for Karma & Deha Shuddhi",
        description: "A 30-day transformative journey that aligns food consumption with the moon's cycle. This unique method regulates metabolism, corrects BMI, and aids in mindful eating, supporting both physical and karmic purification.",
        featured: false,
        price: 5000
    },
    {
        id: 'fallback-6',
        title: "Mitashana",
        subtitle: "Dietary Management",
        description: "Nutrition plays a crucial role in holistic wellness. Our customized dietary programs are designed based on individual body types and preferences, making weight management and overall well-being effortless.",
        featured: false,
        price: 4000
    },
    {
        id: 'fallback-7',
        title: "Chittakshamata",
        subtitle: "Yoga for Stress Management",
        description: "Our meticulously crafted modules help individuals overcome all forms of stress—be it mental, emotional, or physical. This program strengthens the mind, enhancing focus, resilience, and inner stability.",
        featured: false,
        price: 4500
    },
    {
        id: 'fallback-8',
        title: "Antaranga Yoga",
        subtitle: "Meditation Classes",
        description: "True stability begins within. Our dedicated meditation rooms and guided meditation programs offer deep relaxation, improved concentration, and a profound sense of inner peace. Experience self-transformation through structured meditative practices.",
        featured: false,
        price: 3500
    }
];

export async function GET() {
    try {
        const programs = await prisma.program.findMany({
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'asc' }
        });

        if (programs.length === 0) {
            return NextResponse.json(FALLBACK_PROGRAMS);
        }

        // Transform database programs to match the expected format
        const formattedPrograms = programs.map(p => ({
            id: p.id,
            title: p.title,
            subtitle: p.title, // Use title as subtitle if not available
            description: p.description,
            duration: p.duration,
            level: p.level,
            price: p.price,
            thumbnail: p.thumbnail,
            enrolledCount: p.enrolledCount,
            featured: p.enrolledCount > 0 // Use enrolled count as indicator
        }));

        return NextResponse.json(formattedPrograms);
    } catch (error) {
        console.error('Error fetching programs:', error);
        return NextResponse.json(FALLBACK_PROGRAMS);
    }
}