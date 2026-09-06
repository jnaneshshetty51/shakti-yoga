import { NextResponse } from 'next/server';
import { toStorageKey, getObjectStream } from '@/lib/storage';

/**
 * Media proxy. Serves a private MinIO object at a stable path
 *   /api/media/staff/abc123.jpg
 * The app fetches it from MinIO over a SigV4-signed request (SDK credentials);
 * the bucket has no public access and its address is never exposed to the browser.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
    const { key: parts } = await ctx.params;
    const key = toStorageKey(parts.join('/'));
    if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    try {
        const obj = await getObjectStream(key);
        if (!obj.body) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        return new NextResponse(obj.body as ReadableStream, {
            status: 200,
            headers: {
                'Content-Type': obj.contentType ?? 'application/octet-stream',
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
                ...(obj.contentLength ? { 'Content-Length': String(obj.contentLength) } : {}),
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch (error) {
        const name = (error as { name?: string })?.name;
        if (name === 'NoSuchKey' || name === 'NotFound') {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        console.error('[media] fetch failed', key, error);
        return NextResponse.json({ error: 'Media unavailable' }, { status: 502 });
    }
}
