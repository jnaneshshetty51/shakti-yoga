/** Shared image-upload validation: don't trust the client's Content-Type. */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};

/** Sniff the real image type from magic bytes, or null. */
export function sniffImageType(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
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

interface Validated {
    ok: true;
    file: File;
    buffer: Buffer;
    contentType: 'image/jpeg' | 'image/png' | 'image/webp';
    ext: string;
}
interface Invalid {
    ok: false;
    status: number;
    error: string;
}

/**
 * Pull `field` (default "file") out of a multipart request and validate it as a
 * JPEG/PNG/WebP image whose contents match its declared type.
 */
export async function readImageUpload(request: Request, field = 'file'): Promise<Validated | Invalid> {
    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return { ok: false, status: 400, error: 'Invalid form data' };
    }
    const file = form.get(field);
    if (!(file instanceof File)) {
        return { ok: false, status: 400, error: 'No image uploaded' };
    }
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
        return { ok: false, status: 400, error: 'Image must be between 1 byte and 5 MB' };
    }
    if (!(file.type in EXT)) {
        return { ok: false, status: 400, error: 'Use a JPEG, PNG or WebP image' };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const realType = sniffImageType(buffer);
    if (!realType || realType !== file.type) {
        return { ok: false, status: 400, error: 'File contents do not match a JPEG, PNG or WebP image' };
    }
    return { ok: true, file, buffer, contentType: realType, ext: EXT[realType] };
}
