/** Shared video-upload validation: don't trust the client's Content-Type. */

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB — reels run ~10-60s

const EXT: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
};

/**
 * Sniff whether a buffer looks like an ISO-BMFF video container (MP4/MOV —
 * both use the same `ftyp` box near the start of the file). Magic bytes alone
 * can't reliably tell MP4 from MOV apart, so this only confirms "is a video
 * container", not which one — the declared `file.type` still decides the
 * extension/content-type.
 */
export function looksLikeIsoBmffVideo(buf: Buffer): boolean {
    return buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp';
}

interface Validated {
    ok: true;
    file: File;
    buffer: Buffer;
    contentType: 'video/mp4' | 'video/quicktime';
    ext: string;
}
interface Invalid {
    ok: false;
    status: number;
    error: string;
}

/** Validate an already-extracted form field as an MP4/MOV video (body read only once). */
export async function validateVideoField(value: FormDataEntryValue | null): Promise<Validated | Invalid> {
    const file = value;
    if (!(file instanceof File)) {
        return { ok: false, status: 400, error: 'No video uploaded' };
    }
    if (file.size === 0 || file.size > MAX_VIDEO_BYTES) {
        return { ok: false, status: 400, error: 'Video must be between 1 byte and 100 MB' };
    }
    if (!(file.type in EXT)) {
        return { ok: false, status: 400, error: 'Use an MP4 or MOV video' };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!looksLikeIsoBmffVideo(buffer)) {
        return { ok: false, status: 400, error: 'File contents do not match an MP4 or MOV video' };
    }
    const contentType = file.type as 'video/mp4' | 'video/quicktime';
    return { ok: true, file, buffer, contentType, ext: EXT[contentType] };
}
