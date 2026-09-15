import { NextResponse } from 'next/server';
import { requireDepartment } from '@/lib/admin-auth';
import { rateLimit } from '@/lib/rate-limit';
import { uploadFile, mediaSrc } from '@/lib/storage';
import { validateAudioField } from '@/lib/audio-upload';

/** Admin audio upload for self-hosted AUDIO content (multipart: file). */
export async function POST(request: Request) {
    const admin = await requireDepartment('CONTENT');
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { allowed, retryAfterSeconds } = await rateLimit(`content-audio:${admin.id}`, 20, 60 * 60 * 1000);
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

    const audio = await validateAudioField(form.get('file'));
    if (!audio.ok) return NextResponse.json({ error: audio.error }, { status: audio.status });

    try {
        const key = `content-audio/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${audio.ext}`;
        const storedKey = await uploadFile(audio.buffer, key, { contentType: audio.contentType });
        return NextResponse.json({ url: mediaSrc(storedKey) });
    } catch (error) {
        console.error('Content audio upload error:', error);
        return NextResponse.json({ error: 'Could not upload the audio. Please try again.' }, { status: 500 });
    }
}
