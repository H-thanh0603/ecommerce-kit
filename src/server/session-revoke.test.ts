import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock cookie jar của next/headers để test auth ngoài Next runtime.
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

import { prisma } from "./db";
import { getSession, loginUser, registerUser, resetPassword, requestPasswordReset, setSessionCookie } from "./auth";

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

beforeEach(() => {
  jar.clear();
});

describe("session revoke (tokenVersion)", () => {
  it("reset password → bump tokenVersion → session JWT cũ bị từ chối", async () => {
    const email = `rv${uid()}@kit.vn`.replace(/-/g, "");
    const r = await registerUser("Revoke", email, "cu123456");
    expect(r.ok).toBe(true);
    // Session cũ đang nằm trong jar (set bởi register)
    expect(await getSession()).not.toBeNull();

    // Ghi lại token cũ (JWT) trước khi reset
    const oldToken = jar.get("ek_session")!;
    expect(oldToken).toBeTruthy();

    // Request reset + lấy token từ MailLog
    const req = await requestPasswordReset(email);
    expect(req.ok).toBe(true);
    const log = await prisma.mailLog.findFirst({ where: { to: email }, orderBy: { createdAt: "desc" } });
    const token = log?.body.match(/token=([a-f0-9]+)/)?.[1];
    expect(token).toBeTruthy();

    // Đổi mật khẩu → tokenVersion++
    const reset = await resetPassword(email, token!, "moi123456");
    expect(reset.ok).toBe(true);
    // resetPassword cũng clear cookie
    expect(jar.get("ek_session")).toBeUndefined();

    // Đặt lại cookie CŨ (JWT tv=0) → getSession phải null vì DB tv đã bump
    jar.set("ek_session", oldToken);
    expect(await getSession()).toBeNull();

    // Login lại → session mới hợp lệ
    jar.clear();
    const login = await loginUser(email, "moi123456");
    expect(login.ok).toBe(true);
    const s = await getSession();
    expect(s?.email).toBe(email);

    // Dọn
    await prisma.passwordReset.deleteMany({ where: { user: { email } } });
    await prisma.mailLog.deleteMany({ where: { to: email } });
    await prisma.user.deleteMany({ where: { email } });
  });

  it("setSessionCookie với tokenVersion không khớp DB → getSession null", async () => {
    const email = `tv${uid()}@kit.vn`.replace(/-/g, "");
    const user = await prisma.user.create({
      data: { email, name: "TV", passwordHash: "x", role: "customer", tokenVersion: 5 },
    });
    // Cookie mang tv=0 (khớp schema default nhưng DB là 5)
    await setSessionCookie({ id: user.id, name: "TV", email, role: "customer", tokenVersion: 0 });
    expect(await getSession()).toBeNull();

    // Cookie mang tv=5 → hợp lệ
    await setSessionCookie({ id: user.id, name: "TV", email, role: "customer", tokenVersion: 5 });
    expect((await getSession())?.email).toBe(email);

    await prisma.user.delete({ where: { id: user.id } });
  });
});
