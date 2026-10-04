import { prisma } from "@/server/db";
import { siteConfig } from "@/config/site";
import type { Order } from "@/types";

export function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function deliver(
  to: string,
  subject: string,
  body: string,
  opts?: { listUnsubscribeUrl?: string },
) {
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    // Chặn SMTP treo vô hạn làm chậm checkout (audit Q88/Q116).
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  const headers: Record<string, string> = {};
  if (opts?.listUnsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${opts.listUnsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text: body,
    ...(Object.keys(headers).length ? { headers } : {}),
  });
}

export const MAIL_MAX_ATTEMPTS = 3;

/**
 * Ghi MailLog trước (status "logged"), gửi SMTP sau nếu đã cấu hình.
 * Không bao giờ throw — mail lỗi không được làm vỡ checkout.
 * Fail thì đánh dấu "failed" + tăng attempts, retry bởi retryFailedMails().
 */
export async function sendMail(
  to: string,
  subject: string,
  body: string,
  opts?: { listUnsubscribeUrl?: string },
) {
  const log = await prisma.mailLog.create({ data: { to, subject, body } });
  if (!smtpConfigured()) {
    console.info(`[mail:db] to=${to} subject=${subject}`);
    return;
  }
  await attemptDelivery(log.id, to, subject, body, opts);
}

async function attemptDelivery(
  logId: string,
  to: string,
  subject: string,
  body: string,
  opts?: { listUnsubscribeUrl?: string },
) {
  try {
    await deliver(to, subject, body, opts);
    await prisma.mailLog.update({
      where: { id: logId },
      data: { status: "sent", error: "", attempts: { increment: 1 } },
    });
    console.info(`[mail:sent] to=${to} subject=${subject}`);
    return true;
  } catch (e) {
    const error = e instanceof Error ? e.message.slice(0, 500) : "SMTP error";
    await prisma.mailLog.update({
      where: { id: logId },
      data: { status: "failed", error, attempts: { increment: 1 } },
    });
    console.error(`[mail:failed] to=${to} ${error}`);
    return false;
  }
}

/**
 * Retry mail failed trong 24h gần nhất, tối đa MAIL_MAX_ATTEMPTS lần.
 * Bỏ qua mail reset mật khẩu (token hết hạn 15 phút, gửi lại vô nghĩa) và
 * body đã bị retention redact ("[redacted]"). Cron tenant gọi qua withAllTenants.
 */
export async function retryFailedMails(now = Date.now()) {
  if (!smtpConfigured()) return { retried: 0, sent: 0 };
  const day = 86_400_000;
  const candidates = await prisma.mailLog.findMany({
    where: {
      status: "failed",
      attempts: { lt: MAIL_MAX_ATTEMPTS },
      createdAt: { gt: new Date(now - day) },
      NOT: [{ subject: { contains: "Đặt lại mật khẩu" } }, { body: "[redacted]" }],
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  let sent = 0;
  for (const m of candidates) {
    const ok = await attemptDelivery(m.id, m.to, m.subject, m.body);
    if (ok) sent += 1;
  }
  return { retried: candidates.length, sent };
}

export async function mailOrderCreated(order: Order) {
  await sendMail(
    order.email,
    `[${siteConfig.brand.name}] Đơn ${order.code} đã ghi nhận`,
    `Cảm ơn ${order.customer}. Mã đơn ${order.code}, tổng ${order.total}đ. Trạng thái: chờ xác nhận.`,
  );
}

export async function mailOrderStatus(order: Order) {
  await sendMail(
    order.email,
    `[${siteConfig.brand.name}] Đơn ${order.code}: ${order.status}`,
    `Đơn ${order.code} cập nhật trạng thái: ${order.status}.`,
  );
}

export async function mailPasswordReset(to: string, url: string) {
  await sendMail(to, `[${siteConfig.brand.name}] Đặt lại mật khẩu`, `Link (15 phút): ${url}`);
}

export async function listMailLog(take = 50) {
  return prisma.mailLog.findMany({ orderBy: { createdAt: "desc" }, take });
}
