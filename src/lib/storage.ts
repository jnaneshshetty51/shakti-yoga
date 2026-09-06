import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Initialize S3 Client for MinIO
const s3Client = new S3Client({
    region: "us-east-1", // MinIO default region
    endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
        secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    },
    forcePathStyle: true, // Required for MinIO
});

const BUCKET_NAME = process.env.MINIO_BUCKET || "shakti-yoga-assets";

/** Content types we are willing to store and serve. Anything else is rejected. */
const ALLOWED_CONTENT_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
]);

/**
 * Normalise an object key so a caller can never write outside its intended
 * prefix (path traversal, absolute paths, sneaky unicode, overlong keys).
 */
export function sanitizeKey(key: string): string {
    const cleaned = key
        .replace(/\\/g, "/")
        .replace(/\.\.+/g, ".")        // collapse ".." segments
        .replace(/^\/+/, "")           // no leading slash
        .replace(/\/{2,}/g, "/")       // collapse repeated slashes
        .replace(/[^a-zA-Z0-9._/-]/g, "_"); // whitelist charset

    if (!cleaned || cleaned.length > 512 || cleaned.startsWith("/") || cleaned.includes("..")) {
        throw new Error("Invalid storage key");
    }
    return cleaned;
}

interface UploadOpts {
    /** Explicit content type — validated against the allow-list. */
    contentType: string;
    /** Object ACL. Defaults to private; pass "public-read" for assets meant to be linkable. */
    acl?: "private" | "public-read";
}

export async function uploadFile(file: File | Blob, path: string, opts: UploadOpts): Promise<string> {
    const key = sanitizeKey(path);

    if (!ALLOWED_CONTENT_TYPES.has(opts.contentType)) {
        throw new Error(`Unsupported content type: ${opts.contentType}`);
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer());

        await s3Client.send(
            new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                Body: buffer,
                ContentType: opts.contentType,
                // Stop the browser from ever MIME-sniffing a stored object into a script/html.
                ContentDisposition: "inline",
                CacheControl: "public, max-age=31536000, immutable",
                ACL: opts.acl ?? "private",
            }),
        );

        return `${process.env.MINIO_ENDPOINT}/${BUCKET_NAME}/${key}`;
    } catch (error) {
        console.error("Error uploading file to MinIO:", error);
        throw new Error("Failed to upload file");
    }
}

export async function deleteFile(path: string): Promise<void> {
    const key = sanitizeKey(path);
    try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    } catch (error) {
        console.error("Error deleting file from MinIO:", error);
        throw new Error("Failed to delete file");
    }
}

/** Derive the storage key from a public URL we previously returned (for deletes). */
export function keyFromUrl(url: string): string | null {
    const prefix = `${process.env.MINIO_ENDPOINT}/${BUCKET_NAME}/`;
    return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

export function getFileUrl(path: string): string {
    return `${process.env.MINIO_ENDPOINT}/${BUCKET_NAME}/${sanitizeKey(path)}`;
}
