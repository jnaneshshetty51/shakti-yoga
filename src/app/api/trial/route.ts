import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { slot, healthInfo, isConsult } = body;

        // In a real app, verify session, insert booking into DB, and send calendar invite
        console.log('Trial booking received:', { slot, healthInfo, isConsult });

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 800));

        return NextResponse.json({ 
            success: true, 
            message: isConsult ? 'Consultation booked successfully' : 'Trial booked successfully',
            booking: {
                slot,
                status: 'confirmed'
            }
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to book trial' },
            { status: 500 }
        );
    }
}
