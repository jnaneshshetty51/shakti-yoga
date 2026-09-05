"use client";

import { useState } from "react";
import { generateTherapySlots } from "@/utils/slots";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function TherapyBookingPage() {
    const { user, consumeCredit } = useAuth();
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState<number | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const slots = generateTherapySlots();

    // Generate next 7 days
    const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return {
            day: d.toLocaleDateString('en-US', { weekday: 'short' }),
            date: d.getDate(),
            fullDate: d
        };
    });

    const handleBooking = async () => {
        if (!selectedSlot || selectedDate === null) {
            alert("Please select a date and time.");
            return;
        }

        try {
            const dateStr = dates[selectedDate].fullDate.toISOString().split('T')[0]; // YYYY-MM-DD

            // Format slot time properly
            // Ideally we'd combine date+time, but the API expects 'slot' (time string) 
            // and maybe 'date' if we updated it, but based on previous files:
            // "slot" is usually just the time for recurring, but for therapy it should be specific date.
            // Let's assume the API handles it or we pass a generic note for now as the API might be basic.
            // Actually let's look at the bookings API again in next step if needed, but standardizing:

            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'Therapy',
                    date: dateStr,
                    slot: selectedSlot,
                    recurring: false
                }),
            });

            if (response.ok) {
                // If successful, debit credit locally (or refetch user)
                // For now, assume success
                if (consumeCredit()) {
                    alert("Session Booked! 1 Credit used.");
                    router.push("/dashboard");
                }
            } else {
                const data = await response.json();
                alert(`Booking Failed: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Booking error', error);
            alert("Booking Failed. Please try again.");
        }
    };

    const credits = user?.credits ?? (user?.role === 'member_therapy' || user?.role === 'admin' ? 4 : user?.role === 'trial' ? 1 : 0);

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="text-sm font-bold text-text/50 hover:text-primary uppercase tracking-widest">
                        ← Back
                    </Link>
                    <h1 className="font-serif text-3xl text-primary">Book Therapy Session</h1>
                </div>
                <div className="bg-secondary/10 px-4 py-2 rounded-full text-secondary font-bold text-sm">
                    Credits Available: {credits}
                </div>
            </div>

            {credits === 0 ? (
                <div className="bg-white border border-primary/10 p-8 rounded-lg shadow-sm text-center max-w-lg mx-auto">
                    <div className="text-5xl mb-4">🔒</div>
                    <h3 className="font-serif text-2xl text-primary mb-2">1:1 Therapy Membership Required</h3>
                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                        You need an active 1:1 Yoga Therapy subscription or available session credits to book private consultations.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="/checkout?plan=therapy" className="px-6 py-3 bg-secondary text-white font-bold uppercase tracking-widest text-xs rounded hover:bg-primary transition-colors">
                            Subscribe to Yoga Therapy ($120/mo)
                        </Link>
                        <Link href="/programs" className="px-6 py-3 border border-primary text-primary font-bold uppercase tracking-widest text-xs rounded hover:bg-accent transition-colors">
                            View All Plans
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-2">
                        {/* Date Picker */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-primary/10 mb-6">
                            <h3 className="font-bold text-sm text-text/60 uppercase tracking-widest mb-4">Select Date</h3>
                            <div className="flex justify-between gap-2 overflow-x-auto pb-2">
                                {dates.map((d, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setSelectedDate(i); setSelectedSlot(null); }}
                                        className={`flex-1 min-w-[60px] p-3 rounded border flex flex-col items-center justify-center transition-all ${selectedDate === i
                                            ? 'bg-primary text-white border-primary shadow-md'
                                            : 'border-gray-200 hover:border-primary/50 text-text/80 bg-gray-50'
                                            }`}
                                    >
                                        <span className="text-xs uppercase font-bold mb-1 opacity-70">{d.day}</span>
                                        <span className="text-xl font-serif">{d.date}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Slot Picker */}
                        {selectedDate !== null && (
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-primary/10 animate-in fade-in slide-in-from-top-2">
                                <h3 className="font-bold text-sm text-text/60 uppercase tracking-widest mb-4">Available Slots (IST)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {slots.map((slot) => (
                                        <button
                                            key={slot}
                                            onClick={() => setSelectedSlot(slot)}
                                            className={`p-4 rounded border text-center transition-all ${selectedSlot === slot
                                                ? 'bg-secondary text-white border-secondary font-bold shadow-md'
                                                : 'border-gray-200 hover:border-secondary/50 text-text/80'
                                                }`}
                                        >
                                            {slot}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Summary */}
                    <div>
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-primary/10 sticky top-4">
                            <h3 className="font-serif text-xl text-primary mb-4">Booking Summary</h3>

                            {selectedDate !== null && selectedSlot ? (
                                <div className="space-y-4">
                                    <div className="pb-4 border-b border-gray-100">
                                        <div className="text-xs font-bold text-text/50 uppercase tracking-widest mb-1">Date</div>
                                        <div className="font-bold text-text">{dates[selectedDate].day}, {dates[selectedDate].fullDate.toLocaleDateString()}</div>
                                    </div>
                                    <div className="pb-4 border-b border-gray-100">
                                        <div className="text-xs font-bold text-text/50 uppercase tracking-widest mb-1">Time</div>
                                        <div className="font-bold text-text">{selectedSlot}</div>
                                    </div>
                                    <div className="pb-4 border-b border-gray-100">
                                        <div className="text-xs font-bold text-text/50 uppercase tracking-widest mb-1">Cost</div>
                                        <div className="font-bold text-text">1 Credit</div>
                                    </div>

                                    <button
                                        onClick={handleBooking}
                                        className="w-full py-3 bg-primary text-white font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors shadow-lg"
                                    >
                                        Confirm Booking
                                    </button>
                                </div>
                            ) : (
                                <p className="text-sm text-text/60 italic">
                                    Please select a date and time to continue.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
