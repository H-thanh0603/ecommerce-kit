import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from "crypto";

/** So sánh secret/độ dài bất kỳ không rò rỉ timing (length mismatch → false ngay). */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(String(a), "utf8");
  const bb = Buffer.from(String(b), "utf8");
  if (ba.length !== bb.length || ba.length === 0) return false;
  return timingSafeEqual(ba, bb);
}

/** So sánh hex digest cùng độ dài (khác độ dài → false, không throw). */
export function safeEqualHex(a: string, b: string): boolean {
  return safeEqual(String(a).toLowerCase(), String(b).toLowerCase());
}

/**
 * Encrypt-at-rest cho secret nhạy cảm trong DB (mfaSecret…): AES-256-GCM,
 * key phái sinh từ AUTH_SECRET. Format: `enc:v1:<iv>:<tag>:<ciphertext>` (base64).
 * decryptSecret chấp nhận giá trị plaintext cũ (không prefix) → trả nguyên văn,
 * để giá trị lưu trước khi có encryption vẫn verify được (upgrade-on-read ở caller).
 */
const ENC_PREFIX = "enc:v1:";

function secretBoxKey(): Buffer {
  const raw = process.env.AUTH_SECRET || "dev-only-change-me";
  return scryptSync(raw, "ek-secret-box-v1", 32);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretBoxKey(), iv);
  const ct = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

export function decryptSecret(stored: string): string {
  const s = String(stored || "");
  if (!s.startsWith(ENC_PREFIX)) return s; // plaintext cũ — chưa mã hóa
  try {
    const [ivB64, tagB64, ctB64] = s.slice(ENC_PREFIX.length).split(":");
    const decipher = createDecipheriv("aes-256-gcm", secretBoxKey(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return ""; // sai key/đã bị sửa → coi như secret hỏng, không verify pass
  }
}

/** Giá trị có phải đã mã hóa (để caller upgrade-on-read legacy plaintext)? */
export function isEncryptedSecret(stored: string): boolean {
  return String(stored || "").startsWith(ENC_PREFIX);
}
