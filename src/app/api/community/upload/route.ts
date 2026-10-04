import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { uploadFile, mediaSrc } from '@/lib/storage';
import { rateLimit } from '@/lib/rate-limit';
import { readImageUpload } from '@/lib/image-upload';

export const dynamic = 'force-dynamic';

/** POST /api/community/upload — member image upload for community posts. */
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { allowed, retryAfterSeconds } = await rateLimit(`community-upload:${session.id}`, 20, 60 * 60 * 1000);
        if (!allowed) {
            return NextResponse.json(
                { error: 'Too many uploads. Please wait a bit.' },
                { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
            );
        }

        const img = await readImageUpload(request);
        if (!img.ok) return NextResponse.json({ error: img.error }, { status: img.status });

        const key = `community/${session.id}-${Date.now()}.${img.ext}`;
        const storedKey = await uploadFile(img.buffer, key, { contentType: img.contentType });
        const url = mediaSrc(storedKey);

        return NextResponse.json({ url });
    } catch (error) {
        console.error('[community/upload] error:', error);
        return NextResponse.json({ error: 'Could not upload image. Please try again.' }, { status: 500 });
    }
}
