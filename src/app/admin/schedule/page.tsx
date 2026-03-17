"use client";

import { useEffect, useState } from "react";

type ScheduleItem = {
    id: string;
    batchName: string;
    timeSlot: string;
    teacher: string;
    status: string;
    attendanceCount: number;
};

type ScheduleData = {
    schedule: Record<string, ScheduleItem[]>;
    batches: Array<{
        id: string;
        name: string;
        timeSlot: string;
        daysOfWeek: string[];
        teacher: string;
    }>;
};

export default function AdminSchedulePage() {
    const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSchedule() {
            try {
                const response = await fetch('/api/admin/schedule');
                if (response.ok) {
                    const data = await response.json();
                    setScheduleData(data);
                }
            } catch (error) {
                console.error('Failed to fetch schedule:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchSchedule();
    }, []);

    if (loading) {
        return (
            <div>
                <div className="flex justify-between items-center mb-8">
                    <h1 className="font-serif text-3xl text-gray-800">Class Schedule</h1>
                    <button className="px-4 py-2 bg-gray-900 text-white text-sm font-bold uppercase tracking-widest rounded hover:bg-gray-700 transition-colors">
                        Add Class
                    </button>
                </div>
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const allScheduleItems: ScheduleItem[] = scheduleData 
        ? Object.values(scheduleData.schedule).flat()
        : [];

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="font-serif text-3xl text-gray-800">Class Schedule</h1>
                <button className="px-4 py-2 bg-gray-900 text-white text-sm font-bold uppercase tracking-widest rounded hover:bg-gray-700 transition-colors">
                    Add Class
                </button>
            </div>

            <div className="grid md:grid-cols-7 gap-4 mb-8">
                {days.map((day) => (
                    <div key={day} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center font-bold text-gray-800 hover:bg-gray-50 cursor-pointer">
                        {day}
                    </div>
                ))}
            </div>

            {allScheduleItems.length === 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center text-gray-500">
                    No upcoming classes scheduled for the next 7 days.
                </div>
            ) : (
                <div className="space-y-4">
                    {allScheduleItems.map((item) => (
                        <div 
                            key={item.id} 
                            className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center ${
                                item.status === 'Cancelled' ? 'opacity-60' : ''
                            }`}
                        >
                            <div>
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{item.timeSlot}</div>
                                <div className="text-xl font-bold text-gray-800">{item.batchName}</div>
                                <div className="text-sm text-gray-600">Instructor: {item.teacher}</div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-gray-800">{item.attendanceCount}</div>
                                    <div className="text-xs text-gray-500">
                                        {item.status === 'Cancelled' ? 'Cancelled' : 'Registered'}
                                    </div>
                                </div>
                                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">Edit</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
