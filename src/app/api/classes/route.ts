import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getClassFeed } from '@/lib/class-feed';

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        return NextResponse.json(await getClassFeed(session.id));
    } catch (error) {
        console.error('Classes API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
