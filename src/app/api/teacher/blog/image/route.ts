import { NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/admin-auth';
import { rateLimit } from '@/lib/rate-limit';
import { uploadFile, mediaSrc } from '@/lib/storage';
import { validateImageField } from '@/lib/image-upload';

/** Teacher image upload for blog posts (thumbnails & inline images). */
export async function POST(request: Request) {
    const teacher = await requireTeacher();
    if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { allowed, retryAfterSeconds } = await rateLimit(`teacher-blog-image:${teacher.id}`, 40, 60 * 60 * 1000);
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

    const img = await validateImageField(form.get('file'));
    if (!img.ok) return NextResponse.json({ error: img.error }, { status: img.status });

    try {
        const key = `blog/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${img.ext}`;
        const storedKey = await uploadFile(img.buffer, key, { contentType: img.contentType });
        return NextResponse.json({ url: mediaSrc(storedKey) });
    } catch (error) {
        console.error('Teacher blog image upload error:', error);
        return NextResponse.json({ error: 'Could not upload the image. Please try again.' }, { status: 500 });
    }
}
