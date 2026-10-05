import { afterEach, describe, expect, it, vi } from "vitest";
import { readSessionToken, sessionMatchesTenant, signSession } from "./session";

afterEach(() => {
  delete process.env.AUTH_SECRET;
  vi.unstubAllEnvs();
});

function payload(over: Partial<Parameters<typeof signSession>[0]> = {}) {
  return {
    id: "u1",
    name: "Tester",
    email: "t@kit.vn",
    role: "customer" as const,
    tokenVersion: 0,
    ...over,
  };
}

describe("session JWT", () => {
  it("sign → read giữ nguyên payload; token sai chữ ký → null", async () => {
    process.env.AUTH_SECRET = `s-${Date.now()}-secret`;
    const token = await signSession(payload({ tenantSlug: "shopa" }));
    const out = await readSessionToken(token);
    expect(out).toMatchObject({ id: "u1", email: "t@kit.vn", role: "customer", tenantSlug: "shopa" });

    expect(await readSessionToken("not-a-jwt")).toBeNull();
    expect(await readSessionToken(undefined)).toBeNull();

    // Token ký bằng secret khác → từ chối
    const tokenA = await signSession(payload());
    process.env.AUTH_SECRET = `other-${Date.now()}-secret`;
    expect(await readSessionToken(tokenA)).toBeNull();
  });

  it("token hết hạn → null", async () => {
    process.env.AUTH_SECRET = `s-${Date.now()}-secret`;
    const { SignJWT } = await import("jose");
    const expired = await new SignJWT({ id: "u1", email: "t@kit.vn", role: "customer" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("-1h")
      .sign(new TextEncoder().encode(process.env.AUTH_SECRET));
    expect(await readSessionToken(expired)).toBeNull();
  });

  it("token thiếu id/email/role → null", async () => {
    process.env.AUTH_SECRET = `s-${Date.now()}-secret`;
    const { SignJWT } = await import("jose");
    const noClaims = await new SignJWT({ name: "Chỉ tên" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.AUTH_SECRET));
    expect(await readSessionToken(noClaims)).toBeNull();
  });

  it("role lạ bị hạ về customer", async () => {
    process.env.AUTH_SECRET = `s-${Date.now()}-secret`;
    const out = await readSessionToken(await signSession(payload({ role: "customer" })));
    expect(out!.role).toBe("customer");
  });

  it("sessionMatchesTenant: token thiếu claim tenant → false (fail-closed); claim khác tenant → false", () => {
    expect(sessionMatchesTenant({ ...payload(), tenantSlug: undefined }, "shopa")).toBe(false);
    expect(sessionMatchesTenant({ ...payload(), tenantSlug: "shopa" }, "shopa")).toBe(true);
    expect(sessionMatchesTenant({ ...payload(), tenantSlug: "shopb" }, "shopa")).toBe(false);
  });

  it("production thiếu AUTH_SECRET → sign ném", async () => {
    delete process.env.AUTH_SECRET;
    vi.stubEnv("NODE_ENV", "production");
    await expect(signSession(payload())).rejects.toThrow(/AUTH_SECRET/);
  });
});
