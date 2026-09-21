import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";

export async function getGift(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  return prisma.giftCard.findFirst({ where: { code: { equals: normalized }, active: true } });
}

export function assertGiftLive(gift: { expiresAt: Date | null; balance: number }) {
  if (gift.expiresAt && gift.expiresAt < new Date()) throw new Error("Thẻ quà đã hết hạn");
  if (gift.balance <= 0) throw new Error("Thẻ quà đã hết số dư");
}

/** Số tiền thẻ gánh = min(số dư, phần còn lại của đơn). Pure theo remaining. */
export async function quoteGift(code: string, remainingTotal: number) {
  const gift = await getGift(code);
  if (!gift) throw new Error("Mã quà không tồn tại");
  assertGiftLive(gift);
  return { gift, amount: Math.min(gift.balance, Math.max(0, remainingTotal)) };
}

export async function consumeGiftTx(tx: Prisma.TransactionClient, giftId: string, orderId: string, amount: number) {
  if (amount <= 0) return;
  const updated = await tx.giftCard.updateMany({
    where: { id: giftId, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });
  if (updated.count !== 1) throw new Error("Thẻ quà không đủ số dư (có đơn khác dùng trước)");
  await tx.giftRedemption.create({ data: { giftId, orderId, amount } });
}

export async function listGifts() {
  return prisma.giftCard.findMany({ orderBy: { createdAt: "desc" } });
}

export async function upsertGift(data: {
  id?: string;
  code: string;
  balance: number;
  active?: boolean;
  note?: string;
  expiresAt?: Date | null;
}) {
  const payload = {
    code: data.code.trim().toUpperCase(),
    balance: Math.max(0, Math.round(data.balance)),
    active: data.active ?? true,
    note: data.note || "",
    expiresAt: data.expiresAt ?? null,
  };
  return data.id
    ? prisma.giftCard.update({ where: { id: data.id }, data: payload })
    : prisma.giftCard.create({ data: payload });
}

export async function deleteGift(id: string) {
  const n = await prisma.giftRedemption.count({ where: { giftId: id } });
  if (n) throw new Error("Thẻ đã phát sinh giao dịch, chỉ được tắt (active=false)");
  await prisma.giftCard.delete({ where: { id } });
}
