"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Stats {
    activeMembers: number;
    trialUsers: number;
    mrr: number;
    pendingBookings: number;
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<Stats>({
        activeMembers: 0,
        trialUsers: 0,
        mrr: 0,
        pendingBookings: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const response = await fetch('/api/admin/stats');
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div>
                <h1 className="font-serif text-3xl text-gray-800 mb-8">Dashboard Overview</h1>
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="font-serif text-3xl text-gray-800 mb-8">Dashboard Overview</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Active Members</div>
                    <div className="text-3xl font-bold text-primary">{stats.activeMembers}</div>
                    <div className="text-xs text-green-600 mt-2">↑ 12% vs last month</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Monthly Revenue</div>
                    <div className="text-3xl font-bold text-gray-800">${stats.mrr.toFixed(2)}</div>
                    <div className="text-xs text-green-600 mt-2">↑ 5% vs last month</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Active Trials</div>
                    <div className="text-3xl font-bold text-secondary">{stats.trialUsers}</div>
                    <div className="text-xs text-gray-500 mt-2">3 expiring soon</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Pending Bookings</div>
                    <div className="text-3xl font-bold text-orange-500">{stats.pendingBookings}</div>
                    <div className="text-xs text-gray-500 mt-2">Action required</div>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Quick Actions */}
                <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Link href="/admin/users" className="p-4 border border-gray-100 rounded hover:bg-gray-50 text-center transition-colors">
                            <div className="text-2xl mb-2">👤</div>
                            <div className="text-sm font-bold text-gray-600">Add User</div>
                        </Link>
                        <Link href="/admin/classes" className="p-4 border border-gray-100 rounded hover:bg-gray-50 text-center transition-colors">
                            <div className="text-2xl mb-2">🧘‍♀️</div>
                            <div className="text-sm font-bold text-gray-600">Create Class</div>
                        </Link>
                        <Link href="/admin/content" className="p-4 border border-gray-100 rounded hover:bg-gray-50 text-center transition-colors">
                            <div className="text-2xl mb-2">📝</div>
                            <div className="text-sm font-bold text-gray-600">Write Blog</div>
                        </Link>
                        <Link href="/admin/community" className="p-4 border border-gray-100 rounded hover:bg-gray-50 text-center transition-colors">
                            <div className="text-2xl mb-2">💬</div>
                            <div className="text-sm font-bold text-gray-600">Update Group</div>
                        </Link>
                    </div>
                </div>

                {/* Recent Activity Feed (Mock) */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                        <div className="flex gap-3 text-sm">
                            <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500 shrink-0"></div>
                            <div>
                                <span className="font-bold text-gray-700">New Signup</span>
                                <p className="text-gray-500 text-xs">Mike Ross started a trial.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 text-sm">
                            <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 shrink-0"></div>
                            <div>
                                <span className="font-bold text-gray-700">Booking Confirmed</span>
                                <p className="text-gray-500 text-xs">Sarah Jones booked Therapy.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 text-sm">
                            <div className="w-2 h-2 mt-1.5 rounded-full bg-yellow-500 shrink-0"></div>
                            <div>
                                <span className="font-bold text-gray-700">Payment Received</span>
                                <p className="text-gray-500 text-xs">$59.00 from Jnanesh Shetty.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
