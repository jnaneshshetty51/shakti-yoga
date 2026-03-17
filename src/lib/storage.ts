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

export async function uploadFile(file: File | Blob, path: string): Promise<string> {
    try {
        const buffer = Buffer.from(await file.arrayBuffer());

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: path,
            Body: buffer,
            ContentType: file.type,
            ACL: "public-read", // Ensure bucket policy allows public read
        });

        await s3Client.send(command);

        // Return the public URL
        return `${process.env.MINIO_ENDPOINT}/${BUCKET_NAME}/${path}`;
    } catch (error) {
        console.error("Error uploading file to MinIO:", error);
        throw new Error("Failed to upload file");
    }
}

export async function deleteFile(path: string): Promise<void> {
    try {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: path,
        });

        await s3Client.send(command);
    } catch (error) {
        console.error("Error deleting file from MinIO:", error);
        throw new Error("Failed to delete file");
    }
}

export function getFileUrl(path: string): string {
    return `${process.env.MINIO_ENDPOINT}/${BUCKET_NAME}/${path}`;
}
