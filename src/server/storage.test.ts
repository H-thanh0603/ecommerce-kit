import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { s3Configured, saveImage, signS3Put } from "./storage";

describe("storage", () => {
  it("local: lưu và đọc lại đúng bytes", async () => {
    delete process.env.S3_ENDPOINT;
    const dir = mkdtempSync(join(tmpdir(), "upl-"));
    process.env.UPLOAD_DIR = dir;
    const buf = Buffer.from("anh-gia");
    const r = await saveImage(buf, "a.png", "image/png");
    expect(r.ok).toBe(true);
    expect(readFileSync(join(dir, "a.png")).toString()).toBe("anh-gia");
    delete process.env.UPLOAD_DIR;
  });

  it("chữ ký S3 ổn định + đúng định dạng SigV4", () => {
    const base = {
      endpoint: "https://xxx.r2.cloudflarestorage.com",
      bucket: "shop",
      key: "a.png",
      accessKey: "AK",
      secretKey: "SK",
      region: "auto",
      mime: "image/png",
      payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      amzDate: "20260101T000000Z",
    };
    const a = signS3Put(base);
    expect(a).toBe(signS3Put(base));
    expect(a).toMatch(/^AWS4-HMAC-SHA256 Credential=AK\/20260101\/auto\/s3\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/);
  });

  it("thiếu env S3 thì coi như local", () => {
    delete process.env.S3_ENDPOINT;
    delete process.env.S3_BUCKET;
    expect(s3Configured()).toBe(false);
  });
});
