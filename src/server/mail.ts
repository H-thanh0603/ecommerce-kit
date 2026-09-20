import { prisma } from "@/server/db";
import { siteConfig } from "@/config/site";
import type { Order } from "@/types";

export async function sendMail(to: string, subject: string, body: string) {
  await prisma.mailLog.create({ data: { to, subject, body } });
  console.info(`[mail] to=${to} subject=${subject}`);
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
