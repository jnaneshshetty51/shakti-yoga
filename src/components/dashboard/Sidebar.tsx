import Link from 'next/link';

export default function Sidebar() {
    return (
        <aside className="hidden lg:flex w-64 bg-primary text-white h-screen fixed left-0 top-0 flex-col z-40">
            <div className="p-6 border-b border-white/10">
                <Link href="/" className="font-serif text-2xl font-bold tracking-wider">
                    Shakti Yoga
                </Link>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                <Link href="/dashboard" className="block px-4 py-3 rounded hover:bg-white/10 transition-colors font-sans text-sm uppercase tracking-widest">
                    Dashboard
                </Link>
                <Link href="/dashboard/classes" className="block px-4 py-3 rounded hover:bg-white/10 transition-colors font-sans text-sm uppercase tracking-widest">
                    My Classes
                </Link>
                <Link href="/dashboard/billing" className="block px-4 py-3 rounded hover:bg-white/10 transition-colors font-sans text-sm uppercase tracking-widest">
                    Plan & Billing
                </Link>
                <Link href="/dashboard/profile" className="block px-4 py-3 rounded hover:bg-white/10 transition-colors font-sans text-sm uppercase tracking-widest">
                    Profile
                </Link>
                <a
                    href="mailto:support@shaktiyoga.com?subject=Support Request&body=Hi, I need help with..."
                    className="block px-4 py-3 rounded hover:bg-white/10 transition-colors font-sans text-sm uppercase tracking-widest opacity-70"
                >
                    Support
                </a>
            </nav>

            <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center font-bold text-xs">
                        JS
                    </div>
                    <div className="text-sm">
                        <div className="font-bold">Jnanesh S.</div>
                        <div className="text-xs opacity-70">Member</div>
                    </div>
                </div>
                <Link href="/" className="block mt-2 text-xs text-center opacity-50 hover:opacity-100 uppercase tracking-widest">
                    Sign Out
                </Link>
            </div>
        </aside>
    );
}
