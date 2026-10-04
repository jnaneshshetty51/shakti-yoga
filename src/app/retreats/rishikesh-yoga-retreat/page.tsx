import type { Metadata } from "next";
import RishikeshRetreatClient from "@/components/retreats/RishikeshRetreatClient";

export const metadata: Metadata = {
    title: "7-Day Rishikesh Yoga & Wellness Retreat in India | Shakti Yoga Kendra",
    description: "Come back to yourself. A 7-day luxury yoga, meditation & Himalayan wellness retreat in Rishikesh, India for NRIs & international travellers. Small groups, boutique stay, Ganga aarti, and Kunjapuri sunrise.",
    keywords: [
        "Rishikesh Yoga Retreat",
        "7 day yoga retreat India",
        "Rishikesh yoga retreat for foreigners",
        "yoga retreat in India for beginners",
        "India wellness retreat",
        "yoga retreat for NRIs",
        "Rishikesh meditation retreat",
        "yoga and meditation retreat India",
        "spiritual retreat Rishikesh",
        "Himalayan yoga retreat",
        "yoga holiday India",
        "wellness retreat India",
        "yoga retreat with Ganga experience"
    ],
    alternates: {
        canonical: "/retreats/rishikesh-yoga-retreat",
    },
    openGraph: {
        title: "7-Day Rishikesh Yoga & Wellness Retreat | Shakti Yoga Kendra",
        description: "Wake up to the Himalayas. Practice beside the sacred Ganga. Eat nourishing Indian food. A 7-day curated retreat for international travellers and NRIs.",
        url: "/retreats/rishikesh-yoga-retreat",
        type: "website",
        images: [
            {
                url: "/retreats/rishikesh/hero.jpg",
                width: 1200,
                height: 675,
                alt: "7-Day Rishikesh Yoga & Wellness Retreat over the Ganga",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "7-Day Rishikesh Yoga & Wellness Retreat | Shakti Yoga Kendra",
        description: "7 Days in Rishikesh — Yoga, Ganga, Himalayan Nature & Inner Reset for international travellers & NRIs.",
        images: ["/retreats/rishikesh/hero.jpg"],
    },
};

export default function RishikeshYogaRetreatPage() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": "7-Day Rishikesh Yoga & Wellness Retreat",
        "description": "A 7-day premium yoga, meditation, and Himalayan reset experience in Rishikesh, India by Shakti Yoga Kendra.",
        "image": "https://shaktiyoga.in/retreats/rishikesh/hero.jpg",
        "startDate": "2026-03-15T08:00:00+05:30",
        "endDate": "2026-03-21T12:00:00+05:30",
        "eventStatus": "https://schema.org/EventScheduled",
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "location": {
            "@type": "Place",
            "name": "Shakti Yoga Kendra Retreat Sanctuary",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": "Rishikesh",
                "addressRegion": "Uttarakhand",
                "addressCountry": "IN"
            }
        },
        "organizer": {
            "@type": "Organization",
            "name": "Shakti Yoga Kendra",
            "url": "https://shaktiyoga.in"
        },
        "performer": {
            "@type": "Person",
            "name": "Acharya Swastik",
            "jobTitle": "Founder & Lead Teacher"
        },
        "offers": [
            {
                "@type": "Offer",
                "name": "Twin Sharing Room (Early Bird)",
                "price": "75000",
                "priceCurrency": "INR",
                "availability": "https://schema.org/InStock",
                "validFrom": "2026-01-01"
            },
            {
                "@type": "Offer",
                "name": "Private Deluxe Room (Early Bird)",
                "price": "95000",
                "priceCurrency": "INR",
                "availability": "https://schema.org/InStock",
                "validFrom": "2026-01-01"
            }
        ]
    };

    return (
        <main>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <RishikeshRetreatClient />
        </main>
    );
}
