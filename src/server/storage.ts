import { createHash, createHmac } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

/**
 * Lưu ảnh sản phẩm: local `public/uploads` mặc định, S3/R2 khi có env.
 * - Local OK cho VPS (nhớ mount volume, đã có trong docker-compose).
 * - Vercel filesystem mất sau mỗi deploy → bắt buộc S3/R2.
 */

export function s3Configured() {
  return Boolean(
    process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY,
  );
}

export function uploadDir() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
}

function hashHex(data: string | Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Buffer | string, data: string) {
  return createHmac("sha256", key).update(data).digest();
}

/** Chữ ký SigV4 cho PUT — pure để test được (không gọi mạng ở đây). */
export function signS3Put(opts: {
  endpoint: string;
  bucket: string;
  key: string;
  accessKey: string;
  secretKey: string;
  region: string;
  mime: string;
  payloadHash: string;
  amzDate: string;
}) {
  const host = new URL(opts.endpoint).host;
  const canonicalUri = `/${opts.bucket}/${opts.key}`;
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${opts.payloadHash}\nx-amz-date:${opts.amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, opts.payloadHash].join("\n");
  const date = opts.amzDate.slice(0, 8);
  const scope = `${date}/${opts.region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", opts.amzDate, scope, hashHex(canonicalRequest)].join("\n");
  const kDate = hmac(`AWS4${opts.secretKey}`, date);
  const kRegion = hmac(kDate, opts.region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  return `AWS4-HMAC-SHA256 Credential=${opts.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

export async function saveImage(
  buf: Buffer,
  filename: string,
  mime: string,
): Promise<{ ok: boolean; url?: string; message?: string }> {
  if (!s3Configured()) {
    const dir = uploadDir();
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buf);
    return { ok: true, url: `/uploads/${filename}` };
  }
  try {
    const endpoint = process.env.S3_ENDPOINT!.replace(/\/$/, "");
    const bucket = process.env.S3_BUCKET!;
    const region = process.env.S3_REGION || "auto";
    const now = new Date();
    const amzDate = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    const payloadHash = hashHex(buf);
    const auth = signS3Put({
      endpoint,
      bucket,
      key: filename,
      accessKey: process.env.S3_ACCESS_KEY!,
      secretKey: process.env.S3_SECRET_KEY!,
      region,
      mime,
      payloadHash,
      amzDate,
    });
    const publicBase = (process.env.S3_PUBLIC_BASE || `${endpoint}/${bucket}`).replace(/\/$/, "");
    const res = await fetch(`${endpoint}/${bucket}/${filename}`, {
      method: "PUT",
      headers: {
        Authorization: auth,
        "Content-Type": mime,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
      },
      body: new Uint8Array(buf),
    });
    if (!res.ok) return { ok: false, message: `S3 từ chối: ${res.status}` };
    return { ok: true, url: `${publicBase}/${filename}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Lỗi upload S3" };
  }
}
