import { beforeEach, describe, expect, it, vi } from "vitest";
import { readSessionToken, sessionMatchesTenant, signSession, SESSION_COOKIE } from "./session";
import { runWithTenant } from "./tenant-context";

// Mock cookie jar của next/headers để getSession chạy ngoài Next runtime.
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined),
    set: (k: string, v: string) => {
      jar.set(k, v);
    },
    delete: (k: string) => {
      jar.delete(k);
    },
  }),
}));

// Mock Prisma: match-path trả user khớp tv — nếu getSession KHÔNG short-circuit
// pre-DB (mất gate sessionMatchesTenant), nhánh lệch schema sẽ đi xuống DB và
// trả session ≠ null → test RED. Không tạo user thật, không chạm Postgres.
vi.mock("@/server/db", () => ({
  prisma: {
    user: {
      findUnique: async () => ({ tokenVersion: 0, role: "customer", email: "gate@x.vn" }),
    },
  },
}));

import { getSession } from "./auth";

describe("session tenant claim (T4)", () => {
  it("sign/read roundtrip giữ tenantSlug", async () => {
    const token = await signSession({
      id: "u1", name: "A", email: "a@x.vn", role: "customer",
      tokenVersion: 0, tenantSlug: "shopa",
    });
    const payload = await readSessionToken(token);
    expect(payload?.tenantSlug).toBe("shopa");
    expect(sessionMatchesTenant(payload!, "shopb")).toBe(false);
    expect(sessionMatchesTenant(payload!, "shopa")).toBe(true);
  });

  it("session cũ không claim → chấp nhận (backward compat deploy)", async () => {
    const token = await signSession({
      id: "u2", name: "B", email: "b@x.vn", role: "customer", tokenVersion: 0,
    });
    const payload = await readSessionToken(token);
    expect(payload?.tenantSlug).toBeUndefined();
    expect(sessionMatchesTenant(payload!, "shopb")).toBe(true);
  });
});

describe("getSession gate e2e (T5)", () => {
  beforeEach(() => jar.clear());

  it("token tenantSlug=shopa chạy trong ALS shopb → getSession null (pre-DB)", async () => {
    const token = await signSession({
      id: "gate1", name: "G", email: "gate@x.vn", role: "customer",
      tokenVersion: 0, tenantSlug: "shopa",
    });
    jar.set(SESSION_COOKIE, token);
    // Lệch schema: gate sessionMatchesTenant phải chặn TRƯỚC truy vấn prisma.
    expect(await runWithTenant("shopb", () => getSession())).toBeNull();
    // Cùng schema: gate qua → đi tiếp DB (mock trả user khớp tv) → có session.
    // Phản chứng minh null ở trên đúng do gate, không phải lỗi khác.
    const match = await runWithTenant("shopa", () => getSession());
    expect(match?.email).toBe("gate@x.vn");
    expect(match?.tenantSlug).toBe("shopa");
  });
});
