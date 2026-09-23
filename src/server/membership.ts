import { prisma } from "@/server/db";
import { siteConfig } from "@/config/site";
import type { Prisma } from "@prisma/client";

export function tierFor(points: number) {
  if (points >= siteConfig.membership.vang.min) return "vang";
  if (points >= siteConfig.membership.bac.min) return "bac";
  return "dong";
}

export function pointsFromTotal(total: number) {
  return Math.floor(total / siteConfig.membership.pointPerVnd);
}

export function discountFromPoints(points: number) {
  return points * siteConfig.membership.vndPerPoint;
}

export async function grantOrderPoints(userId: string, total: number) {
  const earned = pointsFromTotal(total);
  if (earned <= 0) return { earned: 0, points: 0, memberTier: "dong" };
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { earned: 0, points: 0, memberTier: "dong" };
  const points = user.points + earned;
  const memberTier = tierFor(points);
  await prisma.user.update({ where: { id: userId }, data: { points, memberTier } });
  return { earned, points, memberTier };
}

export async function spendPoints(userId: string, spend: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || spend <= 0) return 0;
  const use = Math.min(user.points, spend);
  const points = user.points - use;
  await prisma.user.update({
    where: { id: userId },
    data: { points, memberTier: tierFor(points) },
  });
  return use;
}

/**
 * Trừ điểm trong transaction — chặn đua (TOCTOU): chỉ trừ khi số dư còn đủ,
 * rollbacks toàn bộ đơn nếu user không còn đủ điểm giữa chừng.
 */
export async function spendPointsTx(tx: Prisma.TransactionClient, userId: string, spend: number) {
  if (spend <= 0) return 0;
  const upd = await tx.user.updateMany({
    where: { id: userId, points: { gte: spend } },
    data: { points: { decrement: spend } },
  });
  if (upd.count !== 1) throw new Error("Không đủ điểm để dùng");
  const user = await tx.user.findUnique({ where: { id: userId }, select: { points: true } });
  const points = user?.points ?? 0;
  await tx.user.update({ where: { id: userId }, data: { memberTier: tierFor(points) } });
  return spend;
}

export async function getMember(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { points: true, memberTier: true, name: true, email: true },
  });
  if (!user) return null;
  const label = siteConfig.membership[user.memberTier as keyof typeof siteConfig.membership];
  return {
    ...user,
    tierLabel: typeof label === "object" && "label" in label ? label.label : user.memberTier,
  };
}
