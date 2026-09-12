"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

interface Retreat {
    id: string;
    kind: "RETREAT" | "WORKSHOP" | "EVENT";
    name: string;
    location: string | null;
    startDate: string;
    endDate: string;
    description: string | null;
    price: number | null;
    currency: string;
}

const KIND_LABEL: Record<string, string> = { RETREAT: "Retreat", WORKSHOP: "Workshop", EVENT: "Event" };

function dateRange(start: string, end: string) {
    const s = new Date(start), e = new Date(end);
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
    return s.toDateString() === e.toDateString()
        ? s.toLocaleDateString("en-IN", opts)
        : `${s.toLocaleDateString("en-IN", opts)} – ${e.toLocaleDateString("en-IN", opts)}`;
}

const FEATURED_COHORTS = [
    {
        tag: "In-Person Immersion",
        title: "Rishikesh Himalayan Sadhana Retreat",
        location: "Rishikesh, Uttarakhand, India",
        season: "Upcoming Cohort · October 2026",
        image: "/workshops/retreat.webp",
        highlights: [
            "Dawn meditation & Ganga Aarti reflections",
            "Advanced Pranayama & Kriya Sadhana with Acharya Swastik",
            "Silent contemplative mountain walks & Ayurvedic meals",
            "Intimate cohort limited to 14 participants",
        ],
        badge: "Open for Applications",
    },
    {
        tag: "Coastal Immersion",
        title: "Udupi Prana & Spine Restoration Retreat",
        location: "Doddangudde Sanctuary, Udupi, Karnataka",
        season: "Upcoming Cohort · December 2026",
        image: "/workshops/workshop.webp",
        highlights: [
            "1:1 structural alignment & therapeutic spine decompression",
            "Authentic South Indian Sattvic culinary workshop",
            "Daily Temple & coastal morning walking meditations",
            "Personalised post-retreat recovery blueprint",
        ],
        badge: "Early Access Waitlist",
    },
];

const DAILY_RHYTHM = [
    { time: "06:00 AM", title: "Brahma Muhurta Pranayama & Japa", desc: "Awaken with silent breath awareness, cleansing kriyas, and centering." },
    { time: "07:30 AM", title: "Traditional Hatha & Dynamic Flow", desc: "Two hours of mindful asana practice with hands-on anatomical alignment." },
    { time: "10:30 AM", title: "Mindful Sattvic Brunch", desc: "Nourishing, fresh, farm-to-table Ayurvedic nourishment." },
    { time: "02:00 PM", title: "Yogic Philosophy & Self-Inquiry", desc: "Discourses on Patanjali's Yoga Sutras and the Devi meditative lineage." },
    { time: "05:00 PM", title: "Sunset Restorative & Yoga Nidra", desc: "Gentle restorative holds, sound frequency attunement, and deep nervous system reset." },
    { time: "07:30 PM", title: "Evening Satsang & Gentle Reflection", desc: "Q&A with teachers, community sharing, and mindful silence until morning." },
];

