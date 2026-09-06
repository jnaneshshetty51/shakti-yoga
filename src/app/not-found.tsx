import Link from "next/link";

export default function NotFound() {
    return (
        <main className="min-h-[70vh] flex items-center justify-center bg-accent/20 px-4 py-20">
            <div className="max-w-md w-full text-center">
                <p className="font-serif text-6xl text-primary mb-4">404</p>
                <h1 className="font-serif text-2xl text-text mb-3">This page has wandered off the mat</h1>
                <p className="text-text/60 mb-8">
                    The page you were looking for isn&apos;t here. Let&apos;s get you back to your practice.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/" className="px-6 py-3 bg-primary text-white font-bold uppercase tracking-widest text-sm rounded hover:bg-secondary transition-colors">
                        Home
                    </Link>
                    <Link href="/everyday-yoga" className="px-6 py-3 border border-primary text-primary font-bold uppercase tracking-widest text-sm rounded hover:bg-primary/5 transition-colors">
                        Everyday Yoga
                    </Link>
                </div>
            </div>
        </main>
    );
}
