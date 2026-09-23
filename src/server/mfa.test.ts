import { describe, expect, it } from "vitest";
import {
  generateRecoveryCodes,
  generateTotpSecret,
  normalizeRecovery,
  totpAt,
  totpUri,
  verifyTotp,
} from "./mfa";

describe("TOTP mfa", () => {
  it("secret base32 hợp lệ; code vừa sinh verify đúng, lệch 1 step vẫn pass", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    const now = 1_700_000_000_000;
    const code = totpAt(secret, now);
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotp(secret, code, now)).toBe(true);
    expect(verifyTotp(secret, totpAt(secret, now - 30_000), now)).toBe(true);
    expect(verifyTotp(secret, totpAt(secret, now + 30_000), now)).toBe(true);
    // Lệch 2 step → fail
    expect(verifyTotp(secret, totpAt(secret, now - 60_000), now)).toBe(false);
    // Code của secret khác → fail
    expect(verifyTotp(generateTotpSecret(), code, now)).toBe(false);
  });

  it("code rỗng / không đủ 6 số / secret rỗng → false, không throw", () => {
    expect(verifyTotp("", "123456")).toBe(false);
    expect(verifyTotp(generateTotpSecret(), "")).toBe(false);
    expect(verifyTotp(generateTotpSecret(), "12345")).toBe(false);
    expect(verifyTotp(generateTotpSecret(), "abcdef")).toBe(false);
  });

  it("otpauth URI chứa secret; recovery codes format ổn định", () => {
    const secret = generateTotpSecret();
    const uri = totpUri(secret, "admin@atelier.vn");
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain(`secret=${secret}`);
    const codes = generateRecoveryCodes(10);
    expect(codes).toHaveLength(10);
    for (const c of codes) expect(c).toMatch(/^[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}$/);
    expect(normalizeRecovery("ABCD-EFGH-IJKL")).toBe("abcdefghijkl");
  });
});
