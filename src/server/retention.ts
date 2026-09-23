import { prisma } from "@/server/db";

/**
 * Dọn dữ liệu theo retention (Q63/Q64):
 * - PasswordReset hết hạn / >7 ngày → xóa (token không còn giá trị).
 * - MailLog body token reset >24h → xóa body (giữ metadata đối soát).
 * - MailLog failed/logged >30 ngày → xóa hẳn.
 * - Lead/Newsletter unused >180 ngày giữ (danh sách marketing) — không đụng.
 */
export async function runRetentionPurge(now = Date.now()) {
  const day = 86_400_000;
  const resetCutoff = new Date(now - 7 * day);
  const mailBodyCutoff = new Date(now - day);
  const mailFullCutoff = new Date(now - 30 * day);

  const resets = await prisma.passwordReset.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date(now) } }, { createdAt: { lt: resetCutoff } }],
    },
  });

  // Redact body mail chứa token / link nhạy cảm sau 24h (giữ subject/status).
  const redacted = await prisma.mailLog.updateMany({
    where: {
      createdAt: { lt: mailBodyCutoff },
      body: { not: "" },
      OR: [{ subject: { contains: "Đặt lại mật khẩu" } }, { body: { contains: "token=" } }],
    },
    data: { body: "[redacted]" },
  });

  const mails = await prisma.mailLog.deleteMany({
    where: { createdAt: { lt: mailFullCutoff } },
  });

  return {
    passwordResets: resets.count,
    mailBodiesRedacted: redacted.count,
    mailLogsDeleted: mails.count,
  };
}
