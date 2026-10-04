"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    LuCalendar,
    LuClock,
    LuUsers,
    LuMapPin,
    LuCheck,
    LuX,
    LuSparkles,
    LuArrowRight,
    LuHeart,
    LuCompass,
    LuSun,
    LuShieldCheck,
    LuChevronDown,
    LuPlane,
    LuDownload,
    LuMessageCircle,
    LuBookOpen,
    LuCoffee,
    LuMoon,
    LuActivity,
    LuAward
} from "react-icons/lu";
import RishikeshBookingModal from "./RishikeshBookingModal";
import RishikeshGuideModal from "./RishikeshGuideModal";

export default function RishikeshRetreatClient() {
    const [currency, setCurrency] = useState<"INR" | "USD">("USD");
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState("Private Room");
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    const openBooking = (room = "Private Room") => {
        setSelectedRoom(room);
        setIsBookingOpen(true);
    };

    const toggleFaq = (index: number) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    return (
        <div className="bg-[#FAF9F5] text-text font-sans antialiased selection:bg-secondary/20 selection:text-primary">
            
            {/* 26. Dedicated Retreat Sticky Sub-Navigation */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 transition-all shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/retreats/rishikesh-yoga-retreat" className="font-serif font-bold text-primary tracking-wide text-sm sm:text-base flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-secondary"></span>
                            The Rishikesh Reset
                        </Link>
                        <nav className="hidden lg:flex items-center gap-5 text-xs uppercase tracking-widest text-text/70 font-semibold">
                            <a href="#experience" className="hover:text-secondary transition-colors">The Experience</a>
                            <a href="#journey" className="hover:text-secondary transition-colors">7-Day Journey</a>
                            <a href="#yoga" className="hover:text-secondary transition-colors">Yoga</a>
                            <a href="#stay" className="hover:text-secondary transition-colors">Stay</a>
                            <a href="#rishikesh" className="hover:text-secondary transition-colors">Rishikesh</a>
                            <a href="#pricing" className="hover:text-secondary transition-colors">Pricing</a>
                            <a href="#faqs" className="hover:text-secondary transition-colors">FAQs</a>
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Currency Switcher */}
                        <div className="flex items-center bg-gray-100 rounded-full p-0.5 border border-gray-200 text-[11px] font-bold">
                            <button
                                onClick={() => setCurrency("USD")}
                                className={`px-2.5 py-1 rounded-full transition-all ${
                                    currency === "USD" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-800"
                                }`}
                            >
                                USD ($)
                            </button>
                            <button
                                onClick={() => setCurrency("INR")}
                                className={`px-2.5 py-1 rounded-full transition-all ${
                                    currency === "INR" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-800"
                                }`}
                            >
                                INR (₹)
                            </button>
                        </div>

                        <button
                            onClick={() => openBooking("Private Room")}
                            className="px-4 py-2 bg-secondary text-white text-xs font-bold uppercase tracking-wider rounded-full hover:bg-primary transition-colors shadow-sm"
                        >
                            Reserve Your Place
                        </button>
                    </div>
                </div>
            </div>

            {/* 1. HERO SECTION */}
            <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/retreats/rishikesh/hero.jpg"
                        alt="Cinematic morning sunrise over Ganga in Rishikesh"
                        fill
                        priority
                        className="object-cover object-center scale-105 filter brightness-[0.78]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/50" />
                </div>

                <div className="relative z-10 max-w-4xl mx-auto px-4 py-20 text-center text-white space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[11px] font-bold uppercase tracking-widest text-[#F4D7B5] animate-fadeIn">
                        <LuSparkles className="w-3.5 h-3.5" /> SHAKTI YOGA KENDRA PRESENTS
                    </div>

                    <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.1] text-balance">
                        Come Back to Yourself.
                    </h1>

                    <p className="font-serif text-lg sm:text-2xl text-[#E8E2D6] font-light italic">
                        A 7-Day Yoga &amp; Wellness Retreat in Rishikesh, India
                    </p>

                    <div className="max-w-2xl mx-auto text-sm sm:text-base text-white/90 leading-relaxed space-y-2 pt-2">
                        <p className="font-medium tracking-wide">
                            Wake up to the Himalayas. Practice beside the sacred Ganga.<br className="hidden sm:inline" />
                            Eat nourishing Indian food. Slow down. Breathe. Move. Reflect.
                        </p>
                        <p className="text-white/75 text-xs sm:text-sm pt-1">
                            A thoughtfully curated retreat for NRIs and international travellers looking for more than a holiday.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                        <button
                            onClick={() => openBooking("Private Room")}
                            className="w-full sm:w-auto px-8 py-4 bg-secondary text-white font-bold uppercase tracking-widest text-xs rounded-full hover:bg-white hover:text-primary transition-all shadow-xl hover:scale-105 active:scale-95"
                        >
                            Reserve Your Place
                        </button>
                        <a
                            href="#journey"
                            className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold uppercase tracking-widest text-xs rounded-full transition-all flex items-center justify-center gap-2"
                        >
                            Explore the 7-Day Journey ↓
                        </a>
                    </div>
                </div>
            </section>

            {/* 2. QUICK RETREAT BAR */}
            <section className="bg-primary text-white py-6 border-b border-primary/20 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 text-xs sm:text-sm font-medium tracking-wide text-white/90">
                        <span className="flex items-center gap-1.5"><LuCalendar className="text-secondary" /> 7 Days / 6 Nights</span>
                        <span className="hidden sm:inline text-white/40">•</span>
                        <span className="flex items-center gap-1.5"><LuMapPin className="text-secondary" /> Rishikesh, India</span>
                        <span className="hidden sm:inline text-white/40">•</span>
                        <span className="flex items-center gap-1.5"><LuUsers className="text-secondary" /> Small Group (10–14 Guests)</span>
                        <span className="hidden sm:inline text-white/40">•</span>
                        <span className="flex items-center gap-1.5"><LuSparkles className="text-secondary" /> Yoga + Meditation + Culture + Nature</span>
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/30 border border-secondary/40 text-xs font-bold uppercase tracking-wider text-[#F7E1C8]">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Limited Places Per Cohort
                    </div>
                </div>
            </section>

            {/* 3. “THIS IS NOT JUST A YOGA CLASS” */}
            <section id="experience" className="py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
                <div className="max-w-3xl mx-auto text-center space-y-6">
                    <span className="text-secondary uppercase tracking-widest text-xs font-bold block">Intentional Immersion</span>
                    <h2 className="font-serif text-3xl sm:text-5xl text-gray-900 leading-tight">
                        This Is Not Just a Yoga Class.
                    </h2>
                    <div className="space-y-4 text-text/80 text-base sm:text-lg leading-relaxed font-light">
                        <p>You didn&apos;t travel all the way to India just to attend another yoga class.</p>
                        <p className="font-serif text-xl sm:text-2xl text-primary italic">You came to experience India.</p>
                        <p>
                            To wake up slower. To hear the Ganga before checking your phone. To move your body. To sit quietly. To eat real food. To explore. To reconnect with yourself. And to return home feeling completely different.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
                    <div className="bg-white rounded-3xl p-8 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                            <LuActivity />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-secondary mb-2 block">Pillar 01</span>
                        <h3 className="font-serif text-2xl font-bold text-gray-900 mb-3">MOVE</h3>
                        <p className="text-text/75 text-sm leading-relaxed">
                            Daily traditional Hatha and dynamic flow designed for different experience levels. We focus on anatomical alignment, functional mobility, and mindful body awareness.
                        </p>
                    </div>

                    <div className="bg-white rounded-3xl p-8 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="w-12 h-12 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center text-xl font-bold mb-6 group-hover:bg-secondary group-hover:text-white transition-colors">
                            <LuHeart />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-secondary mb-2 block">Pillar 02</span>
                        <h3 className="font-serif text-2xl font-bold text-gray-900 mb-3">RESTORE</h3>
                        <p className="text-text/75 text-sm leading-relaxed">
                            Deep meditation, traditional pranayama breathwork, Yoga Nidra nervous-system regulation, and generous intentional downtime without the rush of packed tour itineraries.
                        </p>
                    </div>

                    <div className="bg-white rounded-3xl p-8 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                            <LuCompass />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-secondary mb-2 block">Pillar 03</span>
                        <h3 className="font-serif text-2xl font-bold text-gray-900 mb-3">EXPERIENCE</h3>
                        <p className="text-text/75 text-sm leading-relaxed">
                            Sunset Ganga Aarti at Triveni Ghat, historic mountain ashrams, Himalayan sunrise viewpoints, pure Sattvic Indian culinary arts, and intimate local cultural immersion.
                        </p>
                    </div>
                </div>
            </section>

            {/* 4. WHY RISHIKESH? */}
            <section id="rishikesh" className="py-24 bg-white border-y border-gray-200/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-5 space-y-6">
                            <span className="text-secondary uppercase tracking-widest text-xs font-bold block">The Yoga Capital of the World</span>
                            <h2 className="font-serif text-3xl sm:text-5xl text-gray-900 leading-tight">
                                There Are Many Places to Practice Yoga.<br />
                                <span className="text-primary italic">There is only one Rishikesh.</span>
                            </h2>
                            <p className="text-text/80 text-sm sm:text-base leading-relaxed">
                                Rishikesh sits in the Himalayan foothills beside the sacred emerald waters of the Ganga and is internationally recognised as a global centre for yoga, meditation, and spiritual practice.
                            </p>

                            <div className="space-y-4 pt-2">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-secondary/15 text-secondary flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                                        1
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">Yoga Lineage</h4>
                                        <p className="text-xs text-text/70 mt-0.5">Ancient authentic traditions coupled with contemporary anatomical wisdom.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-secondary/15 text-secondary flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                                        2
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">The Sacred Ganga</h4>
                                        <p className="text-xs text-text/70 mt-0.5">Immersion beside India&apos;s most culturally and spiritually significant river.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-secondary/15 text-secondary flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                                        3
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">The Himalayas</h4>
                                        <p className="text-xs text-text/70 mt-0.5">Clean mountain air, layered pine ridges, and elevated panoramic viewpoints.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-secondary/15 text-secondary flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                                        4
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">Living Indian Culture</h4>
                                        <p className="text-xs text-text/70 mt-0.5">Historic temples, quiet ashrams, evening fire ceremonies, and vibrant local markets.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-secondary/15 text-secondary flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                                        5
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">Rare Stillness</h4>
                                        <p className="text-xs text-text/70 mt-0.5">A spacious sanctuary to disconnect from continuous notifications, Zoom calls, and screen fatigue.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4-Image Editorial Grid */}
                        <div className="lg:col-span-7 grid grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-md">
                                    <Image
                                        src="/retreats/rishikesh/hero.jpg"
                                        alt="The flowing sacred Ganga"
                                        fill
                                        className="object-cover hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                                        <span className="text-white text-xs font-bold uppercase tracking-wider">The Sacred Ganga</span>
                                    </div>
                                </div>
                                <div className="relative aspect-square rounded-3xl overflow-hidden shadow-md">
                                    <Image
                                        src="/retreats/rishikesh/food.jpg"
                                        alt="Mindful Sattvic Indian dining"
                                        fill
                                        className="object-cover hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                                        <span className="text-white text-xs font-bold uppercase tracking-wider">Sattvic Mountain Feasts</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-8">
                                <div className="relative aspect-square rounded-3xl overflow-hidden shadow-md">
                                    <Image
                                        src="/retreats/rishikesh/kunjapuri.jpg"
                                        alt="Himalayan sunrise at Kunjapuri"
                                        fill
                                        className="object-cover hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                                        <span className="text-white text-xs font-bold uppercase tracking-wider">Kunjapuri Sunrise</span>
                                    </div>
                                </div>
                                <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-md">
                                    <Image
                                        src="/retreats/rishikesh/ganga-aarti.jpg"
                                        alt="Evening Ganga Aarti ceremony"
                                        fill
                                        className="object-cover hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                                        <span className="text-white text-xs font-bold uppercase tracking-wider">Triveni Ghat Aarti</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. WHO IS THIS RETREAT FOR? */}
            <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
                <div className="text-center max-w-2xl mx-auto space-y-4">
                    <span className="text-secondary uppercase tracking-widest text-xs font-bold block">Curated Audience</span>
                    <h2 className="font-serif text-3xl sm:text-5xl text-gray-900 leading-tight">
                        Made for People Who Need a Reset.
                    </h2>
                    <p className="text-text/75 text-sm sm:text-base">
                        Our cohorts bring together thoughtful individuals from around the world who cherish substance over superficial commercial tourism.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
                    <div className="p-7 rounded-3xl bg-white border border-gray-200/80 shadow-sm flex flex-col justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-widest text-secondary">Global Seekers</span>
                            <h3 className="font-serif text-xl font-bold text-gray-900 mt-2 mb-3">International Travellers</h3>
                            <p className="text-text/75 text-xs sm:text-sm leading-relaxed">
                                You&apos;ve always wanted to experience yoga in India—not through a studio in your home city, but where the sacred tradition is deeply embedded in everyday life, guided with fluent English and thoughtful hospitality.
                            </p>
                        </div>
                    </div>

                    <div className="p-7 rounded-3xl bg-white border border-gray-200/80 shadow-sm flex flex-col justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-widest text-secondary">Diaspora Reconnection</span>
                            <h3 className="font-serif text-xl font-bold text-gray-900 mt-2 mb-3">NRIs &amp; Overseas Indians</h3>
                            <p className="text-text/75 text-xs sm:text-sm leading-relaxed">
                                You grew up abroad or lived away from India for years. You want to reconnect with the country through genuine wellness, spiritual heritage, nourishing traditional food, and peaceful sacred spaces.
                            </p>
                        </div>
                    </div>

                    <div className="p-7 rounded-3xl bg-white border border-gray-200/80 shadow-sm flex flex-col justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-widest text-secondary">Burnout Recovery</span>
                            <h3 className="font-serif text-xl font-bold text-gray-900 mt-2 mb-3">Busy Professionals</h3>
                            <p className="text-text/75 text-xs sm:text-sm leading-relaxed">
                                You&apos;ve been working, travelling, and constantly switching between screens. You need seven days where nobody expects an immediate reply—a true nervous-system reset.
                            </p>
                        </div>
                    </div>

                    <div className="p-7 rounded-3xl bg-white border border-gray-200/80 shadow-sm flex flex-col justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-widest text-secondary">Accessible Practice</span>
                            <h3 className="font-serif text-xl font-bold text-gray-900 mt-2 mb-3">Yoga Beginners</h3>
                            <p className="text-text/75 text-xs sm:text-sm leading-relaxed">
                                You don&apos;t need to be flexible. You don&apos;t need to be deeply spiritual. You don&apos;t need years of practice. Our teachers break down asanas patiently and safely for all bodies.
                            </p>
                        </div>
                    </div>

                    <div className="p-7 rounded-3xl bg-white border border-gray-200/80 shadow-sm flex flex-col justify-between lg:col-span-2">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-widest text-secondary">Sadhana Immersion</span>
                            <h3 className="font-serif text-xl font-bold text-gray-900 mt-2 mb-3">Experienced Practitioners</h3>
                            <p className="text-text/75 text-xs sm:text-sm leading-relaxed">
                                Deepen your personal practice with classical breathwork, Patanjali philosophy, hands-on anatomical adjustments, and meditative quietude beyond commercial yoga studios.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 18. “YOUR WEEK IN ONE GLANCE” (Horizontal Journey Bar) */}
            <section className="py-16 bg-[#F2EFE9] border-y border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-10">
                        <span className="text-secondary font-bold uppercase tracking-widest text-xs">At A Glance</span>
                        <h3 className="font-serif text-2xl sm:text-3xl text-gray-900 font-bold mt-1">Your Week In Seven Movements</h3>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
                        {[
                            { num: "01", title: "ARRIVE", sub: "Exhale & Settle" },
                            { num: "02", title: "GANGA", sub: "Riverside Dawn" },
                            { num: "03", title: "DEEPEN", sub: "Mind & Breath" },
                            { num: "04", title: "EXPLORE", sub: "Ashrams & Culture" },
                            { num: "05", title: "HIMALAYAS", sub: "Kunjapuri Sunrise" },
                            { num: "06", title: "RESET", sub: "Inner Stillness" },
                            { num: "07", title: "RETURN", sub: "Carry It Home" },
                        ].map((item, idx) => (
                            <div key={idx} className="bg-white rounded-2xl p-4 border border-gray-200/70 shadow-sm flex flex-col items-center justify-center">
                                <span className="text-xs font-bold text-secondary font-mono">{item.num}</span>
                                <h4 className="font-serif font-bold text-gray-900 text-sm mt-1">{item.title}</h4>
                                <span className="text-[11px] text-text/60 mt-0.5">{item.sub}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 6. THE 7-DAY EXPERIENCE (Vertical Timeline Core) */}
            <section id="journey" className="py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                    <span className="text-secondary uppercase tracking-widest text-xs font-bold block">The Detailed Itinerary</span>
                    <h2 className="font-serif text-3xl sm:text-5xl text-gray-900 leading-tight">
                        Seven Days in Rishikesh
                    </h2>
                    <p className="text-text/75 text-base">
                        Every day is intentionally balanced between movement, nourishment, exploration, and spacious stillness.
                    </p>
                </div>

                <div className="relative border-l-2 border-secondary/30 ml-4 sm:ml-32 space-y-16">
                    
                    {/* Day 1 */}
                    <div className="relative pl-6 sm:pl-10">
                        <div className="absolute -left-[17px] top-1.5 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-md">
                            1
                        </div>
                        <span className="hidden sm:block absolute -left-32 top-2 text-xs font-bold uppercase tracking-widest text-secondary text-right w-24">
                            Day 01
                        </span>
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-bold uppercase tracking-widest text-secondary">Arrive &amp; Exhale</span>
                                <span className="text-xs text-text/60 bg-gray-100 px-3 py-1 rounded-full">Check-in from 1:00 PM</span>
                            </div>
                            <h3 className="font-serif text-2xl font-bold text-gray-900">Welcome to Rishikesh</h3>
                            <p className="text-text/80 text-sm leading-relaxed">
                                Arrive, settle into your boutique riverside accommodation, and meet your intimate retreat cohort. The first day isn&apos;t about doing everything—it&apos;s about slowing down and letting the nervous system arrive in India.
                            </p>
                            <div className="bg-accent/40 rounded-2xl p-4 border border-secondary/15 text-xs text-text/80 space-y-2">
                                <div className="font-bold text-primary uppercase tracking-wider">Day Highlights:</div>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 list-disc list-inside">
                                    <li>Private airport transfer &amp; warm check-in</li>
                                    <li>Herbal welcome drink &amp; orientation</li>
                                    <li>Gentle evening grounding yoga</li>
                                    <li>Nourishing welcome group dinner</li>
                                    <li>Evening Welcome Circle &amp; Guided Relaxation</li>
                                    <li>Early peaceful rest</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Day 2 */}
                    <div className="relative pl-6 sm:pl-10">
                        <div className="absolute -left-[17px] top-1.5 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-md">
                            2
                        </div>
                        <span className="hidden sm:block absolute -left-32 top-2 text-xs font-bold uppercase tracking-widest text-secondary text-right w-24">
                            Day 02
                        </span>
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-bold uppercase tracking-widest text-secondary">Begin Again</span>
                                <span className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full font-semibold">Triveni Ghat Aarti</span>
                            </div>
                            <h3 className="font-serif text-2xl font-bold text-gray-900">Sunrise Yoga • Breath • Ganga</h3>
                            <p className="text-text/80 text-sm leading-relaxed">
                                Start the day with gentle dawn yoga and pranayama overlooking the mountain valley. After a wholesome Sattvic breakfast, take a contemplative walk beside the Ganga and discover Rishikesh&apos;s natural rhythm.
                            </p>
                            <div className="bg-accent/40 rounded-2xl p-4 border border-secondary/15 text-xs text-text/80 space-y-2">
                                <div className="font-bold text-primary uppercase tracking-wider">Day Highlights:</div>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 list-disc list-inside">
                                    <li>Morning Hatha yoga &amp; breath awakening</li>
                                    <li>Farm-to-table Ayurvedic breakfast</li>
                                    <li>Mindful Ganga riverside walk</li>
                                    <li>Afternoon restorative quiet time</li>
                                    <li>Sunset Ganga Aarti ritual at Triveni Ghat</li>
                                    <li>Evening group reflection</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Day 3 */}
                    <div className="relative pl-6 sm:pl-10">
                        <div className="absolute -left-[17px] top-1.5 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-md">
                            3
                        </div>
                        <span className="hidden sm:block absolute -left-32 top-2 text-xs font-bold uppercase tracking-widest text-secondary text-right w-24">
                            Day 03
                        </span>
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-bold uppercase tracking-widest text-secondary">Go Deeper</span>
                                <span className="text-xs text-text/60 bg-gray-100 px-3 py-1 rounded-full">Workshop &amp; Somatics</span>
                            </div>
                            <h3 className="font-serif text-2xl font-bold text-gray-900">Yoga &amp; Self-Discovery</h3>
                            <p className="text-text/80 text-sm leading-relaxed">
                                Today shifts from simply practicing yoga to understanding yourself through it. We dive into structural mobility, mindful alignment, and nervous-system down-regulation.
                            </p>
                            <div className="bg-accent/40 rounded-2xl p-4 border border-secondary/15 text-xs text-text/80 space-y-2">
                                <div className="font-bold text-primary uppercase tracking-wider">Day Highlights:</div>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 list-disc list-inside">
                                    <li>Mobility &amp; alignment asana practice</li>
                                    <li>Workshop: Understanding Mind, Breath &amp; Stress</li>
                                    <li>Spacious afternoon for journaling &amp; riverside contemplation</li>
                                    <li>Sunset restorative yoga &amp; Yoga Nidra</li>
                                    <li>Sattvic culinary dinner</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Day 4 */}
                    <div className="relative pl-6 sm:pl-10">
                        <div className="absolute -left-[17px] top-1.5 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-md">
                            4
                        </div>
                        <span className="hidden sm:block absolute -left-32 top-2 text-xs font-bold uppercase tracking-widest text-secondary text-right w-24">
                            Day 04
                        </span>
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-bold uppercase tracking-widest text-secondary">Take Yoga Off The Mat</span>
                                <span className="text-xs text-secondary bg-secondary/10 px-3 py-1 rounded-full font-semibold">Culture &amp; Exploration</span>
                            </div>
                            <h3 className="font-serif text-2xl font-bold text-gray-900">Discover Rishikesh</h3>
                            <p className="text-text/80 text-sm leading-relaxed">
                                Today is your exploration day across historic Rishikesh. Walk across the iconic suspension bridges, explore historic ashrams, and soak in the vibrant atmosphere.
                            </p>
                            <div className="bg-accent/40 rounded-2xl p-4 border border-secondary/15 text-xs text-text/80 space-y-2">
                                <div className="font-bold text-primary uppercase tracking-wider">Day Highlights:</div>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 list-disc list-inside">
                                    <li>Morning energising pranayama flow</li>
                                    <li>Guided walking excursion to Ram Jhula &amp; local ashrams</li>
                                    <li>Traditional Ganga-side organic lunch</li>
                                    <li>Explore local spice &amp; artisan markets</li>
                                    <li>Optional: White-water rafting on the Ganga (weather permitting)</li>
                                    <li>Evening relaxation &amp; sound healing</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Day 5 */}
                    <div className="relative pl-6 sm:pl-10">
                        <div className="absolute -left-[17px] top-1.5 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-md">
                            5
                        </div>
                        <span className="hidden sm:block absolute -left-32 top-2 text-xs font-bold uppercase tracking-widest text-secondary text-right w-24">
                            Day 05
                        </span>
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-bold uppercase tracking-widest text-secondary">Leave The City Behind</span>
                                <span className="text-xs text-purple-700 bg-purple-50 px-3 py-1 rounded-full font-semibold">Cinematic Excursion</span>
                            </div>
                            <h3 className="font-serif text-2xl font-bold text-gray-900">Himalayan Morning at Kunjapuri</h3>
                            <p className="text-text/80 text-sm leading-relaxed">
                                An early morning departure to the breathtaking Kunjapuri temple viewpoint overlooking snow-capped Himalayan peaks. Watch the first golden rays illuminate the mountains in silent meditation.
                            </p>
                            <div className="bg-accent/40 rounded-2xl p-4 border border-secondary/15 text-xs text-text/80 space-y-2">
                                <div className="font-bold text-primary uppercase tracking-wider">Day Highlights:</div>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 list-disc list-inside">
                                    <li>Early morning scenic drive into the Himalayan ridges</li>
                                    <li>Sunrise meditation high above the clouds</li>
                                    <li>Panoramic Himalayan mountain breakfast</li>
                                    <li>Return to retreat sanctuary for afternoon rest</li>
                                    <li>Gentle restorative sunset yoga</li>
                                    <li>Quiet evening under the mountain stars</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Day 6 */}
                    <div className="relative pl-6 sm:pl-10">
                        <div className="absolute -left-[17px] top-1.5 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-md">
                            6
                        </div>
                        <span className="hidden sm:block absolute -left-32 top-2 text-xs font-bold uppercase tracking-widest text-secondary text-right w-24">
                            Day 06
                        </span>
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-bold uppercase tracking-widest text-secondary">The Quietest Day</span>
                                <span className="text-xs text-text/60 bg-gray-100 px-3 py-1 rounded-full">Integration &amp; Reset</span>
                            </div>
                            <h3 className="font-serif text-2xl font-bold text-gray-900">Inner Reset &amp; Closing Circle</h3>
                            <p className="text-text/80 text-sm leading-relaxed">
                                After days of exploration, Day 6 becomes intentionally still. A day dedicated to integrating everything you&apos;ve experienced and designing how you want your life to look once you return home.
                            </p>
                            <div className="bg-accent/40 rounded-2xl p-4 border border-secondary/15 text-xs text-text/80 space-y-2">
                                <div className="font-bold text-primary uppercase tracking-wider">Day Highlights:</div>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 list-disc list-inside">
                                    <li>Morning silent meditation &amp; pranayama</li>
                                    <li>Workshop: Designing Your Life After The Retreat</li>
                                    <li>Spacious afternoon for optional Ayurvedic massage or journaling</li>
                                    <li>Special Closing Circle beside the Ganga</li>
                                    <li>Celebratory farewell dinner</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Day 7 */}
                    <div className="relative pl-6 sm:pl-10">
                        <div className="absolute -left-[17px] top-1.5 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-md">
                            7
                        </div>
                        <span className="hidden sm:block absolute -left-32 top-2 text-xs font-bold uppercase tracking-widest text-secondary text-right w-24">
                            Day 07
                        </span>
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-bold uppercase tracking-widest text-secondary">The Practice Continues</span>
                                <span className="text-xs text-text/60 bg-gray-100 px-3 py-1 rounded-full">Departure by 12:00 PM</span>
                            </div>
                            <h3 className="font-serif text-2xl font-bold text-gray-900">Take the Practice Home</h3>
                            <p className="text-text/80 text-sm leading-relaxed">
                                The retreat ends; your practice doesn&apos;t. One final sunrise practice on the mat, hearty farewell breakfast, final blessings, and seamless airport transfer assistance.
                            </p>
                            <div className="p-4 rounded-2xl bg-primary/10 text-primary border border-primary/20 text-xs font-medium italic">
                                &ldquo;You came to Rishikesh for seven days. You leave with practices you can carry for years.&rdquo;
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 7. WHAT YOUR DAYS LOOK LIKE (Rhythm Table) */}
            <section className="py-24 bg-white border-y border-gray-200/70">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
                        <span className="text-secondary uppercase tracking-widest text-xs font-bold block">Spacious Cadence</span>
                        <h2 className="font-serif text-3xl sm:text-4xl text-gray-900">What Your Days Look Like</h2>
                        <p className="text-text/75 text-sm">
                            Not every minute is mandatory. The retreat is purposefully designed with spacious downtime so you never feel rushed.
                        </p>
                    </div>

                    <div className="bg-[#FAF9F5] rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-sm">
                        <div className="divide-y divide-gray-200/80">
                            {[
                                { time: "6:00 AM", title: "Wake & Hydration", desc: "Herbal infusions, warm lemon water, and quiet morning light." },
                                { time: "6:30 AM", title: "Morning Yoga Practice", desc: "Hatha flow, mobility, and alignment beside the mountain breeze." },
                                { time: "7:30 AM", title: "Pranayama & Meditation", desc: "Classical breathing techniques and centered awareness." },
                                { time: "8:15 AM", title: "Wholesome Breakfast", desc: "Fresh fruits, warm porridge, Ayurvedic grains, and herbal teas." },
                                { time: "9:30 AM", title: "Workshop or Excursion", desc: "Mind-body workshop, ashram visit, or Himalayan exploration." },
                                { time: "12:30 PM", title: "Sattvic Lunch", desc: "Nutrient-dense, freshly prepared Indian vegetarian nourishment." },
                                { time: "1:30 PM", title: "Rest & Personal Time", desc: "Read, journal, walk beside the river, or take a peaceful afternoon nap." },
                                { time: "4:00 PM", title: "Exploration / Activity", desc: "Cultural immersion, local markets, or optional Ganga rafting." },
                                { time: "6:00 PM", title: "Evening Yoga / Relaxation", desc: "Restorative poses, sound frequency, and Yoga Nidra for sleep." },
                                { time: "7:30 PM", title: "Communal Dinner", desc: "Thoughtful dinner, community sharing, and mindful conversations." },
                                { time: "8:30 PM", title: "Reflection & Free Time", desc: "Star gazing, tea, quiet personal reflections." },
                                { time: "10:00 PM", title: "Quiet Hours", desc: "Deep sleep with the natural sound of the flowing Ganga." },
                            ].map((item, i) => (
                                <div key={i} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 text-sm">
                                    <span className="font-mono text-xs font-bold text-secondary w-24 shrink-0">{item.time}</span>
                                    <div className="flex-1">
                                        <span className="font-bold text-gray-900">{item.title}</span>
                                        <span className="text-text/70 text-xs sm:ml-2 block sm:inline">{item.desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 8. YOGA PROGRAM & 9. FOOD & 10. ACCOMMODATION (3 Feature Columns) */}
            <section id="yoga" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-24">
                
                {/* Yoga Feature */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    <div className="lg:col-span-6 space-y-6">
                        <span className="text-secondary uppercase tracking-widest text-xs font-bold block">Thoughtful Practice</span>
                        <h2 className="font-serif text-3xl sm:text-4xl text-gray-900 leading-tight">
                            Your Practice, Thoughtfully Designed.
                        </h2>
                        <p className="text-text/80 text-sm sm:text-base leading-relaxed">
                            Rather than promising extreme quick-fix detoxes or medical miracles, we guide an authentic, sustainable practice rooted in classical traditions and modern biomechanics.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="p-4 rounded-2xl bg-white border border-gray-200">
                                <h4 className="font-bold text-sm text-gray-900 mb-1">Morning Hatha Yoga</h4>
                                <p className="text-xs text-text/70">Movement, structural alignment, stability, and conscious awareness.</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white border border-gray-200">
                                <h4 className="font-bold text-sm text-gray-900 mb-1">Traditional Pranayama</h4>
                                <p className="text-xs text-text/70">Breath regulation taught safely and systematically for international guests.</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white border border-gray-200">
                                <h4 className="font-bold text-sm text-gray-900 mb-1">Evening Restorative</h4>
                                <p className="text-xs text-text/70">Gentle releases, somatic holds, and deep preparation for restful sleep.</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white border border-gray-200">
                                <h4 className="font-bold text-sm text-gray-900 mb-1">Yoga Nidra &amp; Meditation</h4>
                                <p className="text-xs text-text/70">Guided conscious relaxation that resets accumulated mental stress.</p>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-6 relative aspect-[16/10] rounded-3xl overflow-hidden shadow-xl">
                        <Image
                            src="/retreats/rishikesh/kunjapuri.jpg"
                            alt="Meditation facing the Himalayas"
                            fill
                            className="object-cover"
                        />
                    </div>
                </div>

                {/* Food Feature */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    <div className="lg:col-span-6 order-last lg:order-first relative aspect-[16/10] rounded-3xl overflow-hidden shadow-xl">
                        <Image
                            src="/retreats/rishikesh/food.jpg"
                            alt="Sattvic Ayurvedic Indian dining"
                            fill
                            className="object-cover"
                        />
                    </div>

                    <div className="lg:col-span-6 space-y-6">
                        <span className="text-secondary uppercase tracking-widest text-xs font-bold block">Nourishing Cuisine</span>
                        <h2 className="font-serif text-3xl sm:text-4xl text-gray-900 leading-tight">
                            Eat The Way India Has Eaten for Generations.
                        </h2>
                        <p className="text-text/80 text-sm sm:text-base leading-relaxed">
                            Food designed to nourish you as you explore. Fresh, seasonal, vegetarian, and prepared with pure mountain water, regional grains, and digestive herbs.
                        </p>

                        <div className="bg-white rounded-2xl p-5 border border-gray-200 space-y-3 text-xs text-text/80">
                            <div className="font-bold text-primary uppercase tracking-wider">What&apos;s on the table:</div>
                            <div className="grid grid-cols-2 gap-2">
                                <span className="flex items-center gap-1.5"><LuCheck className="text-secondary" /> Seasonal Indian vegetables</span>
                                <span className="flex items-center gap-1.5"><LuCheck className="text-secondary" /> Wholesome native grains</span>
                                <span className="flex items-center gap-1.5"><LuCheck className="text-secondary" /> Traditional lentil dals &amp; curries</span>
                                <span className="flex items-center gap-1.5"><LuCheck className="text-secondary" /> Mountain fruits &amp; raw nuts</span>
                                <span className="flex items-center gap-1.5"><LuCheck className="text-secondary" /> Herbal digestive infusions</span>
                                <span className="flex items-center gap-1.5"><LuCheck className="text-secondary" /> Filtered spring water</span>
                            </div>
                            <p className="text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                                Vegan, gluten-free, and specific allergy requirements are gladly accommodated with notice during booking.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Accommodation Feature */}
                <div id="stay" className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    <div className="lg:col-span-6 space-y-6">
                        <span className="text-secondary uppercase tracking-widest text-xs font-bold block">Boutique Sanctuaries</span>
                        <h2 className="font-serif text-3xl sm:text-4xl text-gray-900 leading-tight">
                            Your Home for Seven Days.
                        </h2>
                        <p className="text-text/80 text-sm sm:text-base leading-relaxed">
                            Selected boutique accommodation in Rishikesh beside the foothills. Quiet, clean, comfortable, and tranquil, with attached modern bathrooms, high-speed Wi-Fi, and generous open terraces.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="p-5 rounded-2xl bg-white border border-gray-200">
                                <h4 className="font-serif font-bold text-base text-gray-900">Private Deluxe Room</h4>
                                <p className="text-xs text-text/70 mt-1">For guests who cherish complete solitude, personal space, and quiet rest.</p>
                                <span className="inline-block mt-3 text-xs font-bold text-primary">King Bed · En-Suite Bath · River/Mountain View</span>
                            </div>

                            <div className="p-5 rounded-2xl bg-white border border-gray-200">
                                <h4 className="font-serif font-bold text-base text-gray-900">Twin Sharing Room</h4>
                                <p className="text-xs text-text/70 mt-1">For friends, partners, or solo travellers who enjoy a social retreat vibe.</p>
                                <span className="inline-block mt-3 text-xs font-bold text-primary">Twin Beds · Attached Bath · Balcony</span>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-6 relative aspect-[16/10] rounded-3xl overflow-hidden shadow-xl">
                        <Image
                            src="/retreats/rishikesh/room.jpg"
                            alt="Serene boutique retreat bedroom in Rishikesh"
                            fill
                            className="object-cover"
                        />
                    </div>
                </div>
            </section>

            {/* 11 & 12. INCLUSIONS & EXCLUSIONS */}
            <section className="py-24 bg-[#F5F3ED] border-y border-gray-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
                        <span className="text-secondary uppercase tracking-widest text-xs font-bold block">Radical Transparency</span>
                        <h2 className="font-serif text-3xl sm:text-4xl text-gray-900">What&apos;s Included &amp; What&apos;s Not</h2>
                        <p className="text-text/75 text-sm">
                            Clear, upfront inclusions so international travellers know exactly what is taken care of from start to finish.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Included */}
                        <div className="bg-white rounded-3xl p-8 border border-emerald-100 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 text-emerald-700 font-serif font-bold text-xl pb-2 border-b border-gray-100">
                                <LuCheck className="w-6 h-6 bg-emerald-100 rounded-full p-1" /> What&apos;s Included
                            </div>
                            <ul className="space-y-3 text-xs sm:text-sm text-text/80">
                                {[
                                    "6 nights boutique accommodation in Rishikesh",
                                    "Daily morning traditional Hatha yoga sessions",
                                    "Daily evening restorative & relaxation practices",
                                    "Daily guided meditation and pranayama breathwork",
                                    "All nourishing vegetarian Sattvic meals and herbal teas",
                                    "Sacred Ganga Aarti experience at Triveni Ghat",
                                    "Rishikesh ashrams and cultural walking excursions",
                                    "Himalayan sunrise excursion to Kunjapuri viewpoint",
                                    "Special retreat workshops on nervous-system health",
                                    "Dedicated bilingual retreat coordinator throughout",
                                    "Airport transfer coordination from Dehradun (DED) or Delhi (DEL)",
                                ].map((inc, i) => (
                                    <li key={i} className="flex items-start gap-2.5">
                                        <LuCheck className="text-emerald-600 w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{inc}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Not Included */}
                        <div className="bg-white rounded-3xl p-8 border border-rose-100 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 text-gray-700 font-serif font-bold text-xl pb-2 border-b border-gray-100">
                                <LuX className="w-6 h-6 bg-gray-100 rounded-full p-1 text-gray-500" /> What&apos;s Not Included
                            </div>
                            <ul className="space-y-3 text-xs sm:text-sm text-text/70">
                                {[
                                    "International flights to/from India",
                                    "Indian visa fees (e-Visa recommended)",
                                    "Personal comprehensive travel & medical insurance",
                                    "Alcohol and tobacco (strictly drug-free retreat)",
                                    "Optional adventure activities (e.g. white-water rafting fee)",
                                    "Individual Ayurvedic spa / massage treatments (available as add-ons)",
                                    "Personal shopping, souvenirs, and discretionary expenses",
                                    "Extra nights before or after the retreat schedule",
                                ].map((exc, i) => (
                                    <li key={i} className="flex items-start gap-2.5">
                                        <LuX className="text-gray-400 w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{exc}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* 13. PRICING & 14. SMALL GROUP POSITIONING */}
            <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    <span className="text-secondary uppercase tracking-widest text-xs font-bold block">Transparent Investment</span>
                    <h2 className="font-serif text-3xl sm:text-5xl text-gray-900 leading-tight">
                        Not a Bus Tour. A Small Group Immersion.
                    </h2>
                    <p className="text-text/75 text-sm sm:text-base">
                        Strictly limited to <strong className="text-primary font-bold">10–14 guests</strong> per cohort for deeply personal instruction, quiet spaces, and an intimate international community.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    
                    {/* Shared Room Card */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-200/90 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-700 uppercase tracking-widest">
                                Twin Sharing
                            </div>
                            <h3 className="font-serif text-2xl font-bold text-gray-900">Shared Retreat Room</h3>
                            <p className="text-xs text-text/70 leading-relaxed">
                                Ideal for friends traveling together, or solo guests who welcome sharing a room with another participant.
                            </p>

                            <div className="pt-4 border-t border-gray-100 space-y-1">
                                <div className="text-xs font-bold uppercase tracking-wider text-secondary">Early Bird Rate</div>
                                <div className="flex items-baseline gap-2">
                                    <span className="font-serif text-4xl font-bold text-primary">
                                        {currency === "USD" ? "$899" : "₹75,000"}
                                    </span>
                                    <span className="text-xs text-gray-500">/ person (6 Nights)</span>
                                </div>
                                <div className="text-xs text-gray-400 line-through">
                                    Standard: {currency === "USD" ? "$1,020 USD" : "₹85,000 INR"}
                                </div>
                            </div>

                            <ul className="space-y-2.5 text-xs text-text/80 pt-4">
                                <li className="flex items-center gap-2"><LuCheck className="text-secondary" /> 2 Twin beds with luxury organic linen</li>
                                <li className="flex items-center gap-2"><LuCheck className="text-secondary" /> Attached modern bath with hot water</li>
                                <li className="flex items-center gap-2"><LuCheck className="text-secondary" /> All 7-day retreat inclusions &amp; meals</li>
                                <li className="flex items-center gap-2"><LuCheck className="text-secondary" /> Kunjapuri Himalayan sunrise excursion</li>
                            </ul>
                        </div>

                        <div className="pt-8">
                            <button
                                onClick={() => openBooking("Shared Room")}
                                className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold uppercase tracking-widest text-xs hover:bg-secondary transition-colors shadow-md"
                            >
                                Reserve Shared Place
                            </button>
                        </div>
                    </div>

                    {/* Private Room Card */}
                    <div className="bg-white rounded-3xl p-8 border-2 border-secondary shadow-lg relative flex flex-col justify-between">
                        <div className="absolute -top-3.5 right-6 px-3.5 py-1 bg-secondary text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">
                            Most Popular
                        </div>

                        <div className="space-y-4">
                            <div className="inline-block px-3 py-1 bg-secondary/15 rounded-full text-xs font-bold text-secondary uppercase tracking-widest">
                                Private Deluxe
                            </div>
                            <h3 className="font-serif text-2xl font-bold text-gray-900">Private Retreat Room</h3>
                            <p className="text-xs text-text/70 leading-relaxed">
                                For guests who prefer personal space, complete quiet after evening sessions, and private solitude.
                            </p>

                            <div className="pt-4 border-t border-gray-100 space-y-1">
                                <div className="text-xs font-bold uppercase tracking-wider text-secondary">Early Bird Rate</div>
                                <div className="flex items-baseline gap-2">
                                    <span className="font-serif text-4xl font-bold text-primary">
                                        {currency === "USD" ? "$1,140" : "₹95,000"}
                                    </span>
                                    <span className="text-xs text-gray-500">/ person (6 Nights)</span>
                                </div>
                                <div className="text-xs text-gray-400 line-through">
                                    Standard: {currency === "USD" ? "$1,320 USD" : "₹1,10,000 INR"}
                                </div>
                            </div>

                            <ul className="space-y-2.5 text-xs text-text/80 pt-4">
                                <li className="flex items-center gap-2"><LuCheck className="text-secondary" /> King bed, attached en-suite bath</li>
                                <li className="flex items-center gap-2"><LuCheck className="text-secondary" /> Scenic mountain or Ganga river balcony</li>
                                <li className="flex items-center gap-2"><LuCheck className="text-secondary" /> Complete privacy and personal workstation</li>
                                <li className="flex items-center gap-2"><LuCheck className="text-secondary" /> All 7-day retreat workshops &amp; meals</li>
                            </ul>
                        </div>

                        <div className="pt-8">
                            <button
                                onClick={() => openBooking("Private Room")}
                                className="w-full py-3.5 rounded-2xl bg-secondary text-white font-bold uppercase tracking-widest text-xs hover:bg-primary transition-colors shadow-lg"
                            >
                                Reserve Private Room
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* 15. WHY SHAKTI YOGA KENDRA? & 16. THE PEOPLE YOU'LL MEET */}
            <section className="py-24 bg-white border-y border-gray-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-6 space-y-6">
                            <span className="text-secondary uppercase tracking-widest text-xs font-bold block">Our Philosophy</span>
                            <h2 className="font-serif text-3xl sm:text-5xl text-gray-900 leading-tight">
                                Traditional Roots.<br />
                                Modern Understanding.
                            </h2>
                            <p className="text-text/80 text-sm sm:text-base leading-relaxed">
                                Shakti Yoga Kendra bridges traditional Indian yogic philosophy with welcoming, non-dogmatic instruction designed for international travellers and NRIs.
                            </p>

                            <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                                <div className="space-y-1">
                                    <strong className="text-primary block text-sm">Authentic</strong>
                                    <p className="text-text/70">Rooted directly in Indian heritage and the living tradition.</p>
                                </div>
                                <div className="space-y-1">
                                    <strong className="text-primary block text-sm">Inclusive</strong>
                                    <p className="text-text/70">You don&apos;t need to be flexible or spiritual to belong.</p>
                                </div>
                                <div className="space-y-1">
                                    <strong className="text-primary block text-sm">Personal</strong>
                                    <p className="text-text/70">Max 14 guests ensures genuine, individual attention.</p>
                                </div>
                                <div className="space-y-1">
                                    <strong className="text-primary block text-sm">Practical</strong>
                                    <p className="text-text/70">Practices designed to stay with you once you fly home.</p>
                                </div>
                            </div>
                        </div>

                        {/* Acharya Swastik Profile */}
                        <div className="lg:col-span-6 bg-[#FAF9F5] rounded-3xl p-8 border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center gap-6">
                            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden shrink-0 shadow-md border-2 border-secondary/40 relative">
                                <Image
                                    src="/teachers/swastik.webp"
                                    alt="Acharya Swastik - Founder Shakti Yoga Kendra"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="space-y-2 text-center sm:text-left">
                                <span className="text-xs font-bold uppercase tracking-widest text-secondary">Lead Retreat Guide</span>
                                <h3 className="font-serif text-2xl font-bold text-gray-900">Acharya Swastik</h3>
                                <div className="text-xs font-semibold text-primary">M.Sc. Yoga &amp; Therapy · Founder, Shakti Yoga Kendra</div>
                                <p className="text-text/75 text-xs leading-relaxed pt-1">
                                    Over 12 years guiding students across India, Europe, and the Americas. Swastik combines classical Pranayama and Patanjali philosophy with modern spine and postural alignment.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 19. TESTIMONIALS */}
            <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
                <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
                    <span className="text-secondary uppercase tracking-widest text-xs font-bold block">Guest Reflections</span>
                    <h2 className="font-serif text-3xl sm:text-4xl text-gray-900">Words From Past Participants</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white rounded-3xl p-8 border border-gray-200/80 shadow-sm space-y-4">
                        <div className="text-secondary text-2xl font-serif">&ldquo;</div>
                        <p className="text-text/80 text-sm leading-relaxed italic">
                            I came looking for a yoga holiday. I left feeling like I had finally slowed down for the first time in ten years. The Ganga walks in the morning changed everything.
                        </p>
                        <div className="pt-2 border-t border-gray-100">
                            <div className="font-serif font-bold text-gray-900 text-sm">Sarah Jenkins</div>
                            <span className="text-xs text-text/60">London, United Kingdom</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-8 border border-gray-200/80 shadow-sm space-y-4">
                        <div className="text-secondary text-2xl font-serif">&ldquo;</div>
                        <p className="text-text/80 text-sm leading-relaxed italic">
                            The perfect balance between authentic yoga, deep Indian culture, and having quiet time for myself. Not rushed, extremely safe, and the food was exceptional.
                        </p>
                        <div className="pt-2 border-t border-gray-100">
                            <div className="font-serif font-bold text-gray-900 text-sm">Ananya Patel</div>
                            <span className="text-xs text-text/60">San Francisco, USA</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-8 border border-gray-200/80 shadow-sm space-y-4">
                        <div className="text-secondary text-2xl font-serif">&ldquo;</div>
                        <p className="text-text/80 text-sm leading-relaxed italic">
                            I had visited India before on family trips, but experiencing Rishikesh this way with Swastik was completely different. Grounding, authentic, and truly restorative.
                        </p>
                        <div className="pt-2 border-t border-gray-100">
                            <div className="font-serif font-bold text-gray-900 text-sm">Rajiv Mehta</div>
                            <span className="text-xs text-text/60">Toronto, Canada</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* 21. TRAVEL TO RISHIKESH & 22. BEST TIME TO COME */}
            <section className="py-24 bg-[#F5F3ED] border-y border-gray-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-6 space-y-6">
                            <span className="text-secondary uppercase tracking-widest text-xs font-bold block">Getting Here Made Simple</span>
                            <h2 className="font-serif text-3xl sm:text-4xl text-gray-900 leading-tight">
                                Travel to Rishikesh
                            </h2>
                            <p className="text-text/80 text-sm sm:text-base leading-relaxed">
                                We make international arrival stress-free. Whether you land in New Delhi or connect directly into Dehradun, our team handles private chauffeur pickup straight to the retreat.
                            </p>

                            <div className="space-y-3 pt-2 text-xs">
                                <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-1">
                                    <strong className="text-primary font-bold text-sm block">1. International Flight to Delhi (DEL)</strong>
                                    <p className="text-text/70">Fly into Indira Gandhi International Airport. From Delhi, take a 45-minute domestic hop to Dehradun (DED) or our private chauffeur transfer (4.5 hours on express highway).</p>
                                </div>

                                <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-1">
                                    <strong className="text-primary font-bold text-sm block">2. Dehradun Jolly Grant Airport (DED)</strong>
                                    <p className="text-text/70">The closest airport to Rishikesh (just 35 minutes scenic drive). We coordinate our private driver to greet you at arrivals.</p>
                                </div>
                            </div>
                        </div>

                        {/* Best Time to Come Cards */}
                        <div className="lg:col-span-6 space-y-4">
                            <span className="text-secondary uppercase tracking-widest text-xs font-bold block">Seasonal Windows</span>
                            <div className="p-6 rounded-3xl bg-white border border-gray-200 space-y-2">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-serif font-bold text-lg text-gray-900">FEB — APR · Spring Retreats</h4>
                                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">Optimal</span>
                                </div>
                                <p className="text-xs text-text/70 leading-relaxed">
                                    Warm pleasant days (20–28°C), crisp mountain mornings, blooming flora, and crystal-clear turquoise Ganga water.
                                </p>
                            </div>

                            <div className="p-6 rounded-3xl bg-white border border-gray-200 space-y-2">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-serif font-bold text-lg text-gray-900">SEP — NOV · Autumn Retreats</h4>
                                    <span className="text-xs bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full font-bold">Himalayan Views</span>
                                </div>
                                <p className="text-xs text-text/70 leading-relaxed">
                                    Post-monsoon freshness, exceptionally clear blue skies, breathtaking panoramic snow peak vistas from Kunjapuri.
                                </p>
                            </div>

                            <div className="p-6 rounded-3xl bg-white border border-gray-200 space-y-2">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-serif font-bold text-lg text-gray-900">OTHER MONTHS · Private Cohorts</h4>
                                    <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full font-bold">On Request</span>
                                </div>
                                <p className="text-xs text-text/70 leading-relaxed">
                                    Winter (Dec–Jan) is crisp and contemplative. Monsoon (Jul–Aug) is adapted for introspective indoor meditation.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 20. FAQ ACCORDION (All 14 questions from spec) */}
            <section id="faqs" className="py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
                <div className="text-center mb-16 space-y-3">
                    <span className="text-secondary uppercase tracking-widest text-xs font-bold block">Answers &amp; Clarity</span>
                    <h2 className="font-serif text-3xl sm:text-5xl text-gray-900">Frequently Asked Questions</h2>
                </div>

                <div className="space-y-4">
                    {[
                        {
                            q: "Do I need previous yoga experience?",
                            a: "No. The retreat is thoughtfully designed for both complete beginners and experienced practitioners. Asanas are taught with layered variations and anatomical alignment."
                        },
                        {
                            q: "Is the retreat suitable for foreigners and international travellers?",
                            a: "Yes. The entire retreat experience is tailored for international guests, featuring high-standard boutique rooms, bottled/filtered water, hygienic food, and fluent English guidance."
                        },
                        {
                            q: "Is it suitable for NRIs?",
                            a: "Absolutely. NRIs are one of our core communities. It offers a grounded, meaningful way to reconnect with Indian cultural and spiritual roots away from family stress."
                        },
                        {
                            q: "What language are the sessions conducted in?",
                            a: "All yoga, meditation, and workshops are conducted in fluent, accessible English."
                        },
                        {
                            q: "Do I need to be flexible?",
                            a: "Not at all. Yoga is about developing breath awareness and functional ease in your own body, not contorting yourself into pretzel shapes."
                        },
                        {
                            q: "Is accommodation included?",
                            a: "Yes. 6 nights boutique accommodation in Rishikesh are included according to your choice of Private Deluxe or Shared Twin room."
                        },
                        {
                            q: "Is food included?",
                            a: "Yes. All daily breakfast, lunch, dinner, and herbal teas are included. Meals are fresh, Sattvic, vegetarian, and nutrient-dense."
                        },
                        {
                            q: "Are airport transfers included?",
                            a: "We provide dedicated arrival transfer coordination. Private chauffeur pickup from Dehradun (DED) or Delhi (DEL) is arranged seamlessly with trusted drivers."
                        },
                        {
                            q: "Can I come alone?",
                            a: "Yes. Over 60% of our participants travel solo. You will find a warm, welcoming community and plenty of space for solitude."
                        },
                        {
                            q: "Can couples come?",
                            a: "Yes. Couples are very welcome and can reserve a Private Deluxe King room."
                        },
                        {
                            q: "Is there free time?",
                            a: "Yes. The schedule is intentionally spacious. Every afternoon includes free time to rest, journal, read, or explore Rishikesh at your own pace."
                        },
                        {
                            q: "Is white-water rafting included?",
                            a: "Rafting is an optional add-on experience for adventure enthusiasts, dependent on river conditions, so guests who prefer quiet contemplation aren't pressured."
                        },
                        {
                            q: "What should I pack?",
                            a: "Comfortable yoga/workout clothes, modest loose casual attire for temples and streets, comfortable walking shoes, a light sweater/fleece for mornings, sunscreen, and your personal medication. Our free guide includes a complete checklist."
                        },
                        {
                            q: "What happens if I have a medical condition or injury?",
                            a: "Please disclose any back pain, joint issues, or medical conditions in the confidential booking form. Our instructors are qualified yoga therapists and adapt all practices safely."
                        }
                    ].map((item, idx) => (
                        <div key={idx} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                            <button
                                onClick={() => toggleFaq(idx)}
                                className="w-full p-5 text-left flex items-center justify-between gap-4 font-serif font-bold text-gray-900 text-base sm:text-lg hover:text-primary transition-colors"
                            >
                                <span>{item.q}</span>
                                <LuChevronDown className={`w-5 h-5 text-secondary shrink-0 transition-transform ${openFaq === idx ? "rotate-180" : ""}`} />
                            </button>
                            {openFaq === idx && (
                                <div className="px-5 pb-5 text-text/75 text-xs sm:text-sm leading-relaxed border-t border-gray-100 pt-3">
                                    {item.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* 24. LEAD CAPTURE (Free PDF Guide) */}
            <section className="py-20 bg-primary text-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
                    <span className="text-secondary-light uppercase tracking-widest text-xs font-bold block text-[#E6C29E]">
                        Not Ready to Book Yet?
                    </span>
                    <h2 className="font-serif text-3xl sm:text-4xl font-bold">
                        Download the Free Rishikesh Retreat &amp; Travel Guide
                    </h2>
                    <p className="text-white/80 text-sm max-w-xl mx-auto leading-relaxed">
                        A 24-page comprehensive resource with packing checklists, flight route guidance, visa tips, weather calendars, and sample daily schedules for international visitors.
                    </p>
                    <div className="pt-2">
                        <button
                            onClick={() => setIsGuideOpen(true)}
                            className="px-8 py-3.5 bg-secondary text-white font-bold uppercase tracking-widest text-xs rounded-full hover:bg-white hover:text-primary transition-colors shadow-xl inline-flex items-center gap-2"
                        >
                            <LuDownload className="w-4 h-4" /> Download Free Digital Guide (PDF)
                        </button>
                    </div>
                </div>
            </section>

            {/* 25. FINAL EMOTIONAL HERO CTA */}
            <section className="relative py-32 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/retreats/rishikesh/ganga-aarti.jpg"
                        alt="Evening river celebration in Rishikesh"
                        fill
                        className="object-cover object-center filter brightness-[0.4]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                </div>

                <div className="relative z-10 max-w-3xl mx-auto px-4 text-center text-white space-y-6">
                    <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold leading-tight">
                        Seven Days Can Change The Way You See Your Life.
                    </h2>
                    <p className="text-white/85 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                        Come to Rishikesh. Step away from the noise. Move your body. Quiet your mind. Experience India. Meet people from around the world. And give yourself seven days to simply be.
                    </p>
                    <div className="pt-4">
                        <button
                            onClick={() => openBooking("Private Room")}
                            className="px-10 py-4 bg-secondary text-white font-bold uppercase tracking-widest text-xs rounded-full hover:bg-white hover:text-primary transition-all shadow-2xl hover:scale-105 active:scale-95"
                        >
                            Reserve Your Place
                        </button>
                        <div className="text-xs text-white/60 mt-3">
                            7 Days • 6 Nights • Rishikesh, India • Limited to 14 Places
                        </div>
                    </div>
                </div>
            </section>

            {/* Interactive Modals */}
            <RishikeshBookingModal
                isOpen={isBookingOpen}
                onClose={() => setIsBookingOpen(false)}
                initialRoom={selectedRoom}
                currency={currency}
            />

            <RishikeshGuideModal
                isOpen={isGuideOpen}
                onClose={() => setIsGuideOpen(false)}
            />
        </div>
    );
}
