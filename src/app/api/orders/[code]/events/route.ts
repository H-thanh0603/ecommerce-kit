import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { getOrderTimeline } from "@/server/order-events";
import { prisma } from "@/server/db";

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  const { code } = await ctx.params;
  const order = await prisma.order.findUnique({ where: { code: decodeURIComponent(code) }, select: { id: true } });
  if (!order) return NextResponse.json({ events: [] });
  return NextResponse.json({ events: await getOrderTimeline(order.id) });
}
