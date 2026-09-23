import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * TOTP (RFC 6238) + recovery code — pure crypto, không thêm dependency.
 * Dùng cho admin MFA; cờ feature `mfa` default OFF.
 */

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** 20-byte secret → base32 (Google Authenticator compatible). */
export function generateTotpSecret(bytes = 20): string {
  const buf = randomBytes(bytes);
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(s: string): Buffer {
  const clean = s.replace(/\s+/g, "").toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secret: string, counter: number, digits = 6): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(bin % 10 ** digits).padStart(digits, "0");
}

/** Code cho thời điểm `atMs` (default = now), step 30s. */
export function totpAt(secret: string, atMs = Date.now(), stepSec = 30): string {
  return hotp(secret, Math.floor(atMs / 1000 / stepSec));
}

/** Verify TOTP — cho lệch ±1 step (clock drift). Constant-time so sánh. */
export function verifyTotp(secret: string, code: string, atMs = Date.now(), stepSec = 30): boolean {
  const c = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(c) || !secret) return false;
  const counter = Math.floor(atMs / 1000 / stepSec);
  const candidates = [hotp(secret, counter - 1), hotp(secret, counter), hotp(secret, counter + 1)];
  let ok = false;
  for (const cand of candidates) {
    const a = Buffer.from(cand);
    const b = Buffer.from(c);
    if (a.length === b.length && timingSafeEqual(a, b)) ok = true;
  }
  return ok;
}

/** otpauth:// URL để quét bằng Google Authenticator / 1Password. */
export function totpUri(secret: string, account: string, issuer = "EcommerceKit"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;
}

/** 10 recovery code dạng xxxx-xxxx — trả về 1 lần lúc bật MFA. */
export function generateRecoveryCodes(n = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < n; i++) {
    const raw = randomBytes(6).toString("hex"); // 12 hex → xxxx-xxxx
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`);
  }
  return codes;
}

/**
 * Verify recovery code dạng xxxxxxxxxx (bỏ dấu) — caller đã hash so sánh
 * bằng bcrypt ngoài file này. Ở đây chỉ normalize.
 */
export function normalizeRecovery(code: string): string {
  return String(code || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
