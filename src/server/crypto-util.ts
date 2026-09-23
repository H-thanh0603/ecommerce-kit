import { timingSafeEqual } from "crypto";

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
