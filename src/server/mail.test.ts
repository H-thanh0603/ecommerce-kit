import { describe, expect, it } from "vitest";
import { prisma } from "./db";
import { sendMail, smtpConfigured } from "./mail";

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
});
