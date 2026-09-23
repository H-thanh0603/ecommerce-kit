import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";

export async function getCoupon(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  return prisma.coupon.findFirst({ where: { code: { equals: normalized }, active: true } });
}

export async function assertCoupon(code: string, subtotal: number, email?: string, userId?: string) {
  const coupon = await getCoupon(code);
  if (!coupon) throw new Error("Mã không tồn tại");
  return assertCouponTx(prisma, coupon.id, subtotal, email, userId);
}

/** Re-check coupon NGAY TRƯỚC khi ghi redemption trong transaction — đóng TOCTOU. */
export async function assertCouponTx(
  tx: Prisma.TransactionClient,
  couponId: string,
  subtotal: number,
  email?: string,
  userId?: string,
) {
  const coupon = await tx.coupon.findUnique({ where: { id: couponId } });
  if (!coupon || !coupon.active) throw new Error("Mã không tồn tại");
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) throw new Error("Mã chưa tới hạn dùng");
  if (coupon.endsAt && coupon.endsAt < now) throw new Error("Mã đã hết hạn");
  if (subtotal < coupon.minOrder) throw new Error(`Đơn tối thiểu ${coupon.minOrder}`);
  if (coupon.maxUses != null) {
    const n = await tx.couponRedemption.count({ where: { couponId: coupon.id } });
    if (n >= coupon.maxUses) throw new Error("Mã đã hết lượt");
  }
  if (coupon.maxUsesPerUser != null && (email || userId)) {
    const n = await tx.couponRedemption.count({
      where: {
        couponId: coupon.id,
        OR: [...(email ? [{ email }] : []), ...(userId ? [{ userId }] : [])],
      },
    });
    if (n >= coupon.maxUsesPerUser) throw new Error("Bạn đã dùng hết lượt mã này");
  }
  return coupon;
}

export async function listCoupons() {
  return prisma.coupon.findMany({ orderBy: { code: "asc" } });
}

export async function upsertCoupon(data: {
  id?: string;
  code: string;
  type: string;
  value: number;
  minOrder: number;
  active?: boolean;
  maxUses?: number | null;
  maxUsesPerUser?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
}) {
  const payload = {
    code: data.code.trim().toUpperCase(),
    type: data.type,
    value: data.value,
    minOrder: data.minOrder,
    active: data.active ?? true,
    maxUses: data.maxUses ?? null,
    maxUsesPerUser: data.maxUsesPerUser ?? null,
    startsAt: data.startsAt ?? null,
    endsAt: data.endsAt ?? null,
  };
  return data.id
    ? prisma.coupon.update({ where: { id: data.id }, data: payload })
    : prisma.coupon.create({ data: payload });
}

export async function deleteCoupon(id: string) {
  await prisma.coupon.delete({ where: { id } });
}
