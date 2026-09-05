import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { uploadFile } from '@/lib/storage';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const form = await request.formData();
        const file = form.get('file');

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }
        if (!ALLOWED.includes(file.type)) {
            return NextResponse.json({ error: 'Use a JPEG, PNG or WebP image' }, { status: 400 });
        }
        if (file.size > MAX_BYTES) {
            return NextResponse.json({ error: 'Image must be 5 MB or smaller' }, { status: 400 });
        }

        const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
        const key = `avatars/${payload.id}-${Date.now()}.${ext}`;
        const url = await uploadFile(file, key);

        await prisma.user.update({
            where: { id: payload.id },
            data: { avatarUrl: url },
        });

        return NextResponse.json({ avatarUrl: url });
    } catch (error) {
        console.error('Avatar upload error:', error);
        return NextResponse.json({ error: 'Could not upload image. Please try again.' }, { status: 500 });
    }
}
