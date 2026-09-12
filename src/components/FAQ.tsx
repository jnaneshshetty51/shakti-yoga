import { prisma } from "@/lib/prisma";

interface FaqItem {
    question: string;
    answer: string;
}

// Shown only if no published FAQs exist in the DB yet.
const FALLBACK: FaqItem[] = [
    {
        question: "What time zones do you support?",
        answer: "We have batches running from 6:00 AM to 10:15 PM IST, which covers most global time zones including US, UK, Europe, and Australia."
    },
    {
        question: "Do I need prior experience?",
        answer: "Not at all. Our Everyday Yoga classes are beginner-friendly, and our 1:1 Therapy is completely personalized to your level."
    },
    {
        question: "What if I miss a live class?",
        answer: "We provide recordings of the sessions so you can practice at your own convenience if you miss a live slot."
    },
    {
        question: "How does payment work?",
        answer: "We accept all major international credit/debit cards (Visa, Mastercard, American Express), UPI, and net banking via our secure Razorpay gateway. Pricing is automatically localized in ₹ for India and $ for international practitioners. You can cancel your subscription anytime with zero lock-in."
    }
];

async function getFaqs(): Promise<FaqItem[]> {
    try {
        const rows = await prisma.fAQ.findMany({
            where: { status: "PUBLISHED" },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: { question: true, answer: true },
        });
        return rows.length > 0 ? rows : FALLBACK;
    } catch {
        return FALLBACK;
    }
}

export default async function FAQ() {
    const faqs = await getFaqs();

    return (
        <section className="py-12 sm:py-20 px-4 sm:px-8 bg-background">
            <div className="max-w-3xl mx-auto">
                <h2 className="font-serif text-3xl md:text-4xl text-primary text-center mb-8 sm:mb-12">Frequently Asked Questions</h2>

                <div className="space-y-4 sm:space-y-6">
                    {faqs.map((faq, index) => (
                        <div key={index} className="border-b border-primary/10 pb-4 sm:pb-6">
                            <h3 className="font-serif text-base sm:text-lg text-text font-bold mb-2">{faq.question}</h3>
                            <p className="font-sans text-xs sm:text-sm text-text/70 leading-relaxed">{faq.answer}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
