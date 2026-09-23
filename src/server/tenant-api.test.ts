import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ensureSchema, dropSchema } from "./test-schema";
import { getClientForSchema, prisma } from "./db";
import { setTenantLookup, wireTenantLookup } from "./tenant";
import { readSessionToken, SESSION_COOKIE } from "./session";

// Cookie jar + Host giả — route auth đọc session qua next/headers.
const jar = new Map<string, string>();
let testHost: string | null = null;
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
  headers: async () => new Headers(testHost ? { host: testHost } : {}),
}));

import { POST as registerPOST } from "@/app/api/auth/register/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { POST as newsletterPOST } from "@/app/api/newsletter/route";

const S = `apit${Date.now()}`;
const HOST = `apit${Date.now()}.vn`;

function apiReq(path: string, body: unknown): Request {
  return new Request(`http://${HOST}${path}`, {
    method: "POST",
    // x-real-ip duy nhất/run — rate limit route key theo IP, tránh 429 khi chạy lặp.
    headers: { host: HOST, "content-type": "application/json", "x-real-ip": `t8-${Date.now()}` },
    body: JSON.stringify(body),
  });
}

describe("API route wrap tenant ALS (T5)", () => {
  beforeAll(async () => {
    await ensureSchema(S);
    // wire trước fake — helper gọi wireTenantLookup idempotent, không ghi đè.
    wireTenantLookup();
    setTenantLookup(async (h) => (h === HOST ? { slug: S, name: "API" } : null));
    testHost = HOST;
  }, 180_000);

  afterAll(async () => {
    testHost = null;
    setTenantLookup(async () => null);
    await dropSchema(S);
  });

  it("register + login qua route với Host tenant → token t = slug, không phải public", async () => {
    const email = `u${Date.now()}${Math.floor(Math.random() * 1e6)}@t.vn`;
    jar.clear();
    try {
      const reg = await registerPOST(
        apiReq("/api/auth/register", { name: "API Tester", email, password: "matkhau1" }),
      );
      expect(reg.status).toBe(200);
      const regSession = await readSessionToken(jar.get(SESSION_COOKIE));
      expect(regSession?.tenantSlug).toBe(S);
      expect(regSession?.tenantSlug).not.toBe("public");

      jar.clear();
      const login = await loginPOST(apiReq("/api/auth/login", { email, password: "matkhau1" }));
      expect(login.status).toBe(200);
      const loginSession = await readSessionToken(jar.get(SESSION_COOKIE));
      expect(loginSession?.tenantSlug).toBe(S);
      expect(loginSession?.tenantSlug).not.toBe("public");
    } finally {
      // Dọn ở cả 2 schema — RED tạo user ở public, GREEN tạo ở S.
      await getClientForSchema(S).user.deleteMany({ where: { email } });
      await prisma.user.deleteMany({ where: { email } });
    }
  });

  it("newsletter POST với Host tenant → ghi vào schema tenant, không vào public", async () => {
    const email = `nl${Date.now()}${Math.floor(Math.random() * 1e6)}@t.vn`;
    const res = await newsletterPOST(apiReq("/api/newsletter", { email }));
    expect(res.status).toBe(200);
    try {
      expect(await getClientForSchema(S).newsletter.findUnique({ where: { email } })).not.toBeNull();
      expect(await prisma.newsletter.findUnique({ where: { email } })).toBeNull();
    } finally {
      await getClientForSchema(S).newsletter.deleteMany({ where: { email } });
      await prisma.newsletter.deleteMany({ where: { email } });
    }
  });

  it("admin layout enterTenant TRƯỚC requireAdmin (đọc source)", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/app/admin/layout.tsx", "utf8");
    expect(src).toContain("enterTenant(await resolveRequestTenant())");
    // So sánh vị trí GỌI (không tính dòng import) — enterTenant phải chạy trước requireAdmin.
    expect(src.indexOf("enterTenant(await resolveRequestTenant())")).toBeLessThan(
      src.indexOf("await requireAdmin()"),
    );
  });

  it("mọi route API wrap tenant handler — trừ health (đọc source)", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const SKIP = new Set(["src/app/api/health/route.ts"]);
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...walk(p));
        else if (e.name === "route.ts") out.push(p);
      }
      return out;
    };
    const files = walk("src/app/api");
    expect(files.length).toBeGreaterThanOrEqual(50);
    const unwrapped = files.filter((f) => {
      if (SKIP.has(f)) return false;
      const src = fs.readFileSync(f, "utf8");
      return !/withTenantHandler|withDefaultTenant|resolveTenant/.test(src);
    });
    expect(unwrapped).toEqual([]);
  });
});
