"use client";

import { useState } from "react";
import Link from "next/link";
import { LuTrash2, LuCircleCheck, LuShieldAlert, LuClock, LuMail, LuSmartphone } from "react-icons/lu";

export default function DeleteAccountPage() {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [reason, setReason] = useState("");
    const [confirmed, setConfirmed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email.trim() || !confirmed) {
            setError("Please provide your registered email address and confirm the deletion notice.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim() || "Account Deletion Request",
                    email: email.trim().toLowerCase(),
                    subject: "Account Deletion Request",
                    message: `USER REQUESTED ACCOUNT & DATA DELETION.\nRegistered Email: ${email.trim()}\nReason provided: ${reason.trim() || "Not specified"}\nSubmitted via web deletion form on ${new Date().toISOString()}`,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Could not submit your request. Please email us directly at support@shaktiyoga.in.");
            }

            setSubmitted(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to submit deletion request. Please email support@shaktiyoga.in.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-surface-base py-12 sm:py-16 px-4 sm:px-6 md:px-12 text-ink">
            <div className="max-w-3xl mx-auto space-y-10">
                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 text-red-600 mb-2 border border-red-100 shadow-sm">
                        <LuTrash2 className="text-2xl" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold font-serif text-gray-900 tracking-tight">
                        Account & Data Deletion Request
                    </h1>
                    <p className="text-gray-600 text-sm sm:text-base max-w-xl mx-auto">
                        In accordance with Google Play and Apple App Store user privacy requirements, Shakti Yoga Kendra provides full control to delete your account and personal data.
                    </p>
                </div>

                {/* Option 1: In-App Deletion */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                            <LuSmartphone className="text-xl" />
                        </div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                            Option 1: Instant In-App Deletion (Recommended)
                        </h2>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        If you currently have the Shakti Yoga mobile application installed on your Android or iOS device, you can permanently delete your account immediately with zero waiting period:
                    </p>
                    <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700 font-medium">
                        <li>Open the <strong>Shakti Yoga</strong> app and log into your account.</li>
                        <li>Navigate to your <strong>Profile</strong> tab (bottom right navigation bar).</li>
                        <li>Scroll down to the danger zone at the bottom and tap <strong className="text-red-600">Delete Account</strong>.</li>
                        <li>Confirm the prompt. Your personal data, sessions, and active recurring subscriptions will be permanently wiped immediately.</li>
                    </ol>
                </div>

                {/* Option 2: Web Deletion Request Form */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                            <LuMail className="text-xl" />
                        </div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                            Option 2: Submit Web Deletion Request
                        </h2>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        If you have uninstalled the app or cannot log in, submit your registered email address below. Our privacy and support team will verify and process your deletion request.
                    </p>

                    {submitted ? (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
                            <LuCircleCheck className="text-green-600 text-3xl mx-auto" />
                            <h3 className="font-bold text-green-900 text-base">
                                Account Deletion Request Received
                            </h3>
                            <p className="text-xs sm:text-sm text-green-800 max-w-md mx-auto">
                                We have received your request to delete the account associated with <strong>{email}</strong>. Our security team will process the permanent deletion within <strong>7 business days</strong>.
                            </p>
                            <p className="text-xs text-green-700">
                                A confirmation notice has been sent to our privacy administration team.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                    Your Full Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    placeholder="Enter your name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                    Registered Account Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                                />
                                <span className="text-[11px] text-gray-500 mt-1 block">
                                    Must match the email address associated with your Shakti Yoga account.
                                </span>
                            </div>

                            <div>
                                <label htmlFor="reason" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                                    Reason for leaving (Optional)
                                </label>
                                <textarea
                                    id="reason"
                                    rows={3}
                                    placeholder="Tell us why you wish to delete your account (optional)"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                                />
                            </div>

                            <div className="flex items-start gap-2.5 pt-1">
                                <input
                                    id="confirm"
                                    type="checkbox"
                                    required
                                    checked={confirmed}
                                    onChange={(e) => setConfirmed(e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                                />
                                <label htmlFor="confirm" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
                                    I understand that submitting this request will permanently delete my profile, class attendance records, medical notes, and cancel any active memberships. This action cannot be reversed.
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/40 shadow-sm transition disabled:opacity-50 cursor-pointer"
                            >
                                {submitting ? "Submitting Request…" : "Request Account & Data Deletion"}
                            </button>
                        </form>
                    )}
                </div>

                {/* Disclosure Sections: Data Deleted vs Data Retained */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* What is Deleted */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                            <LuTrash2 className="text-base" />
                            <span>Data That Will Be Permanently Deleted</span>
                        </div>
                        <ul className="text-xs text-gray-600 space-y-2 list-disc pl-4 leading-relaxed">
                            <li><strong>Account Profile:</strong> Name, email, phone number, avatar photo, country, and timezone.</li>
                            <li><strong>Health & Therapy Records:</strong> Medical history, therapy intake evaluations, and therapist consultation notes.</li>
                            <li><strong>Attendance & Bookings:</strong> Class check-in history, upcoming bookings, and unused session credits.</li>
                            <li><strong>Subscriptions:</strong> Ongoing auto-renewal subscriptions are cancelled with the payment provider.</li>
                            <li><strong>Device Data:</strong> Mobile device push notification tokens and authentication session tokens.</li>
                        </ul>
                    </div>

                    {/* What is Retained */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                            <LuShieldAlert className="text-base" />
                            <span>Data Retained &amp; Legal Justification</span>
                        </div>
                        <ul className="text-xs text-gray-600 space-y-2 list-disc pl-4 leading-relaxed">
                            <li><strong>Financial Transaction Records:</strong> Invoices, payment receipts, and tax records are retained strictly as required by Indian taxation statutes (Section 44AA of the Income Tax Act, 1961, and GST regulations).</li>
                            <li><strong>Anonymization:</strong> Financial records are detached from your personal PII.</li>
                            <li><strong>Legal Retention Period:</strong> Kept for the statutory minimum of 7 years, after which they are permanently purged.</li>
                        </ul>
                    </div>
                </div>

                {/* Deletion Timeframe */}
                <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 sm:p-6 text-xs sm:text-sm text-gray-700 flex items-start gap-3">
                    <LuClock className="text-lg text-gray-500 shrink-0 mt-0.5" />
                    <div>
                        <strong className="text-gray-900 block mb-1">Processing Timeframe:</strong>
                        In-app deletions take effect immediately. Deletion requests submitted via this web form or email are verified and processed within <strong>7 business days</strong> (maximum 30 days pursuant to Google Play Store and GDPR guidelines).
                    </div>
                </div>

                {/* Direct Contact Support */}
                <div className="text-center text-xs text-gray-500 space-y-1">
                    <p>
                        Need help or have questions regarding your personal data?
                    </p>
                    <p>
                        Email our Data Protection Officer directly at{" "}
                        <a href="mailto:contactus@shaktiyoga.in" className="text-brand font-semibold hover:underline">
                            contactus@shaktiyoga.in
                        </a>{" "}
                        or review our full{" "}
                        <Link href="/privacy" className="text-brand font-semibold hover:underline">
                            Privacy Policy
                        </Link>.
                    </p>
                </div>
            </div>
        </main>
    );
}
