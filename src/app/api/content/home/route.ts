import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getHomeContent } from '@/lib/content-home';

export const dynamic = 'force-dynamic';

/**
 * Curated bundle for the app Home screen — one featured reel, a recommended
 * article, the latest post, a pinned announcement, and (once the member has
 * engaged with a few items) a "more like this" rail keyed on their top category.
 */
export async function GET() {
    const session = await getSession();
    const data = await getHomeContent(session?.id ?? null);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
