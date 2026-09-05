'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import VideoRoom from '@/components/live/VideoRoom';

interface RoomData {
    roomUrl: string;
    token: string;
}

export default function LiveClassPage() {
    const params = useParams();
    const [roomData, setRoomData] = useState<RoomData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const joinClass = useCallback(async () => {
        try {
            const response = await fetch(`/api/live-classes/${params.id}/join`, {
                method: 'POST',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to join class');
            }

            const data = await response.json();
            setRoomData(data);
        } catch (error) {
            console.error('Failed to join class:', error);
            setError(error instanceof Error ? error.message : 'Failed to join class');
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        joinClass();
    }, [joinClass]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <div className="text-center text-white">
                    <div className="text-6xl mb-4">📹</div>
                    <p className="text-xl">Joining live class...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900 px-4">
                <div className="text-center text-white max-w-md bg-gray-800 p-8 rounded-lg border border-gray-700 shadow-xl">
                    <div className="text-5xl mb-4">🔒</div>
                    <h2 className="text-2xl font-bold mb-2">Membership Required</h2>
                    <p className="text-gray-300 text-sm mb-6 leading-relaxed">{error}</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/programs"
                            className="px-6 py-3 bg-secondary text-white font-bold uppercase tracking-widest text-xs rounded hover:bg-primary transition-colors"
                        >
                            View Membership Plans
                        </Link>
                        <Link
                            href="/live"
                            className="px-6 py-3 border border-gray-600 text-gray-300 font-bold uppercase tracking-widest text-xs rounded hover:bg-gray-700 transition-colors"
                        >
                            Back to Schedule
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!roomData) {
        return null;
    }

    return (
        <div className="h-screen bg-gray-900">
            <VideoRoom roomUrl={roomData.roomUrl} token={roomData.token} />
        </div>
    );
}
