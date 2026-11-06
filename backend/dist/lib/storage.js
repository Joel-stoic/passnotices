"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getS3Client = getS3Client;
exports.getR2Bucket = getR2Bucket;
exports.uploadToR2 = uploadToR2;
exports.downloadFromR2 = downloadFromR2;
exports.deleteFromR2 = deleteFromR2;
require("dotenv/config");
const client_s3_1 = require("@aws-sdk/client-s3");
let s3ClientInstance = null;
function getS3Client() {
    if (!s3ClientInstance) {
        const accountId = process.env.R2_ACCOUNT_ID;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
        if (!accountId || !accessKeyId || !secretAccessKey) {
            console.warn("Warning: Cloudflare R2 environment variables are missing (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)");
        }
        s3ClientInstance = new client_s3_1.S3Client({
            region: "auto",
            endpoint: `https://${accountId || ""}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: accessKeyId || "",
                secretAccessKey: secretAccessKey || "",
            },
        });
    }
    return s3ClientInstance;
}
function getR2Bucket() {
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) {
        throw new Error("Missing R2_BUCKET_NAME environment variable in .env");
    }
    return bucket;
}
// ─────────────────────────────────────────────
// Upload a file buffer to R2
// Returns the R2 key (used as fileUrl in DB)
// ─────────────────────────────────────────────
async function uploadToR2(key, body, contentType) {
    const client = getS3Client();
    const bucket = getR2Bucket();
    await client.send(new client_s3_1.PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
    }));
    return key;
}
// ─────────────────────────────────────────────
// Download a file from R2 into a Buffer
// Used for reading templates + sending attachments
// ─────────────────────────────────────────────
async function downloadFromR2(key) {
    const client = getS3Client();
    const bucket = getR2Bucket();
    const response = await client.send(new client_s3_1.GetObjectCommand({
        Bucket: bucket,
        Key: key,
    }));
    const stream = response.Body;
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
    });
}
// ─────────────────────────────────────────────
// Delete a file from R2
// ─────────────────────────────────────────────
async function deleteFromR2(key) {
    const client = getS3Client();
    const bucket = getR2Bucket();
    await client.send(new client_s3_1.DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
    }));
}
