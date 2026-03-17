import Link from "next/link";

export default function WelcomePage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-primary/5 py-20 px-4">
            <div className="max-w-2xl w-full bg-white p-12 rounded-lg shadow-xl text-center">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                    ✓
                </div>

                <h1 className="font-serif text-4xl text-primary mb-4">Welcome to the Family!</h1>
                <p className="text-xl text-text/70 mb-12">
                    Your journey to wellness has officially begun. We are so excited to have you with us.
                </p>

                <div className="grid md:grid-cols-2 gap-6 mb-12 text-left">
                    <div className="p-6 border border-gray-100 rounded-lg bg-gray-50">
                        <div className="text-2xl mb-2">📅</div>
                        <h3 className="font-bold text-gray-800 mb-1">Book Your First Class</h3>
                        <p className="text-sm text-gray-600 mb-4">Select a time slot that works for you.</p>
                        <Link href="/dashboard/classes" className="text-primary font-bold text-sm hover:underline">
                            Go to Schedule →
                        </Link>
                    </div>

                    <div className="p-6 border border-gray-100 rounded-lg bg-gray-50">
                        <div className="text-2xl mb-2">📱</div>
                        <h3 className="font-bold text-gray-800 mb-1">Join Community</h3>
                        <p className="text-sm text-gray-600 mb-4">Connect with fellow yogis on WhatsApp.</p>
                        <a href="#" className="text-primary font-bold text-sm hover:underline">
                            Join Group →
                        </a>
                    </div>
                </div>

                <Link
                    href="/dashboard"
                    className="inline-block px-8 py-4 bg-primary text-white font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors shadow-lg"
                >
                    Go to Dashboard
                </Link>
            </div>
        </main>
    );
}
