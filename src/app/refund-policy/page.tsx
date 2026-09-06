import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = {
    title: "Cancellation & Refund Policy",
    description: "How subscription cancellations, refunds, and 1:1 session credits work at Shakti Yoga.",
    alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
    return (
        <main>
            <PageHeader
                title="Cancellation & Refund Policy"
                subtitle="Clear terms for subscriptions, trials, and 1:1 sessions."
            />

            <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12 sm:py-16 prose prose-lg prose-headings:font-serif prose-headings:text-primary prose-a:text-secondary">
                <p className="text-sm text-text/50">Last updated 6 September 2026</p>

                <h2>Free trial</h2>
                <p>
                    The 7-day free trial requires no payment and no card. It expires automatically after 7 days —
                    nothing is charged, and no action is needed to end it. To keep practising, choose a paid plan.
                </p>

                <h2>Everyday Yoga subscription (₹2,000/month)</h2>
                <ul>
                    <li>You can cancel any time from <strong>Dashboard → Billing</strong>. Cancellation stops the next
                        renewal; your access continues until the end of the current paid period.</li>
                    <li><strong>Full refund</strong> if you cancel within 7 days of your first payment and have attended no
                        live classes.</li>
                    <li>After 7 days, the current month is non-refundable, but you will not be charged again.</li>
                    <li>If we cancel a class with less than 24 hours' notice and cannot offer a reasonable alternative,
                        that day is credited to your account.</li>
                </ul>

                <h2>1:1 Yoga Therapy (₹5,000/month)</h2>
                <ul>
                    <li>The plan includes a set number of 1:1 session credits each billing cycle. Unused credits do not
                        roll over to the next cycle.</li>
                    <li><strong>Cancelling a booked session at least 24 hours in advance</strong> returns the credit to your
                        account to rebook.</li>
                    <li>Cancelling within 24 hours, or not attending, consumes the credit.</li>
                    <li>If your teacher cancels a session, the credit is always returned and you are notified by email.</li>
                    <li>A full refund of the current cycle is available within 7 days of your first payment if no sessions
                        have been used.</li>
                </ul>

                <h2>How refunds are issued</h2>
                <p>
                    Approved refunds are returned to the original payment method via Razorpay, normally within 5–7 working
                    days. Email <a href="mailto:contactus@shaktiyoga.in">contactus@shaktiyoga.in</a> with your registered
                    email address and payment reference to request one.
                </p>

                <h2>Chargebacks</h2>
                <p>
                    Please contact us first — we resolve almost every billing question directly and quickly. Raising a
                    chargeback without contacting us may result in the account being suspended pending resolution.
                </p>
            </div>
        </main>
    );
}
