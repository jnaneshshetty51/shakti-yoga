import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { uploadFile, deleteFile, mediaSrc, toStorageKey } from '@/lib/storage';
import { rateLimit } from '@/lib/rate-limit';
import { readImageUpload } from '@/lib/image-upload';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = await verifyToken(token);
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { allowed, retryAfterSeconds } = rateLimit(`avatar:${payload.id}`, 10, 60 * 60 * 1000);
        if (!allowed) {
            return NextResponse.json(
                { error: 'Too many uploads. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
            );
        }

        const img = await readImageUpload(request);
        if (!img.ok) return NextResponse.json({ error: img.error }, { status: img.status });

        const key = `avatars/${payload.id}-${Date.now()}.${img.ext}`;
        const storedKey = await uploadFile(img.file, key, { contentType: img.contentType });
        const src = mediaSrc(storedKey);

        const previous = await prisma.user.findUnique({
            where: { id: payload.id },
            select: { avatarUrl: true },
        });

        await prisma.user.update({ where: { id: payload.id }, data: { avatarUrl: src } });

        if (previous?.avatarUrl) {
            const oldKey = toStorageKey(previous.avatarUrl);
            if (oldKey && oldKey.startsWith('avatars/')) deleteFile(oldKey).catch(() => { });
        }

        return NextResponse.json({ avatarUrl: src });
    } catch (error) {
        console.error('Avatar upload error:', error);
        return NextResponse.json({ error: 'Could not upload image. Please try again.' }, { status: 500 });
    }
}
