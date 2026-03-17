'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import VideoRoom from '@/components/live/VideoRoom';

export default function LiveClassPage() {
    const params = useParams();
    const [roomData, setRoomData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        joinClass();
    }, []);

    const joinClass = async () => {
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
        } catch (error: any) {
            console.error('Failed to join class:', error);
            setError(error.message || 'Failed to join class');
        } finally {
            setLoading(false);
        }
    };

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
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <div className="text-center text-white max-w-md">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold mb-2">Unable to Join</h2>
                    <p className="text-gray-400 mb-6">{error}</p>
                    <a
                        href="/live"
                        className="inline-block px-6 py-3 bg-primary text-white font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors"
                    >
                        Back to Live Classes
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-gray-900">
            <VideoRoom roomUrl={roomData.roomUrl} token={roomData.token} />
        </div>
    );
}
