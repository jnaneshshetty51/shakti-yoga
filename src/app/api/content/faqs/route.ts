import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Fallback FAQs for when DB is unavailable
const FALLBACK_FAQS = [
    {
        id: 'fallback-1',
        question: "What time zones do you support?",
        answer: "We have batches running from 6:00 AM to 10:15 PM IST, which covers most global time zones including US, UK, Europe, and Australia."
    },
    {
        id: 'fallback-2',
        question: "Do I need prior experience?",
        answer: "Not at all. Our Everyday Yoga classes are beginner-friendly, and our 1:1 Therapy is completely personalized to your level."
    },
    {
        id: 'fallback-3',
        question: "What if I miss a live class?",
        answer: "We provide recordings of the sessions so you can practice at your own convenience if you miss a live slot."
    },
    {
        id: 'fallback-4',
        question: "How does the payment work?",
        answer: "We accept international payments via Stripe/PayPal. You are billed monthly and can cancel anytime."
    }
];

export async function GET() {
    try {
        const faqs = await prisma.fAQ.findMany({
            where: { status: 'PUBLISHED' },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
        });

        return NextResponse.json(faqs.length > 0 ? faqs : FALLBACK_FAQS);
    } catch (error) {
        console.error('Error fetching FAQs:', error);
        return NextResponse.json(FALLBACK_FAQS);
    }
}