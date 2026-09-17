import { sniffImageType } from '@/lib/image-upload';

/** Private therapy-module attachments run larger than avatar-sized images (scan reports, PDFs). */
export const MAX_THERAPY_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

const EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
};

function isPdf(buf: Buffer): boolean {
    return buf.length >= 5 && buf.toString('ascii', 0, 5) === '%PDF-';
}

interface Validated {
    ok: true;
    buffer: Buffer;
    contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
    ext: string;
    originalName: string;
}
interface Invalid {
    ok: false;
    status: number;
    error: string;
}

/**
 * Validate a therapy-module attachment field: JPEG/PNG/WebP or PDF, contents
 * sniffed against magic bytes rather than trusted from the client's declared
 * type — same discipline as lib/image-upload.ts, extended to also allow PDF
 * since clinical attachments (assessment reports, scans) are usually PDFs.
 */
export async function validateTherapyAttachment(value: FormDataEntryValue | null): Promise<Validated | Invalid> {
    if (!(value instanceof File)) {
        return { ok: false, status: 400, error: 'No file uploaded' };
    }
    if (value.size === 0 || value.size > MAX_THERAPY_ATTACHMENT_BYTES) {
        return { ok: false, status: 400, error: 'File must be between 1 byte and 10 MB' };
    }
    if (!(value.type in EXT)) {
        return { ok: false, status: 400, error: 'Use a JPEG, PNG, WebP image or a PDF' };
    }
    const buffer = Buffer.from(await value.arrayBuffer());
    if (value.type === 'application/pdf') {
        if (!isPdf(buffer)) return { ok: false, status: 400, error: 'File contents do not match a PDF' };
        return { ok: true, buffer, contentType: 'application/pdf', ext: 'pdf', originalName: value.name };
    }
    const realType = sniffImageType(buffer);
    if (!realType || realType !== value.type) {
        return { ok: false, status: 400, error: 'File contents do not match a JPEG, PNG or WebP image' };
    }
    return { ok: true, buffer, contentType: realType, ext: EXT[realType], originalName: value.name };
}
