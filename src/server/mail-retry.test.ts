import { describe, expect, it, vi, afterEach } from "vitest";
import { prisma } from "./db";
import { sendMail, retryFailedMails } from "./mail";

// Mock transporter: sendMail fail/succeed điều khiển được từng bước
const sendMock = vi.hoisted(() => vi.fn());
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail: sendMock }) },
  createTransport: () => ({ sendMail: sendMock }),
}));

function useSmtp() {
  process.env.SMTP_HOST = "smtp.test";
  process.env.SMTP_PORT = "587";
  process.env.SMTP_USER = "u";
  process.env.SMTP_PASS = "p";
}

afterEach(() => {
  sendMock.mockReset();
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
});

describe("retryFailedMails", () => {
  it("fail → status failed + attempts tăng; retry thành công → sent", async () => {
    useSmtp();
    const tag = `retry-ok-${Date.now()}`;
    const to = `a-${tag}@kit.vn`;
    try {
      sendMock.mockRejectedValueOnce(new Error("SMTP down"));
      await sendMail(to, "Đơn thường", "Nội dung");
      const first = await prisma.mailLog.findFirst({ where: { to }, orderBy: { createdAt: "desc" } });
      expect(first!.status).toBe("failed");
      expect(first!.attempts).toBe(1);
      expect(first!.error).toContain("SMTP down");

      sendMock.mockResolvedValueOnce({});
      const r = await retryFailedMails();
      expect(r.retried).toBe(1);
      expect(r.sent).toBe(1);
      const done = await prisma.mailLog.findFirst({ where: { to }, orderBy: { createdAt: "desc" } });
      expect(done!.status).toBe("sent");
      expect(done!.attempts).toBe(2);
      expect(done!.error).toBe("");
    } finally {
      await prisma.mailLog.deleteMany({ where: { to } });
    }
  });

  it("bỏ qua: mail reset mật khẩu, body đã redact, hết trần 3 lần, cũ quá 24h", async () => {
    useSmtp();
    const tag = `skip-${Date.now()}`;
    const seed = [
      { to: `r-${tag}@kit.vn`, subject: "Đặt lại mật khẩu", body: "Link token=x", status: "failed", attempts: 1 },
      { to: `d-${tag}@kit.vn`, subject: "Đơn", body: "[redacted]", status: "failed", attempts: 1 },
      { to: `c-${tag}@kit.vn`, subject: "Đơn", body: "x", status: "failed", attempts: 3 },
      {
        to: `o-${tag}@kit.vn`,
        subject: "Đơn",
        body: "x",
        status: "failed",
        attempts: 1,
        createdAt: new Date(Date.now() - 25 * 3600_000),
      },
    ] as const;
    try {
      await prisma.mailLog.createMany({ data: seed.map((s) => ({ ...s })) });
      const r = await retryFailedMails();
      expect(r.retried).toBe(0);
      expect(sendMock).not.toHaveBeenCalled();
    } finally {
      await prisma.mailLog.deleteMany({ where: { OR: seed.map((s) => ({ to: s.to })) } });
    }
  });

  it("chưa cấu hình SMTP → no-op", async () => {
    const r = await retryFailedMails();
    expect(r.retried).toBe(0);
  });
});
