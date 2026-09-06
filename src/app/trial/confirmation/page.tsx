import Link from "next/link";

export default function TrialConfirmationPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-primary/5 py-20 px-4">
            <div className="max-w-xl w-full bg-white p-10 rounded-lg shadow-xl text-center border-t-4 border-secondary">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
                    ✓
                </div>

                <h1 className="font-serif text-3xl text-primary mb-4">Your Trial Is Active</h1>
                <p className="text-text/70 mb-8">
                    You have full access to every Everyday Yoga class for the next 7 days. Your dashboard shows today&apos;s class and the schedule.
                </p>

                <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 mb-8 text-left">
                    <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-widest">Next Steps</h3>
                    <ul className="space-y-3 text-sm text-gray-600">
                        <li className="flex items-start gap-3">
                            <span className="text-secondary font-bold">1.</span>
                            <span>Open your dashboard a few minutes before class and tap <strong>Join Google Meet</strong>.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-secondary font-bold">2.</span>
                            <span>Join your batch&apos;s WhatsApp group for daily reminders.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-secondary font-bold">3.</span>
                            <span>We&apos;ll email you before the trial ends — nothing is charged automatically.</span>
                        </li>
                    </ul>
                </div>

                <Link
                    href="/dashboard"
                    className="block w-full py-4 bg-primary text-white font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors shadow-md"
                >
                    Go to Dashboard
                </Link>
            </div>
        </main>
    );
}
