import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadBucketCommand,
    CreateBucketCommand,
    PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import { SITE_URL } from "@/lib/site";

// Internal endpoint the server talks S3 to (localhost inside the box).
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "http://localhost:9000";

// Initialize S3 Client for MinIO
const s3Client = new S3Client({
    region: "us-east-1", // MinIO default region
    endpoint: MINIO_ENDPOINT,
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
        secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    },
    forcePathStyle: true, // Required for MinIO
});

const BUCKET_NAME = process.env.MINIO_BUCKET || "shakti-yoga-assets";

// Prefixes whose objects are meant to be publicly readable (served via nginx /minio/).
const PUBLIC_PREFIXES = ["avatars/", "staff/", "blog/", "stories/"];

let bucketReady: Promise<void> | null = null;

/**
 * Create the bucket on first use and grant anonymous read on the public prefixes.
 * MinIO's per-object ACLs are unreliable, so a bucket policy is the source of truth.
 * Cached — runs at most once per process (retries if it threw).
 */
async function ensureBucket(): Promise<void> {
    if (bucketReady) return bucketReady;
    bucketReady = (async () => {
        try {
            await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
        } catch {
            try {
                await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
            } catch (err) {
                // Someone else may have created it between Head and Create.
                const name = (err as { name?: string })?.name;
                if (name !== "BucketAlreadyOwnedByYou" && name !== "BucketAlreadyExists") throw err;
            }
        }
        const policy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: { AWS: ["*"] },
                    Action: ["s3:GetObject"],
                    Resource: PUBLIC_PREFIXES.map((p) => `arn:aws:s3:::${BUCKET_NAME}/${p}*`),
                },
            ],
        };
        await s3Client.send(
            new PutBucketPolicyCommand({ Bucket: BUCKET_NAME, Policy: JSON.stringify(policy) }),
        ).catch((e) => console.error("[storage] could not set bucket policy:", e));
    })().catch((e) => {
        bucketReady = null; // allow a retry next call
        throw e;
    });
    return bucketReady;
}

/**
 * Public, browser-reachable base for stored objects. In prod nginx proxies
 * `/minio/` -> the MinIO container, so a stored key is served at
 * `${SITE_URL}/minio/${bucket}/${key}` over HTTPS. `MEDIA_PUBLIC_BASE` overrides.
 */
const PUBLIC_BASE = (
    process.env.MEDIA_PUBLIC_BASE?.replace(/\/+$/, "") ||
    (MINIO_ENDPOINT.includes("localhost") || MINIO_ENDPOINT.includes("127.0.0.1")
        ? `${SITE_URL}/minio`
        : MINIO_ENDPOINT)
);

function publicUrl(key: string): string {
    return `${PUBLIC_BASE}/${BUCKET_NAME}/${key}`;
}

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
        await ensureBucket();
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

        return publicUrl(key);
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

/** Derive the storage key from any URL we've ever returned (for deletes). */
export function keyFromUrl(url: string): string | null {
    const marker = `/${BUCKET_NAME}/`;
    const i = url.indexOf(marker);
    if (i === -1) return null;
    const key = url.slice(i + marker.length).split("?")[0];
    return key || null;
}

export function getFileUrl(path: string): string {
    return publicUrl(sanitizeKey(path));
}
