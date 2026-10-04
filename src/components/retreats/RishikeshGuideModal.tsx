"use client";

import React, { useState } from "react";
import { LuX, LuDownload, LuCheck, LuBookOpen, LuSparkles } from "react-icons/lu";

interface RishikeshGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function RishikeshGuideModal({ isOpen, onClose }: RishikeshGuideModalProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [country, setCountry] = useState("");
    const [whatsapp, setWhatsapp] = useState("");
    const [preferredMonth, setPreferredMonth] = useState("Spring (Feb–Apr 2026)");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        try {
            const res = await fetch("/api/retreats/rishikesh/guide", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, country, whatsapp, preferredMonth }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to download guide.");
            }

            setSuccess(true);
        } catch (err: any) {
            setErrorMsg(err.message || "An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-secondary/20 overflow-hidden my-8">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-[#344b2d] text-white p-6 sm:p-8 relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        aria-label="Close"
                    >
                        <LuX className="w-5 h-5" />
                    </button>
                    <div className="text-secondary-light uppercase tracking-widest text-xs font-bold mb-2 flex items-center gap-1.5 text-[#E6C29E]">
                        <LuBookOpen className="w-3.5 h-3.5" /> Free 24-Page Digital Guide
                    </div>
                    <h3 className="font-serif text-2xl font-bold">
                        The Rishikesh Retreat &amp; India Travel Guide
                    </h3>
                    <p className="text-white/80 text-xs mt-1.5 leading-relaxed">
                        Essential packing checklist, visa tips, weather, arrival guidance, and sample daily schedule for international travellers.
                    </p>
                </div>

                {/* Body */}
                <div className="p-6 sm:p-8">
                    {success ? (
                        <div className="text-center py-4 space-y-4">
                            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-2xl font-bold">
                                <LuCheck />
                            </div>
                            <h4 className="font-serif text-xl font-bold text-gray-900">Your Guide is On Its Way!</h4>
                            <p className="text-xs text-text/70 max-w-sm mx-auto leading-relaxed">
                                We&apos;ve sent the complete digital guide to <strong className="text-primary">{email}</strong>. You can also view the itinerary overview directly below.
                            </p>
                            <div className="pt-2">
                                <a
                                    href="#journey"
                                    onClick={onClose}
                                    className="inline-block px-6 py-2.5 bg-secondary text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-primary transition-colors"
                                >
                                    Explore 7-Day Itinerary
                                </a>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {errorMsg && (
                                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs">
                                    {errorMsg}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Your First Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Rachel"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address (To Receive PDF) *</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="rachel@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Country / Nationality</label>
                                    <input
                                        type="text"
                                        placeholder="USA, UK, Canada, UAE..."
                                        value={country}
                                        onChange={(e) => setCountry(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp Number</label>
                                    <input
                                        type="tel"
                                        placeholder="+1 / +44..."
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Travel Window</label>
                                <select
                                    value={preferredMonth}
                                    onChange={(e) => setPreferredMonth(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 bg-white"
                                >
                                    <option value="Spring (Feb–Apr 2026)">Spring (Feb–Apr 2026) - Highly Recommended</option>
                                    <option value="Autumn (Sep–Nov 2026)">Autumn (Sep–Nov 2026) - Mountain Views</option>
                                    <option value="Winter (Dec 2026–Jan 2027)">Winter (Dec 2026–Jan 2027) - Crisp &amp; Meditative</option>
                                    <option value="Future / Exploring for 2027">Exploring for Future Dates</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-2 py-3 rounded-xl bg-secondary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                            >
                                {loading ? "Generating Guide..." : (
                                    <>
                                        <LuDownload className="w-4 h-4" /> Send Me the Free Retreat Guide
                                    </>
                                )}
                            </button>

                            <p className="text-[11px] text-gray-500 text-center pt-1">
                                We respect your privacy. No spam — only curated retreat materials.
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
