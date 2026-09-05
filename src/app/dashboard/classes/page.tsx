"use client";

import { useState, useEffect } from "react";
import { generateGroupSlots } from "@/utils/slots";
import { useAuth } from "@/context/AuthContext";
import type { BookingRow } from "@/types/booking";

export default function ClassesPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'upcoming' | 'book'>('upcoming');
    const slots = generateGroupSlots();
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [bookings, setBookings] = useState<BookingRow[]>([]);
    const [bookingCount, setBookingCount] = useState(0);
    const [, setLoading] = useState(true);

    // Fetch user's bookings to check trial limit
    useEffect(() => {
        async function fetchBookings() {
            try {
                const response = await fetch('/api/bookings');
                if (response.ok) {
                    const data = await response.json();
                    setBookings(data.bookings || []);
                    setBookingCount(data.bookings?.length || 0);
                }
            } catch (error) {
                console.error('Failed to fetch bookings:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchBookings();
    }, []);

    const isTrial = user?.role === 'trial';
    const isVisitor = user?.role === 'visitor';
    const hasReachedLimit = isTrial && bookingCount >= 1;

    const handleConfirmBooking = async () => {
        if (hasReachedLimit || isVisitor) {
            alert('❌ Membership required!\n\nPlease select a plan to book classes.');
            return;
        }

        const recurring = (document.getElementById('recurring') as HTMLInputElement)?.checked;

        try {
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slot: selectedSlot, recurring }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 403) {
                    alert(`❌ ${data.message}`);
                } else {
                    throw new Error(data.error);
                }
                return;
            }

            alert(`✅ Booking confirmed for ${selectedSlot}!\n${recurring ? 'Recurring: Yes' : 'Recurring: No'}`);
            setBookingCount(prev => prev + 1);
            setSelectedSlot(null);
            setActiveTab('upcoming');
        } catch (error) {
            console.error('Booking failed:', error);
            alert('Failed to confirm booking. Please try again.');
        }
    };

    return (
        <div>
            <h1 className="font-serif text-3xl text-primary mb-8">My Classes</h1>

            <div className="flex gap-4 mb-8 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'upcoming'
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    Upcoming
                </button>
                <button
                    onClick={() => setActiveTab('book')}
                    className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'book'
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    Book New Class
                </button>
            </div>

            {activeTab === 'upcoming' && (
                <div className="space-y-4">
                    {bookings.length === 0 ? (
                        <div className="text-gray-500 italic">No upcoming classes found. Book one now!</div>
                    ) : (
                        bookings.map((booking) => (
                            <div key={booking.id} className="bg-white p-6 rounded-lg shadow-sm border border-primary/10 flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-lg text-primary">{booking.type || 'Yoga Class'}</div>
                                    <div className="text-sm text-text/70">
                                        {new Date(booking.date).toLocaleDateString()} at {booking.time} IST
                                        {booking.recurring && <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs">Recurring</span>}
                                    </div>
                                </div>
                                <div className="px-4 py-2 bg-green-100 text-green-800 text-xs font-bold uppercase tracking-widest rounded">
                                    {booking.status}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'book' && (
                <div className="bg-white p-8 rounded-lg shadow-sm border border-primary/10">
                    {isVisitor ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">🔒</div>
                            <h2 className="font-serif text-2xl text-primary mb-4">Membership Required</h2>
                            <p className="text-gray-600 mb-6">
                                You need an active membership or free trial to book live classes.
                            </p>
                            <a
                                href="/programs"
                                className="inline-block px-6 py-3 bg-secondary text-white font-bold uppercase tracking-widest text-xs rounded hover:bg-primary transition-colors"
                            >
                                View Membership Plans
                            </a>
                        </div>
                    ) : hasReachedLimit ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">🎯</div>
                            <h2 className="font-serif text-2xl text-primary mb-4">Trial Class Completed!</h2>
                            <p className="text-gray-600 mb-6">
                                You've used your free trial class. Ready to continue your yoga journey?
                            </p>
                            <a
                                href="/programs"
                                className="inline-block px-6 py-3 bg-secondary text-white font-bold uppercase tracking-widest text-xs rounded hover:bg-primary transition-colors"
                            >
                                View Membership Plans
                            </a>
                        </div>
                    ) : (
                        <>
                            <h2 className="font-serif text-2xl text-primary mb-6">Select a Batch</h2>

                            <div className="mb-8">
                                <h3 className="font-bold text-sm text-text/60 uppercase tracking-widest mb-4">Morning Batches (IST)</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {slots.morning.map((slot) => (
                                        <button
                                            key={slot}
                                            onClick={() => setSelectedSlot(slot)}
                                            className={`p-3 rounded border text-sm transition-all ${selectedSlot === slot
                                                ? 'bg-primary text-white border-primary font-bold'
                                                : 'border-gray-200 hover:border-primary/50 text-text/80'
                                                }`}
                                        >
                                            {slot}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-8">
                                <h3 className="font-bold text-sm text-text/60 uppercase tracking-widest mb-4">Evening Batches (IST)</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {slots.evening.map((slot) => (
                                        <button
                                            key={slot}
                                            onClick={() => setSelectedSlot(slot)}
                                            className={`p-3 rounded border text-sm transition-all ${selectedSlot === slot
                                                ? 'bg-primary text-white border-primary font-bold'
                                                : 'border-gray-200 hover:border-primary/50 text-text/80'
                                                }`}
                                        >
                                            {slot}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {selectedSlot && (
                                <div className="p-6 bg-accent/10 rounded-lg border border-accent/20">
                                    <div className="flex items-start gap-3 mb-6">
                                        <input type="checkbox" id="recurring" className="mt-1" />
                                        <label htmlFor="recurring" className="text-sm text-text/80">
                                            <strong>Make this my recurring slot?</strong>
                                            <br />
                                            <span className="text-xs opacity-70">We will automatically book this time for you every weekday. You can cancel anytime.</span>
                                        </label>
                                    </div>

                                    <button
                                        onClick={handleConfirmBooking}
                                        className="w-full py-3 bg-secondary text-white font-bold uppercase tracking-widest rounded hover:bg-primary transition-colors"
                                    >
                                        Confirm Booking for {selectedSlot}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
