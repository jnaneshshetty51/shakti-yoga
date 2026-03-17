'use client';

import { useDaily, DailyProvider } from '@daily-co/daily-react';
import { useEffect, useState } from 'react';
import VideoTile from './VideoTile';

export default function VideoRoom({ roomUrl, token }: { roomUrl: string; token: string }) {
    return (
        <DailyProvider>
            <VideoRoomContent roomUrl={roomUrl} token={token} />
        </DailyProvider>
    );
}

function VideoRoomContent({ roomUrl, token }: { roomUrl: string; token: string }) {
    const daily = useDaily();
    const [participants, setParticipants] = useState<any[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    useEffect(() => {
        if (!daily) return;

        daily.join({ url: roomUrl, token }).catch((error) => {
            console.error('Failed to join room:', error);
        });

        // Listen for participant updates
        const updateParticipants = () => {
            if (daily) {
                setParticipants(Object.values(daily.participants()));
            }
        };

        daily.on('participant-joined', updateParticipants);
        daily.on('participant-left', updateParticipants);
        daily.on('participant-updated', updateParticipants);
        daily.on('joined-meeting', updateParticipants);

        return () => {
            daily.leave();
            daily.destroy();
        };
    }, [daily, roomUrl, token]);

    const toggleMute = () => {
        if (daily) {
            daily.setLocalAudio(!isMuted);
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (daily) {
            daily.setLocalVideo(!isVideoOff);
            setIsVideoOff(!isVideoOff);
        }
    };

    const leaveCall = () => {
        if (daily) {
            daily.leave();
            window.location.href = '/live';
        }
    };

    return (
        <div className="h-screen bg-gray-900 flex flex-col">
            {/* Video Grid */}
            <div className="flex-1 p-4 overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full">
                    {participants.map((participant) => (
                        <VideoTile key={participant.session_id} participant={participant} />
                    ))}
                </div>

                {participants.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-white text-center">
                            <div className="text-6xl mb-4">📹</div>
                            <p className="text-xl">Connecting to live class...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="bg-gray-800 p-4 flex items-center justify-center gap-4">
                <button
                    onClick={toggleMute}
                    className={`p-4 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-700'} hover:bg-opacity-80 transition-colors`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? (
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>

                <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-700'} hover:bg-opacity-80 transition-colors`}
                    title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                >
                    {isVideoOff ? (
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A2 2 0 0018 13V7a2 2 0 00-2-2h-.172a2 2 0 01-1.414-.586l-.828-.828A2 2 0 0012.172 3H7.828a2 2 0 00-1.414.586L5.586 4.414A2 2 0 014.172 5H3.707zm.586 5L5 6.586A2 2 0 016.414 6h.172a2 2 0 001.414-.586l.828-.828A2 2 0 0110.172 4h1.656L10 5.828v7.344l-5.707-5.707z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                    )}
                </button>

                <button
                    onClick={leaveCall}
                    className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-full text-white font-bold transition-colors"
                >
                    Leave
                </button>

                <div className="ml-auto text-white text-sm">
                    {participants.length} participant{participants.length !== 1 ? 's' : ''}
                </div>
            </div>
        </div>
    );
}
