import { prisma } from "@/server/db";
import { siteConfig } from "@/config/site";
import type { Order } from "@/types";

export function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function deliver(to: string, subject: string, body: string) {
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text: body,
  });
}

/**
 * Ghi MailLog trước (status "logged"), gửi SMTP sau nếu đã cấu hình.
 * Không bao giờ throw — mail lỗi không được làm vỡ checkout.
 */
export async function sendMail(to: string, subject: string, body: string) {
  const log = await prisma.mailLog.create({ data: { to, subject, body } });
  if (!smtpConfigured()) {
    console.info(`[mail:db] to=${to} subject=${subject}`);
    return;
  }
  try {
    await deliver(to, subject, body);
    await prisma.mailLog.update({ where: { id: log.id }, data: { status: "sent" } });
    console.info(`[mail:sent] to=${to} subject=${subject}`);
  } catch (e) {
    const error = e instanceof Error ? e.message.slice(0, 500) : "SMTP error";
    await prisma.mailLog.update({ where: { id: log.id }, data: { status: "failed", error } });
    console.error(`[mail:failed] to=${to} ${error}`);
  }
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