export default function RetreatsPage() {
    const [retreats, setRetreats] = useState<Retreat[] | null>(null);
    const [waitlistStatus, setWaitlistStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        interest: "Rishikesh Himalayan Sadhana",
        message: "",
    });

    useEffect(() => {
        fetch("/api/retreats")
            .then((r) => r.json())
            .then((d) => setRetreats(d.retreats || []))
            .catch(() => setRetreats([]));
    }, []);

    const handleWaitlistSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setWaitlistStatus("submitting");
        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    subject: `Retreat Inquiry: ${formData.interest}`,
                    message: `Phone: ${formData.phone || "Not provided"}\nInterest: ${formData.interest}\nNotes: ${formData.message}`,
                }),
            });
            if (!res.ok) throw new Error("Submission failed");
            setWaitlistStatus("success");
        } catch {
            setWaitlistStatus("error");
        }
    };

    return (
        <main className="bg-background min-h-screen">
            <PageHeader
                title="Workshops & Sanctuary Retreats"
                subtitle="Immerse yourself beyond weekly screens. Deepen your sadhana, master therapeutic alignment, and reconnect with your essence in sacred landscapes."
            />

            {/* Scheduled Database Retreats (if any are actively booked) */}
            {retreats && retreats.length > 0 && (
                <section className="py-12 px-4 sm:px-8 max-w-6xl mx-auto">
                    <h2 className="font-serif text-2xl sm:text-3xl text-primary mb-6">Upcoming Scheduled Bookings</h2>
                    <div className="grid sm:grid-cols-2 gap-6">
                        {retreats.map((r) => (
                            <Link
                                key={r.id}
                                href={`/retreats/${r.id}`}
                                className="block bg-white border border-primary/10 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow"
                            >
                                <span className="text-xs font-bold uppercase tracking-widest text-secondary">{KIND_LABEL[r.kind]}</span>
                                <h3 className="font-serif text-2xl text-text mt-2">{r.name}</h3>
                                <p className="text-sm text-text/60 mt-1">{dateRange(r.startDate, r.endDate)}</p>
                                {r.location && <p className="text-sm text-text/70 mt-1">📍 {r.location}</p>}
                                {r.price != null && (
                                    <p className="text-base font-bold text-primary mt-4">
                                        {r.currency === "USD" ? "$" : "₹"}{r.price.toLocaleString("en-IN")}
                                    </p>
                                )}
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Flagship Immersion Showcases */}
            <section className="py-16 sm:py-20 px-4 sm:px-8 max-w-6xl mx-auto">
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <span className="text-secondary text-xs font-bold uppercase tracking-widest block mb-2">Signature Gatherings</span>
                    <h2 className="font-serif text-3xl sm:text-4xl text-primary">In-Person Sadhana Immersions</h2>
                    <p className="text-text/70 text-sm sm:text-base mt-3">
                        Curated residential retreats led by Acharya Swastik and senior teachers in India’s most spiritually resonant sanctuaries.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8 sm:gap-10">
                    {FEATURED_COHORTS.map((cohort, index) => (
                        <div key={index} className="bg-white rounded-3xl overflow-hidden border border-primary/10 shadow-sm hover:shadow-md transition-all flex flex-col">
                            <div className="relative h-64 sm:h-72 w-full">
                                <Image
                                    src={cohort.image}
                                    alt={cohort.title}
                                    fill
                                    className="object-cover"
                                    sizes="(min-width: 1024px) 50vw, 100vw"
                                />
                                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-secondary shadow-sm">
                                    {cohort.tag}
                                </div>
                                <div className="absolute bottom-4 right-4 bg-black/65 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium">
                                    {cohort.badge}
                                </div>
                            </div>
                            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                                <div>
                                    <p className="text-xs font-bold text-secondary uppercase tracking-widest">{cohort.season}</p>
                                    <h3 className="font-serif text-2xl text-primary mt-1 mb-2">{cohort.title}</h3>
                                    <p className="text-xs text-text/60 mb-5 flex items-center gap-1.5">
                                        <span>📍</span> {cohort.location}
                                    </p>
                                    <ul className="space-y-2.5 mb-6 text-sm text-text/80 font-sans">
                                        {cohort.highlights.map((h, i) => (
                                            <li key={i} className="flex items-start gap-2.5">
                                                <span className="text-secondary mt-0.5">✦</span>
                                                <span>{h}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <a
                                    href="#inquiry-form"
                                    onClick={() => setFormData((prev) => ({ ...prev, interest: cohort.title }))}
                                    className="block w-full py-3 bg-primary text-white text-center font-sans text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-secondary transition-colors"
                                >
                                    Apply for Next Cohort →
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Daily Rhythm Section */}
            <section className="py-16 sm:py-20 px-4 sm:px-8 bg-accent/30">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <span className="text-secondary text-xs font-bold uppercase tracking-widest block mb-2">The Sanctuary Flow</span>
                        <h2 className="font-serif text-3xl text-primary">A Day in the Retreat Sadhana</h2>
                        <p className="text-text/70 text-sm mt-2">
                            Structured intentionally to harmonize biological rhythms with ancient yogic science.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {DAILY_RHYTHM.map((item, idx) => (
                            <div key={idx} className="bg-white p-5 sm:p-6 rounded-2xl border border-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                                <div className="flex items-center gap-4 sm:w-1/3">
                                    <span className="font-mono text-xs font-bold text-secondary bg-secondary/10 px-2.5 py-1 rounded-full">
                                        {item.time}
                                    </span>
                                    <h4 className="font-serif font-bold text-base text-text">{item.title}</h4>
                                </div>
                                <p className="text-xs sm:text-sm text-text/70 sm:w-2/3 font-sans leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* What's Included */}
            <section className="py-16 sm:py-20 px-4 sm:px-8 max-w-5xl mx-auto">
                <h2 className="font-serif text-3xl text-primary text-center mb-10">Everything Thoughtfully Provided</h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {[
                        { icon: "🏡", title: "Sacred Accommodations", desc: "Private and twin-share eco-luxury rooms surrounded by tranquil natural landscapes." },
                        { icon: "🥗", title: "Ayurvedic Sattvic Cuisine", desc: "Three daily organic meals customized to balance Pitta, Vata, and Kapha doshas." },
                        { icon: "🧘", title: "All Mats & Props Provided", desc: "Handcrafted cotton mats, cork blocks, straps, and meditation bolsters ready for you." },
                        { icon: "🌿", title: "Personal Health Consultation", desc: "Comprehensive 1:1 nadi pariksha (pulse) and spine assessment with Acharya Swastik." },
                        { icon: "🌊", title: "Sacred Excursions", desc: "Private sunrise boat ceremonies on the holy river and serene quiet forest walks." },
                        { icon: "🤝", title: "Lifelong Alumni Circle", desc: "Join our dedicated alumni WhatsApp sangha for continuing guidance post-retreat." },
                    ].map((inc, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm">
                            <span className="text-3xl block mb-3">{inc.icon}</span>
                            <h3 className="font-serif text-lg font-bold text-text mb-1">{inc.title}</h3>
                            <p className="text-xs text-text/70 leading-relaxed font-sans">{inc.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Waitlist & Cohort Inquiry Form */}
            <section id="inquiry-form" className="py-16 sm:py-24 px-4 sm:px-8 bg-stone-900 text-white scroll-mt-20">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-10">
                        <span className="text-secondary text-xs font-bold uppercase tracking-widest block mb-2">Priority Registration</span>
                        <h2 className="font-serif text-3xl sm:text-4xl text-white">Join the Retreat Waitlist</h2>
                        <p className="text-white/70 text-sm mt-3">
                            Cohorts are deliberately capped at 14 practitioners to preserve deep personal mentorship. Let us know your interest to receive first access to dates and bookings.
                        </p>
                    </div>

                    {waitlistStatus === "success" ? (
                        <div className="bg-white/10 border border-secondary/40 p-8 rounded-3xl text-center space-y-3">
                            <span className="text-4xl block">🙏</span>
                            <h3 className="font-serif text-2xl text-white">Thank You, Seeker</h3>
                            <p className="text-white/80 text-sm">
                                Your application has been received. Our retreat coordinator will be in touch with detailed brochure materials, dates, and preliminary interview scheduling.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleWaitlistSubmit} className="bg-white/5 border border-white/10 p-6 sm:p-8 rounded-3xl space-y-4 backdrop-blur-sm">
                            {waitlistStatus === "error" && (
                                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-xs">
                                    Something went wrong sending your request. Please email us directly at contactus@shaktiyoga.in
                                </div>
                            )}

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Your Name"
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-secondary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="name@email.com"
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-secondary"
                                    />
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">Phone / WhatsApp (optional)</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+1 / +44 / +91 ..."
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-secondary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">Preferred Immersion</label>
                                    <select
                                        value={formData.interest}
                                        onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-white/20 text-white text-sm focus:outline-none focus:border-secondary"
                                    >
                                        <option value="Rishikesh Himalayan Sadhana">Rishikesh Himalayan Sadhana (October 2026)</option>
                                        <option value="Udupi Prana & Spine Restoration">Udupi Prana &amp; Spine Restoration (December 2026)</option>
                                        <option value="Online Weekend Intensives">Online Weekend Intensives</option>
                                        <option value="Either / Any Upcoming Cohort">Either / Any Upcoming Cohort</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">Your Practice Background &amp; Intentions</label>
                                <textarea
                                    rows={3}
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    placeholder="Tell us a little about your practice experience and what you hope to experience during this immersion..."
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-secondary"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={waitlistStatus === "submitting"}
                                className="w-full py-3.5 bg-secondary text-white font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-primary transition-colors disabled:opacity-50 shadow-lg"
                            >
                                {waitlistStatus === "submitting" ? "Sending Request…" : "Register Interest for Next Cohort →"}
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
}
