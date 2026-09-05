import { NextResponse } from 'next/server';

// Fallback trial options
const FALLBACK_TRIAL_OPTIONS = {
    goals: ["Stress Relief", "Flexibility", "Strength", "Weight Loss", "Peace", "Better Sleep", "Posture"],
    medicalIssues: ["Back Pain", "Neck Pain", "Anxiety", "Insomnia", "Digestive Issues", "Respiratory", "Hormonal"]
};

export async function GET() {
    try {
        // In a full implementation, you would store these in a database table
        // For now, we return configurable options that can be managed via admin

        // Try to fetch from a potential TrialOption model (if it exists)
        // For now, just return the fallback with ability to customize via SiteStats or similar

        return NextResponse.json(FALLBACK_TRIAL_OPTIONS);
    } catch (error) {
        console.error('Error fetching trial options:', error);
        return NextResponse.json(FALLBACK_TRIAL_OPTIONS);
    }
}