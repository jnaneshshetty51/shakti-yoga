"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Stats {
    activeMembers: number;
    trialUsers: number;
    mrr: number;
    pendingBookings: number;
}
interface Activity {
    id: string;
    type: string;
    message: string;
    timestamp: string;
}

const DOT: Record<string, string> = {
    signup: "bg-green-500",
    payment: "bg-yellow-500",
    booking: "bg-blue-500",
    trial: "bg-secondary",
    lead: "bg-purple-500",
};

function inr(n: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<Stats>({ activeMembers: 0, trialUsers: 0, mrr: 0, pendingBookings: 0 });
    const [activity, setActivity] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [s, d] = await Promise.all([
                    fetch("/api/admin/stats").then((r) => (r.ok ? r.json() : null)),
                    fetch("/api/admin/dashboard").then((r) => (r.ok ? r.json() : null)),
                ]);
                if (s) setStats(s);
                if (d?.recentActivity) setActivity(d.recentActivity);
            } catch (e) {
                console.error("Admin dashboard load error:", e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return (
            <div>
                <h1 className="font-serif text-3xl text-gray-800 mb-8">Dashboard Overview</h1>
                <div className="text-gray-500">Loading…</div>
            </div>
        );
    }

    const cards = [
        { label: "Active Members", value: stats.activeMembers, className: "text-primary" },
        { label: "Monthly Revenue", value: inr(stats.mrr), className: "text-gray-800" },
        { label: "Active Trials", value: stats.trialUsers, className: "text-secondary" },
        { label: "Pending Bookings", value: stats.pendingBookings, className: "text-orange-500" },
    ];

    return (
        <div>
            <h1 className="font-serif text-3xl text-gray-800 mb-8">Dashboard Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {cards.map((c) => (
                    <div key={c.label} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{c.label}</div>
                        <div className={`text-3xl font-bold ${c.className}`}>{c.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Link href="/admin/users" className="p-4 border border-gray-100 rounded hover:bg-gray-50 text-center transition-colors">
                            <div className="text-2xl mb-2">👤</div>
                            <div className="text-sm font-bold text-gray-600">Users</div>
                        </Link>
                        <Link href="/admin/classes" className="p-4 border border-gray-100 rounded hover:bg-gray-50 text-center transition-colors">
                            <div className="text-2xl mb-2">🧘‍♀️</div>
                            <div className="text-sm font-bold text-gray-600">Classes</div>
                        </Link>
                        <Link href="/admin/content" className="p-4 border border-gray-100 rounded hover:bg-gray-50 text-center transition-colors">
                            <div className="text-2xl mb-2">📝</div>
                            <div className="text-sm font-bold text-gray-600">Content</div>
                        </Link>
                        <Link href="/admin/availability" className="p-4 border border-gray-100 rounded hover:bg-gray-50 text-center transition-colors">
                            <div className="text-2xl mb-2">🕐</div>
                            <div className="text-sm font-bold text-gray-600">Availability</div>
                        </Link>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Recent Activity</h3>
                    {activity.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No recent activity.</p>
                    ) : (
                        <div className="space-y-4">
                            {activity.slice(0, 8).map((a) => (
                                <div key={a.id} className="flex gap-3 text-sm">
                                    <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${DOT[a.type] || "bg-gray-400"}`} />
                                    <div>
                                        <p className="text-gray-700">{a.message}</p>
                                        <p className="text-gray-400 text-xs">{a.timestamp}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
