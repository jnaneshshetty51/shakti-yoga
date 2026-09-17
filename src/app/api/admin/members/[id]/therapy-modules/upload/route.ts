import { NextResponse } from 'next/server';
import { requireDepartment } from '@/lib/admin-auth';
import { rateLimit } from '@/lib/rate-limit';
import { uploadFile, mediaSrc } from '@/lib/storage';
import { validateTherapyAttachment } from '@/lib/therapy-attachment-upload';

/** Upload a private attachment for a therapy module (multipart: file). Returns { url, name }. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
    const admin = await requireDepartment('THERAPIST');
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await ctx.params; // present for route-shape consistency; the file isn't scoped by patient in storage

    const { allowed, retryAfterSeconds } = await rateLimit(`therapy-attachment:${admin.id}`, 30, 60 * 60 * 1000);
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

    const file = await validateTherapyAttachment(form.get('file'));
    if (!file.ok) return NextResponse.json({ error: file.error }, { status: file.status });

    try {
        const key = `therapy/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${file.ext}`;
        const storedKey = await uploadFile(file.buffer, key, { contentType: file.contentType });
        return NextResponse.json({ url: mediaSrc(storedKey), name: file.originalName });
    } catch (error) {
        console.error('Therapy attachment upload error:', error);
        return NextResponse.json({ error: 'Could not upload the file. Please try again.' }, { status: 500 });
    }
}
