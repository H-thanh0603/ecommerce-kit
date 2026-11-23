import { describe, expect, it, vi } from "vitest";
import { prisma } from "./db";
import { mailPasswordReset, sendMail, smtpConfigured } from "./mail";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>) => fn,
  revalidateTag: () => {},
}));

describe("mail", () => {
  it("chưa cấu hình SMTP thì chỉ ghi DB, không throw", async () => {
    delete process.env.SMTP_HOST;
    expect(smtpConfigured()).toBe(false);
    const to = `m${Date.now()}@kit.vn`;
    await sendMail(to, "Chào", "Nội dung");
    const log = await prisma.mailLog.findFirst({ where: { to }, orderBy: { createdAt: "desc" } });
    expect(log?.status).toBe("logged");
    await prisma.mailLog.deleteMany({ where: { to } });
  });

  it("SMTP sai thì ghi failed, vẫn không throw", async () => {
    process.env.SMTP_HOST = "127.0.0.1";
    process.env.SMTP_PORT = "1";
    process.env.SMTP_USER = "u";
    process.env.SMTP_PASS = "p";
    const to = `f${Date.now()}@kit.vn`;
    await sendMail(to, "Chào", "Nội dung");
    const log = await prisma.mailLog.findFirst({ where: { to }, orderBy: { createdAt: "desc" } });
    expect(log?.status).toBe("failed");
    expect(log?.error.length).toBeGreaterThan(0);
    await prisma.mailLog.deleteMany({ where: { to } });
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
  });

  it("mailPasswordReset lấy tên brand từ SiteSetting (multi-tenant), không hardcode file config", async () => {
    delete process.env.SMTP_HOST;
    const prev = await prisma.siteSetting.findUnique({ where: { key: "brand" } });
    const to = `brand-${Date.now()}@kit.vn`;
    try {
      await prisma.siteSetting.upsert({
        where: { key: "brand" },
        create: { key: "brand", value: JSON.stringify({ name: "TenantMailTest" }) },
        update: { value: JSON.stringify({ name: "TenantMailTest" }) },
      });
      await mailPasswordReset(to, "https://shop.test/reset");
      const log = await prisma.mailLog.findFirst({ where: { to }, orderBy: { createdAt: "desc" } });
      expect(log?.subject).toBe("[TenantMailTest] Đặt lại mật khẩu");
    } finally {
      if (prev) {
        await prisma.siteSetting.update({ where: { key: "brand" }, data: { value: prev.value } });
      } else {
        await prisma.siteSetting.deleteMany({ where: { key: "brand" } });
      }
      await prisma.mailLog.deleteMany({ where: { to } });
    }
  });
});
