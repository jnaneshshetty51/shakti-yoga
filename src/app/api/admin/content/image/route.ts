import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { rateLimit } from '@/lib/rate-limit';
import { uploadFile } from '@/lib/storage';
import { validateImageField } from '@/lib/image-upload';

const PREFIX: Record<string, string> = { blog: 'blog', story: 'stories' };

/** Admin image upload for blog thumbnails / story photos (multipart: kind + file). */
export async function POST(request: Request) {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { allowed, retryAfterSeconds } = rateLimit(`content-image:${admin.id}`, 40, 60 * 60 * 1000);
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

    const kind = String(form.get('kind') ?? 'blog');
    const prefix = PREFIX[kind] ?? 'blog';

    const img = await validateImageField(form.get('file'));
    if (!img.ok) return NextResponse.json({ error: img.error }, { status: img.status });

    try {
        const key = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${img.ext}`;
        const url = await uploadFile(img.file, key, { contentType: img.contentType, acl: 'public-read' });
        return NextResponse.json({ url });
    } catch (error) {
        console.error('Content image upload error:', error);
        return NextResponse.json({ error: 'Could not upload the image. Please try again.' }, { status: 500 });
    }
}
