/** Shared audio-upload validation: don't trust the client's Content-Type. */

export const MAX_AUDIO_BYTES = 60 * 1024 * 1024; // 60 MB — a ~45min guided meditation at 128kbps

const EXT: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
};

/** Sniff whether a buffer's magic bytes match the declared audio content type. */
function looksLikeAudio(buf: Buffer, contentType: string): boolean {
    if (buf.length < 12) return false;
    if (contentType === 'audio/wav' || contentType === 'audio/x-wav') {
        return buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE';
    }
    if (contentType === 'audio/mp4' || contentType === 'audio/x-m4a') {
        return buf.toString('ascii', 4, 8) === 'ftyp';
    }
    // audio/mpeg (MP3): an ID3v2 tag, or a raw MPEG frame sync (11 set bits).
    return buf.toString('ascii', 0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0);
}

interface Validated {
    ok: true;
    file: File;
    buffer: Buffer;
    contentType: string;
    ext: string;
}
interface Invalid {
    ok: false;
    status: number;
    error: string;
}

/** Validate an already-extracted form field as an MP3/M4A/WAV audio file (body read only once). */
export async function validateAudioField(value: FormDataEntryValue | null): Promise<Validated | Invalid> {
    const file = value;
    if (!(file instanceof File)) {
        return { ok: false, status: 400, error: 'No audio uploaded' };
    }
    if (file.size === 0 || file.size > MAX_AUDIO_BYTES) {
        return { ok: false, status: 400, error: 'Audio must be between 1 byte and 60 MB' };
    }
    if (!(file.type in EXT)) {
        return { ok: false, status: 400, error: 'Use an MP3, M4A, or WAV audio file' };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!looksLikeAudio(buffer, file.type)) {
        return { ok: false, status: 400, error: 'File contents do not match an MP3, M4A, or WAV audio file' };
    }
    return { ok: true, file, buffer, contentType: file.type, ext: EXT[file.type] };
}
