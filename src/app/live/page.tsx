'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LiveClass {
    id: string;
    title: string;
    description?: string;
    scheduledAt: string;
    status: string;
    teacher: {
        name: string;
    };
    _count: {
        participants: number;
    };
}

export default function LiveClassesPage() {
    const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLiveClasses();
    }, []);

    const fetchLiveClasses = async () => {
        try {
            const response = await fetch('/api/live-classes');
            if (response.ok) {
                const data = await response.json();
                setLiveClasses(data.liveClasses);
            }
        } catch (error) {
            console.error('Failed to fetch live classes:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="text-6xl mb-4">📹</div>
                    <p className="text-xl text-gray-600">Loading live classes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="mb-8">
                <h1 className="font-serif text-4xl text-primary mb-2">Live Classes</h1>
                <p className="text-gray-600">Join live yoga sessions with our expert teachers</p>
            </div>

            {liveClasses.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🧘</div>
                    <h2 className="font-serif text-2xl text-gray-700 mb-2">No live classes scheduled</h2>
                    <p className="text-gray-600">Check back soon for upcoming sessions</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {liveClasses.map((liveClass) => (
                        <div key={liveClass.id} className="bg-white p-6 rounded-lg shadow-sm border border-primary/10 hover:shadow-md transition-shadow">
                            {liveClass.status === 'LIVE' && (
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500 text-white text-xs font-bold uppercase rounded mb-3">
                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                    Live Now
                                </div>
                            )}

                            {liveClass.status === 'SCHEDULED' && (
                                <div className="inline-block px-3 py-1 bg-blue-500 text-white text-xs font-bold uppercase rounded mb-3">
                                    Scheduled
                                </div>
                            )}

                            <h3 className="font-serif text-xl text-primary mb-2">{liveClass.title}</h3>

                            {liveClass.description && (
                                <p className="text-sm text-gray-600 mb-3">{liveClass.description}</p>
                            )}

                            <div className="space-y-2 mb-4">
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                    {liveClass.teacher.name}
                                </p>
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                    </svg>
                                    {new Date(liveClass.scheduledAt).toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                    </svg>
                                    {liveClass._count.participants} participant{liveClass._count.participants !== 1 ? 's' : ''}
                                </p>
                            </div>

                            <Link
                                href={`/live/${liveClass.id}`}
                                className="block text-center px-4 py-2 bg-primary text-white font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors"
                            >
                                {liveClass.status === 'LIVE' ? 'Join Now' : 'View Details'}
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
