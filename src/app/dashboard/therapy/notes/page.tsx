"use client";

import Link from "next/link";

export default function SessionNotesPage() {
    // Mock data for session notes
    const sessions = [
        {
            id: 1,
            date: "Nov 20, 2025",
            type: "Initial Consultation",
            teacher: "Sarah Cohen",
            notes: "Patient reports lower back pain. Recommended gentle cat-cow stretches and focus on breathwork. Avoid deep forward bends for now."
        },
        {
            id: 2,
            date: "Nov 15, 2025",
            type: "Therapy Session #1",
            teacher: "Sarah Cohen",
            notes: "Good progress on spinal mobility. Introduced supported bridge pose. Patient felt relief after 10 mins."
        }
    ];

    return (
        <div>
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard" className="text-sm font-bold text-text/50 hover:text-primary uppercase tracking-widest">
                    ← Back
                </Link>
                <h1 className="font-serif text-3xl text-primary">Session Notes</h1>
            </div>

            <div className="space-y-6">
                {sessions.map((session) => (
                    <div key={session.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">{session.type}</h3>
                                <div className="text-sm text-text/60">{session.date} • with {session.teacher}</div>
                            </div>
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase tracking-widest rounded-full">
                                Completed
                            </span>
                        </div>

                        <div className="bg-gray-50 p-4 rounded border border-gray-100">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Teacher's Notes</h4>
                            <p className="text-sm text-gray-700 leading-relaxed">
                                {session.notes}
                            </p>
                        </div>
                    </div>
                ))}

                {sessions.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <p className="text-text/60">No session notes available yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
