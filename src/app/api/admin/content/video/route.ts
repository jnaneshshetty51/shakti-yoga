import { NextResponse } from 'next/server';
import { requireDepartment } from '@/lib/admin-auth';
import { rateLimit } from '@/lib/rate-limit';
import { uploadFile, mediaSrc } from '@/lib/storage';
import { validateVideoField } from '@/lib/video-upload';

/** Admin video upload for self-hosted Reel clips (multipart: file). Reel-only, so no `kind`. */
export async function POST(request: Request) {
    const admin = await requireDepartment('CONTENT');
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { allowed, retryAfterSeconds } = rateLimit(`content-video:${admin.id}`, 10, 60 * 60 * 1000);
    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many uploads. Try again later.' },
            { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
        );
    }

    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const video = await validateVideoField(form.get('file'));
    if (!video.ok) return NextResponse.json({ error: video.error }, { status: video.status });

    try {
        const key = `content/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${video.ext}`;
        const storedKey = await uploadFile(video.buffer, key, { contentType: video.contentType });
        return NextResponse.json({ url: mediaSrc(storedKey) });
    } catch (error) {
        console.error('Content video upload error:', error);
        return NextResponse.json({ error: 'Could not upload the video. Please try again.' }, { status: 500 });
    }
}
