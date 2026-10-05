import { describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
  safeEqual,
  safeEqualHex,
} from "./crypto-util";

describe("safeEqual", () => {
  it("đúng chuỗi → true, sai nội dung → false, khác độ dài → false không throw", () => {
    expect(safeEqual("secret", "secret")).toBe(true);
    expect(safeEqual("secret", "secreT")).toBe(false);
    expect(() => safeEqual("abc", "abcd")).not.toThrow();
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(false);
  });

  it("safeEqualHex không phân biệt hoa thường hex", () => {
    expect(safeEqualHex("ABCD", "abcd")).toBe(true);
    expect(safeEqualHex("abcd", "abce")).toBe(false);
    expect(safeEqualHex("abcd", "abc")).toBe(false);
  });
});

describe("secret-box (encrypt-at-rest)", () => {
  it("mã hóa → giải mã roundtrip; ciphertext không chứa plaintext", () => {
    process.env.AUTH_SECRET = `box-${Date.now()}-secret`;
    const secret = "JBSWY3DPEHPK3PXP";
    const enc = encryptSecret(secret);
    expect(isEncryptedSecret(enc)).toBe(true);
    expect(enc).not.toContain(secret);
    expect(decryptSecret(enc)).toBe(secret);
    // 2 lần mã hóa cùng giá trị → khác ciphertext (IV ngẫu nhiên)
    expect(encryptSecret(secret)).not.toBe(enc);
  });

  it("plaintext cũ (không prefix) → decrypt trả nguyên văn (legacy)", () => {
    expect(decryptSecret("PLAINTEXT-SECRET")).toBe("PLAINTEXT-SECRET");
    expect(isEncryptedSecret("PLAINTEXT-SECRET")).toBe(false);
  });

  it("ciphertext bị sửa/sai key → decrypt trả rỗng, không throw", () => {
    process.env.AUTH_SECRET = `box2-${Date.now()}-secret`;
    const enc = encryptSecret("hello");
    const tampered = enc.replace(/:([A-Za-z0-9+/=]+):[^:]+$/, ":AAAA:$&");
    expect(() => decryptSecret(tampered)).not.toThrow();
    expect(decryptSecret(tampered)).toBe("");
    // key khác → giải mã sai key cũng trả rỗng
    process.env.AUTH_SECRET = `other-${Date.now()}-key`;
    expect(decryptSecret(enc)).toBe("");
  });
});
