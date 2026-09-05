'use client';

import { useVideoTrack, useAudioTrack } from '@daily-co/daily-react';
import type { DailyParticipant } from '@daily-co/daily-js';
import { useEffect, useRef } from 'react';

export default function VideoTile({ participant }: { participant: DailyParticipant }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const videoTrack = useVideoTrack(participant.session_id);
    const audioTrack = useAudioTrack(participant.session_id);

    useEffect(() => {
        if (videoRef.current && videoTrack.track) {
            videoRef.current.srcObject = new MediaStream([videoTrack.track]);
        }
    }, [videoTrack]);

    return (
        <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={participant.local}
                className="w-full h-full object-cover"
            />

            {videoTrack.isOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {participant.user_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                </div>
            )}

            <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded text-white text-sm font-medium">
                {participant.user_name || 'Guest'}
                {participant.local && ' (You)'}
            </div>

            {!videoTrack.isOff && !participant.local && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500 px-2 py-1 rounded text-white text-xs font-bold">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    LIVE
                </div>
            )}

            {audioTrack.isOff && (
                <div className="absolute top-2 left-2 bg-black/70 p-2 rounded">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                    </svg>
                </div>
            )}
        </div>
    );
}
