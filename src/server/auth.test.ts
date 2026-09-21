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
import {
  getSession,
  loginUser,
  registerUser,
  requestPasswordReset,
  requireAdmin,
  resetPassword,
} from "./auth";

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

beforeEach(() => {
  jar.clear();
});

describe("auth register/login", () => {
  it("đăng ký → session customer; trùng email bị chặn", async () => {
    const email = `u${uid()}@kit.vn`.replace(/-/g, "");
    const r1 = await registerUser("Tester", email, "matkhau1");
    expect(r1.ok).toBe(true);
    const s = await getSession();
    expect(s?.email).toBe(email);
    expect(s?.role).toBe("customer");
    const r2 = await registerUser("Khác", email, "matkhau2");
    expect(r2.ok).toBe(false);
    await prisma.user.deleteMany({ where: { email } });
  });

  it("login sai mật khẩu thất bại; đúng thì có session", async () => {
    const email = `l${uid()}@kit.vn`.replace(/-/g, "");
    await registerUser("Tester", email, "matkhau1");
    jar.clear();
    expect((await loginUser(email, "sai")).ok).toBe(false);
    expect(await getSession()).toBeNull();
    expect((await loginUser(email, "matkhau1")).ok).toBe(true);
    expect((await getSession())?.email).toBe(email);
    await prisma.user.deleteMany({ where: { email } });
  });

  it("mật khẩu < 6 ký tự bị từ chối", async () => {
    const r = await registerUser("T", `s${uid()}@kit.vn`.replace(/-/g, ""), "123");
    expect(r.ok).toBe(false);
  });
});

describe("auth reset + phân quyền", () => {
  it("quên → đặt lại mật khẩu → login bằng mật khẩu mới", async () => {
    const email = `r${uid()}@kit.vn`.replace(/-/g, "");
    await registerUser("Tester", email, "cu123456");
    const req = await requestPasswordReset(email);
    expect(req.ok).toBe(true);
    // Token thật nằm trong mail log (khung chưa gửi SMTP, ghi DB)
    const log = await prisma.mailLog.findFirst({ where: { to: email }, orderBy: { createdAt: "desc" } });
    const token = log?.body.match(/token=([a-f0-9]+)/)?.[1];
    expect(token).toBeTruthy();
    expect((await resetPassword(email, "sai-token", "moi123456")).ok).toBe(false);
    expect((await resetPassword(email, token!, "moi123456")).ok).toBe(true);
    jar.clear();
    expect((await loginUser(email, "moi123456")).ok).toBe(true);
    await prisma.passwordReset.deleteMany({ where: { user: { email } } });
    await prisma.mailLog.deleteMany({ where: { to: email } });
    await prisma.user.deleteMany({ where: { email } });
  });

  it("requireAdmin chặn customer, mở cho admin", async () => {
    const email = `c${uid()}@kit.vn`.replace(/-/g, "");
    await registerUser("Tester", email, "matkhau1");
    expect(await requireAdmin()).toBeNull();
    await prisma.user.update({ where: { email }, data: { role: "admin" } });
    jar.clear();
    await loginUser(email, "matkhau1");
    expect((await requireAdmin())?.email).toBe(email);
    await prisma.user.deleteMany({ where: { email } });
  });
});
