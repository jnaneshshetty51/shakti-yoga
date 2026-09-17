"use client";

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import TrialLink from './TrialLink';

export default function FreeTrial() {
    const { user } = useAuth();

    const isMember =
        user &&
        (user.role === 'member_everyday' ||
            user.role === 'member_starter' ||
            user.role === 'member_therapy' ||
            user.role === 'trial' ||
            user.role === 'admin');

    return (
        <section id="free-trial" className="py-12 sm:py-20 px-4 sm:px-8 bg-primary text-white text-center">
            <div className="max-w-3xl mx-auto">
                <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl mb-4 sm:mb-6">
                    {isMember ? "Welcome back to your practice" : "Not sure where to start?"}
                </h2>
                <p className="font-sans text-base sm:text-lg md:text-xl opacity-90 mb-8 sm:mb-10 font-light">
                    {isMember
                        ? "Your active membership gives you unlimited access to daily live batches and recorded sessions."
                        : "Experience 1 FREE live Everyday Yoga group class to see if our daily practice is the right fit for you."}
                </p>

                {isMember ? (
                    <Link
                        href={user.role === "admin" ? "/admin" : "/dashboard"}
                        className="inline-block w-full sm:w-auto px-6 sm:px-10 py-3.5 sm:py-4 bg-white text-primary font-sans font-bold uppercase tracking-widest text-sm sm:text-base rounded hover:bg-secondary hover:text-white transition-all transform hover:-translate-y-0.5 shadow-lg"
                    >
                        {user.role === "admin" ? "Go to Admin Panel" : "Go to My Dashboard"}
                    </Link>
                ) : (
                    <TrialLink
                        href="/trial"
                        className="inline-block w-full sm:w-auto px-6 sm:px-10 py-3.5 sm:py-4 bg-white text-primary font-sans font-bold uppercase tracking-widest text-sm sm:text-base rounded hover:bg-secondary hover:text-white transition-all transform hover:-translate-y-0.5 shadow-lg"
                    >
                        Get Your Free Trial Class
                    </TrialLink>
                )}

                <p className="mt-6 text-xs opacity-70 uppercase tracking-wider">
                    {isMember ? "Live interactive guidance from certified masters" : "First session free · No credit card required"}
                </p>
            </div>
        </section>
    );
}

