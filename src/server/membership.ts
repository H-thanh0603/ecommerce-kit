import { prisma } from "@/server/db";
import { siteConfig } from "@/config/site";

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
