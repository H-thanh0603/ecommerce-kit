import { prisma } from "@/server/db";
import { sendMail } from "@/server/mail";

export const ABANDONED_AFTER_HOURS = 24;
export const ABANDONED_REMIND_EVERY_HOURS = 72;

export type AbandonedCart = {
  userId: string;
  email: string;
  name: string;
  lines: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  oldest: Date;
};

/** Giỏ của user đăng nhập bị bỏ quá N giờ (đơn đã đặt thì giỏ trống nên tự loại). */
export async function findAbandonedCarts(olderThanHours = ABANDONED_AFTER_HOURS): Promise<AbandonedCart[]> {
  const cutoff = new Date(Date.now() - olderThanHours * 3600_000);
  const remindCutoff = new Date(Date.now() - ABANDONED_REMIND_EVERY_HOURS * 3600_000);
  const stale = await prisma.cartLine.findMany({
    where: { updatedAt: { lt: cutoff } },
    include: {
      product: { select: { name: true, price: true } },
      user: { select: { id: true, email: true, name: true } },
    },
  });
  const byUser = new Map<string, AbandonedCart>();
  for (const l of stale) {
    const cur = byUser.get(l.userId) || {
      userId: l.userId,
      email: l.user.email,
      name: l.user.name,
      lines: [],
      total: 0,
      oldest: l.updatedAt,
    };
    cur.lines.push({ name: l.product.name, quantity: l.quantity, price: l.product.price });
    cur.total += l.product.price * l.quantity;
    if (l.updatedAt < cur.oldest) cur.oldest = l.updatedAt;
    byUser.set(l.userId, cur);
  }
  const out: AbandonedCart[] = [];
  for (const c of byUser.values()) {
    const tag = `abandoned:${c.userId}`;
    const reminded = await prisma.mailLog.findFirst({
      where: { to: c.email, createdAt: { gte: remindCutoff }, body: { contains: tag } },
    });
    if (!reminded) out.push(c);
  }
  return out;
}

export async function sendAbandonedReminders(carts?: AbandonedCart[]) {
  const list = carts ?? (await findAbandonedCarts());
  let sent = 0;
  for (const c of list) {
    const items = c.lines.map((l) => `${l.name} × ${l.quantity}`).join(", ");
    await sendMail(
      c.email,
      "[Nhắc bạn] Giỏ hàng còn chờ thanh toán",
      `abandoned:${c.userId} — Chào ${c.name}, giỏ hàng (${items}, tạm tính ${c.total}đ) vẫn giữ cho bạn. Quay lại đặt hàng nhé!`,
    );
    sent += 1;
  }
  return { sent };
}
