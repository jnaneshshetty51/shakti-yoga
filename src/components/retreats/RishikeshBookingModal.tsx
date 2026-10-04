"use client";

import React, { useState } from "react";
import { 
    LuX, 
    LuCheck, 
    LuCalendar, 
    LuUser, 
    LuHeart, 
    LuPlane, 
    LuCreditCard, 
    LuSparkles, 
    LuArrowRight, 
    LuArrowLeft,
    LuShieldCheck,
    LuMessageCircle
} from "react-icons/lu";

interface RishikeshBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialRoom?: string;
    currency?: "INR" | "USD";
}

const COHORT_OPTIONS = [
    { id: "spring-1", label: "March 15 – March 21, 2026", season: "Spring Blossom", spotsLeft: 4 },
    { id: "spring-2", label: "April 12 – April 18, 2026", season: "Spring Equinox", spotsLeft: 3 },
    { id: "autumn-1", label: "October 11 – October 17, 2026", season: "Himalayan Autumn", spotsLeft: 6 },
    { id: "autumn-2", label: "November 08 – November 14, 2026", season: "Deep Sadhana", spotsLeft: 5 },
];

export default function RishikeshBookingModal({
    isOpen,
    onClose,
    initialRoom = "Private Room",
    currency = "USD",
}: RishikeshBookingModalProps) {
    const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Form state
    const [formData, setFormData] = useState({
        cohortDate: COHORT_OPTIONS[0].label,
        roomType: initialRoom,
        guestCount: 1,
        name: "",
        email: "",
        phone: "",
        country: "",
        emergencyContact: "",
        yogaExperience: "Beginner / Gentle Practice",
        dietary: "Vegetarian (Default)",
        medicalNotes: "",
        arrivalDetails: "Planning to land in Delhi (DEL) / Dehradun (DED)",
        paymentPreference: "Credit Card (International Stripe / Razorpay)",
    });

    if (!isOpen) return null;

    const priceShared = currency === "USD" ? "$899" : "₹75,000";
    const pricePrivate = currency === "USD" ? "$1,140" : "₹95,000";

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");

        if (step === 2) {
            if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
                setErrorMsg("Please fill in your name, email, and WhatsApp number.");
                return;
            }
        }

        if (step === 4) {
            handleSubmit();
            return;
        }

        setStep((prev) => (prev + 1) as any);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setErrorMsg("");

        try {
            const res = await fetch("/api/retreats/rishikesh/booking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to submit booking request.");
            }

            setStep(5);
        } catch (err: any) {
            setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-secondary/20 overflow-hidden my-8">
                
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-primary to-[#344b2d] text-white p-6 sm:p-8 relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        aria-label="Close"
                    >
                        <LuX className="w-5 h-5" />
                    </button>
                    <div className="text-secondary-light uppercase tracking-widest text-xs font-bold mb-2 flex items-center gap-1.5 text-[#E6C29E]">
                        <LuSparkles className="w-3.5 h-3.5" /> 7-Day Rishikesh Yoga & Wellness Retreat
                    </div>
                    <h3 className="font-serif text-2xl sm:text-3xl font-bold">
                        {step === 5 ? "Your Journey Begins 🧘" : "Reserve Your Place"}
                    </h3>
                    <p className="text-white/80 text-sm mt-1">
                        {step === 5 
                            ? "We have received your reservation and will contact you directly."
                            : "Intimate cohort limited to 10–14 guests. No upfront full payment required to hold your spot."}
                    </p>

                    {/* Step indicator */}
                    {step < 5 && (
                        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/15">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex-1 flex items-center gap-2">
                                    <div className={`h-1.5 rounded-full flex-1 transition-colors ${i <= step ? "bg-secondary" : "bg-white/20"}`} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal Body */}
                <div className="p-6 sm:p-8">
                    {errorMsg && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                            {errorMsg}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-text/70 mb-3 flex items-center gap-2">
                                    <LuCalendar className="text-secondary" /> Select Preferred Retreat Cohort
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {COHORT_OPTIONS.map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, cohortDate: c.label })}
                                            className={`p-4 rounded-2xl text-left border transition-all ${
                                                formData.cohortDate === c.label 
                                                    ? "border-secondary bg-secondary/10 ring-2 ring-secondary/30 shadow-sm"
                                                    : "border-gray-200 hover:border-gray-300 bg-white"
                                            }`}
                                        >
                                            <div className="text-xs font-semibold text-secondary uppercase tracking-widest">{c.season}</div>
                                            <div className="font-serif font-bold text-gray-900 mt-1">{c.label}</div>
                                            <div className="text-xs text-text/60 mt-1 flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                Only {c.spotsLeft} places remaining
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-text/70 mb-3">
                                    Accommodation Choice
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, roomType: "Private Room" })}
                                        className={`p-4 rounded-2xl text-left border transition-all ${
                                            formData.roomType === "Private Room"
                                                ? "border-secondary bg-secondary/10 ring-2 ring-secondary/30 shadow-sm"
                                                : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-serif font-bold text-gray-900">Private Deluxe Room</span>
                                            <span className="text-sm font-bold text-primary">{pricePrivate}</span>
                                        </div>
                                        <p className="text-xs text-text/70 mt-1.5 leading-relaxed">
                                            King bed, en-suite bathroom, mountain/Ganga view. Maximum solitude and quiet space.
                                        </p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, roomType: "Shared Room" })}
                                        className={`p-4 rounded-2xl text-left border transition-all ${
                                            formData.roomType === "Shared Room"
                                                ? "border-secondary bg-secondary/10 ring-2 ring-secondary/30 shadow-sm"
                                                : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-serif font-bold text-gray-900">Twin Sharing Room</span>
                                            <span className="text-sm font-bold text-primary">{priceShared}</span>
                                        </div>
                                        <p className="text-xs text-text/70 mt-1.5 leading-relaxed">
                                            Twin beds, shared with another participant or friend. Social and connected.
                                        </p>
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <span className="text-sm text-text/70">Number of Guests</span>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, guestCount: Math.max(1, formData.guestCount - 1) })}
                                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center font-bold hover:bg-gray-100"
                                    >
                                        -
                                    </button>
                                    <span className="font-bold text-gray-900 w-4 text-center">{formData.guestCount}</span>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, guestCount: Math.min(4, formData.guestCount + 1) })}
                                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center font-bold hover:bg-gray-100"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs text-secondary font-bold uppercase tracking-wider mb-2">
                                <LuUser /> Guest Details & Communication
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Legal Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Sarah Jenkins"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="sarah@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp / Phone with Country Code *</label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="+44 7911 123456 or +1 415 555 0199"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Country of Residence / Nationality *</label>
                                    <input
                                        type="text"
                                        placeholder="United Kingdom, United States, UAE, etc."
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Emergency Contact (Name & Phone)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. David Jenkins (+44 79...)"
                                        value={formData.emergencyContact}
                                        onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs text-secondary font-bold uppercase tracking-wider mb-2">
                                <LuHeart /> Wellness & Personal Preferences
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Current Yoga Experience Level</label>
                                <select
                                    value={formData.yogaExperience}
                                    onChange={(e) => setFormData({ ...formData, yogaExperience: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm bg-white"
                                >
                                    <option value="Complete Beginner (Never practiced)">Complete Beginner (Never practiced)</option>
                                    <option value="Beginner / Gentle Practice (Occasional classes)">Beginner / Gentle Practice (Occasional classes)</option>
                                    <option value="Intermediate (Practicing 1–3 years)">Intermediate (Practicing 1–3 years)</option>
                                    <option value="Advanced / Teacher (Looking for traditional sadhana)">Advanced / Teacher (Looking for traditional sadhana)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Dietary Preferences & Allergies</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Pure Vegetarian, Vegan, Gluten-Free, Nut Allergy"
                                    value={formData.dietary}
                                    onChange={(e) => setFormData({ ...formData, dietary: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm"
                                />
                                <span className="text-[11px] text-gray-500 mt-1 block">All meals served are fresh Ayurvedic Sattvic vegetarian.</span>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Health or Mobility Considerations (Confidential)</label>
                                <textarea
                                    rows={3}
                                    placeholder="Back pain, knee sensitivity, recent surgery, hypertension, or any physical consideration our teachers should adapt for..."
                                    value={formData.medicalNotes}
                                    onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs text-secondary font-bold uppercase tracking-wider mb-2">
                                <LuPlane /> Travel & Payment Setup
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Arrival & Flight Information</label>
                                <textarea
                                    rows={2}
                                    placeholder="e.g. Flying into New Delhi (DEL) on March 14, need transfer to Rishikesh, or landing directly in Dehradun (DED)..."
                                    value={formData.arrivalDetails}
                                    onChange={(e) => setFormData({ ...formData, arrivalDetails: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm"
                                />
                                <span className="text-[11px] text-gray-500 mt-1 block">We provide private chauffeur transfer coordination from Dehradun (DED) or Delhi (DEL).</span>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Preferred Payment Method for Booking Deposit</label>
                                <select
                                    value={formData.paymentPreference}
                                    onChange={(e) => setFormData({ ...formData, paymentPreference: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm bg-white"
                                >
                                    <option value="International Credit Card (Visa, Mastercard, Amex via Stripe)">International Credit Card (Visa, Mastercard, Amex)</option>
                                    <option value="Indian Bank UPI / NetBanking / Razorpay">Indian UPI / NetBanking / Razorpay (INR)</option>
                                    <option value="International Wire / Wise Transfer">International Wire / Wise Transfer (USD, GBP, EUR)</option>
                                </select>
                            </div>

                            {/* Summary Card */}
                            <div className="p-4 rounded-2xl bg-surface-sunken border border-gray-200/80 text-xs space-y-2">
                                <div className="flex justify-between font-bold text-gray-800">
                                    <span>Selected Cohort:</span>
                                    <span>{formData.cohortDate}</span>
                                </div>
                                <div className="flex justify-between text-text/80">
                                    <span>Accommodation:</span>
                                    <span>{formData.roomType}</span>
                                </div>
                                <div className="flex justify-between text-text/80">
                                    <span>Guests:</span>
                                    <span>{formData.guestCount}</span>
                                </div>
                                <div className="flex justify-between font-bold text-primary pt-1 border-t border-gray-200">
                                    <span>Total Price Estimate:</span>
                                    <span>
                                        {formData.roomType === "Private Room" ? pricePrivate : priceShared}
                                        {formData.guestCount > 1 ? ` × ${formData.guestCount}` : ""}
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-500 pt-1">
                                    A 30% deposit secures your reservation. The remaining balance is payable 21 days before retreat check-in.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                                <LuShieldCheck className="w-5 h-5 shrink-0" />
                                <span>No risk: 100% refundable deposit up to 30 days prior to arrival.</span>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="text-center py-6 space-y-5 animate-fadeIn">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-2xl font-bold">
                                <LuCheck />
                            </div>
                            <div>
                                <h4 className="font-serif text-2xl font-bold text-gray-900">Namaste, {formData.name}!</h4>
                                <p className="text-text/70 text-sm max-w-md mx-auto mt-2 leading-relaxed">
                                    Your 7-Day Rishikesh Retreat reservation request has been placed for the <strong className="text-primary">{formData.cohortDate}</strong> cohort.
                                </p>
                            </div>

                            <div className="bg-accent/30 p-5 rounded-2xl text-left text-xs space-y-3 max-w-md mx-auto border border-secondary/20">
                                <div className="font-bold uppercase tracking-wider text-secondary">What happens next:</div>
                                <div className="flex items-start gap-2">
                                    <span className="font-bold text-primary">1.</span>
                                    <span>Our retreat director will contact you via WhatsApp &amp; Email within 12 hours with your welcome kit.</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="font-bold text-primary">2.</span>
                                    <span>We verify flight arrival times and send your secure deposit payment link.</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="font-bold text-primary">3.</span>
                                    <span>You receive the pre-retreat preparation guide, packing list, and WhatsApp group invite.</span>
                                </div>
                            </div>

                            <div className="pt-2">
                                <a
                                    href={`https://wa.me/919980554444?text=${encodeURIComponent(`Hi Shakti Yoga Kendra, I just reserved my spot for the 7-Day Rishikesh Retreat (${formData.cohortDate})!`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity shadow-md"
                                >
                                    <LuMessageCircle className="w-4 h-4" /> Message Us on WhatsApp Instantly
                                </a>
                            </div>

                            <button
                                onClick={onClose}
                                className="block w-full text-center text-xs font-bold uppercase tracking-widest text-text/60 hover:text-primary pt-2"
                            >
                                Close Window
                            </button>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    {step < 5 && (
                        <div className="flex items-center justify-between pt-6 border-t border-gray-100 mt-6">
                            {step > 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setStep((prev) => (prev - 1) as any)}
                                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
                                >
                                    <LuArrowLeft className="w-3.5 h-3.5" /> Back
                                </button>
                            ) : (
                                <div />
                            )}

                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={isSubmitting}
                                className="px-6 py-3 rounded-xl bg-secondary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary transition-colors flex items-center gap-2 shadow-lg disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    "Processing..."
                                ) : step === 4 ? (
                                    <>Confirm Reservation <LuCheck className="w-4 h-4" /></>
                                ) : (
                                    <>Continue <LuArrowRight className="w-4 h-4" /></>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
