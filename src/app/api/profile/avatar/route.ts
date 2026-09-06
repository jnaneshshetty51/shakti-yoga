import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { uploadFile, deleteFile, keyFromUrl } from '@/lib/storage';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = new Map<string, string>([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
]);

/** Sniff the real file type from magic bytes — don't trust the client's Content-Type. */
function sniffImageType(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
    if (
        buf.length >= 8 &&
        buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
        buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
    ) return 'image/png';
    if (
        buf.length >= 12 &&
        buf.toString('ascii', 0, 4) === 'RIFF' &&
        buf.toString('ascii', 8, 12) === 'WEBP'
    ) return 'image/webp';
    return null;
}

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

        let form: FormData;
        try {
            form = await request.formData();
        } catch {
            return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
        }
        const file = form.get('file');

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }
        if (file.size === 0 || file.size > MAX_BYTES) {
            return NextResponse.json({ error: 'Image must be between 1 byte and 5 MB' }, { status: 400 });
        }
        if (!ALLOWED.has(file.type)) {
            return NextResponse.json({ error: 'Use a JPEG, PNG or WebP image' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const realType = sniffImageType(buffer);
        if (!realType || realType !== file.type) {
            return NextResponse.json({ error: 'File contents do not match a JPEG, PNG or WebP image' }, { status: 400 });
        }

        const ext = ALLOWED.get(realType)!;
        const key = `avatars/${payload.id}-${Date.now()}.${ext}`;
        const url = await uploadFile(file, key, { contentType: realType, acl: 'public-read' });

        const previous = await prisma.user.findUnique({
            where: { id: payload.id },
            select: { avatarUrl: true },
        });

        await prisma.user.update({
            where: { id: payload.id },
            data: { avatarUrl: url },
        });

        // Best-effort cleanup of the replaced avatar.
        if (previous?.avatarUrl) {
            const oldKey = keyFromUrl(previous.avatarUrl);
            if (oldKey && oldKey.startsWith('avatars/')) {
                deleteFile(oldKey).catch(() => { });
            }
        }

        return NextResponse.json({ avatarUrl: url });
    } catch (error) {
        console.error('Avatar upload error:', error);
        return NextResponse.json({ error: 'Could not upload image. Please try again.' }, { status: 500 });
    }
}
