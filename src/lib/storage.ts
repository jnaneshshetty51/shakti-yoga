import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadBucketCommand,
    CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "node:stream";

// Internal endpoint the server talks S3 to (localhost inside the box).
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "http://localhost:9000";

const s3Client = new S3Client({
    region: "us-east-1",
    endpoint: MINIO_ENDPOINT,
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
        secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    },
    forcePathStyle: true, // MinIO
});

const BUCKET_NAME = process.env.MINIO_BUCKET || "shakti-yoga-assets";

/** Object-key prefixes the app is allowed to read/write. */
export const MEDIA_PREFIXES = ["avatars", "staff", "blog", "stories"] as const;
const KEY_RE = new RegExp(`^(${MEDIA_PREFIXES.join("|")})/[A-Za-z0-9][A-Za-z0-9._-]{0,200}$`);

let bucketReady: Promise<void> | null = null;

/** Create the bucket on first use. Objects stay private — reads go through
 *  presigned URLs from /api/media. Cached per process. */
async function ensureBucket(): Promise<void> {
    if (bucketReady) return bucketReady;
    bucketReady = (async () => {
        try {
            await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
        } catch {
            try {
                await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
            } catch (err) {
                const name = (err as { name?: string })?.name;
                if (name !== "BucketAlreadyOwnedByYou" && name !== "BucketAlreadyExists") throw err;
            }
        }
    })().catch((e) => {
        bucketReady = null;
        throw e;
    });
    return bucketReady;
}

const ALLOWED_CONTENT_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
]);

/**
 * Validate + normalise a value into a storage object key. Accepts:
 *   - a bare key           "staff/abc.jpg"
 *   - an /api/media path    "/api/media/staff/abc.jpg"
 *   - a legacy full URL     ".../shakti-yoga-assets/staff/abc.jpg?..."
 * Returns the key, or null if it isn't one of ours / is malformed.
 */
export function toStorageKey(value: string | null | undefined): string | null {
    if (!value) return null;
    let key = value.trim();
    const media = key.indexOf("/api/media/");
    if (media !== -1) key = key.slice(media + "/api/media/".length);
    const bucket = key.indexOf(`/${BUCKET_NAME}/`);
    if (bucket !== -1) key = key.slice(bucket + BUCKET_NAME.length + 2);
    key = key.split("?")[0].replace(/^\/+/, "");
    return KEY_RE.test(key) ? key : null;
}

/** The value we store in the DB and put in <img src>. */
export function mediaSrc(key: string): string {
    return `/api/media/${key}`;
}

/** Fetch an object's stream + metadata (SigV4-signed request to MinIO). */
export async function getObjectStream(key: string): Promise<{
    body: ReadableStream | null;
    contentType?: string;
    contentLength?: number;
}> {
    const res = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    const node = res.Body as Readable | undefined;
    return {
        // In the Node runtime the SDK gives a Node Readable; convert to a web stream.
        body: node ? (Readable.toWeb(node) as unknown as ReadableStream) : null,
        contentType: res.ContentType,
        contentLength: typeof res.ContentLength === "number" ? res.ContentLength : undefined,
    };
}

interface UploadOpts {
    contentType: string;
}

/**
 * Store a file under `prefix/` with a random name. Returns the object KEY
 * (wrap with mediaSrc() for an <img src>).
 */
export async function uploadFile(
    file: File | Blob,
    key: string,
    opts: UploadOpts,
): Promise<string> {
    if (!KEY_RE.test(key)) throw new Error(`Refusing to write key outside an allowed prefix: ${key}`);
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
                ContentDisposition: "inline",
                CacheControl: "public, max-age=31536000, immutable",
            }),
        );
        return key;
    } catch (error) {
        console.error("Error uploading file to MinIO:", error);
        throw new Error("Failed to upload file");
    }
}

export async function deleteFile(keyOrUrl: string): Promise<void> {
    const key = toStorageKey(keyOrUrl);
    if (!key) return;
    try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    } catch (error) {
        console.error("Error deleting file from MinIO:", error);
    }
}

/** @deprecated use toStorageKey */
export const keyFromUrl = toStorageKey;
