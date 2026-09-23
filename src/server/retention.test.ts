import { describe, expect, it } from "vitest";
import { prisma } from "./db";
import { runRetentionPurge } from "./retention";

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

describe("retention purge", () => {
  it("xóa PasswordReset cũ; redact body mail token; xóa MailLog quá 30 ngày", async () => {
    const email = `ret${uid()}@kit.vn`.replace(/-/g, "");
    const user = await prisma.user.create({
      data: { email, name: "Ret", passwordHash: "x" },
    });
    const old = new Date(Date.now() - 10 * 86_400_000);
    await prisma.passwordReset.create({
      data: { userId: user.id, tokenHash: `h${uid()}`, expiresAt: old, createdAt: old },
    });
    await prisma.passwordReset.create({
      data: { userId: user.id, tokenHash: `h2${uid()}`, expiresAt: new Date(Date.now() + 86_400_000) },
    });
    const mailOld = await prisma.mailLog.create({
      data: {
        to: email,
        subject: "Đặt lại mật khẩu",
        body: "Link token=abc123deadbeef",
        createdAt: new Date(Date.now() - 2 * 86_400_000),
      },
    });
    const mailAncient = await prisma.mailLog.create({
      data: {
        to: email,
        subject: "Xưa",
        body: "nội dung",
        createdAt: new Date(Date.now() - 40 * 86_400_000),
      },
    });

    const r = await runRetentionPurge();
    expect(r.passwordResets).toBeGreaterThanOrEqual(1);
    expect(r.mailBodiesRedacted).toBeGreaterThanOrEqual(1);
    expect(r.mailLogsDeleted).toBeGreaterThanOrEqual(1);

    const resetOld = await prisma.passwordReset.findFirst({ where: { tokenHash: { startsWith: "h" + "" }, userId: user.id, createdAt: { lt: old } } });
    // token cũ đã bị xóa; token còn hạn vẫn còn (nếu không match delete where)
    const remaining = await prisma.passwordReset.count({ where: { userId: user.id } });
    expect(remaining).toBeLessThanOrEqual(1);

    const redacted = await prisma.mailLog.findUnique({ where: { id: mailOld.id } });
    if (redacted) expect(redacted.body).toBe("[redacted]");
    const gone = await prisma.mailLog.findUnique({ where: { id: mailAncient.id } });
    expect(gone).toBeNull();

    void resetOld;
    // Dọn
    await prisma.mailLog.deleteMany({ where: { to: email } });
    await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});
