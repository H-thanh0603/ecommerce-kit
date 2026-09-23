import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { getOrderTimeline } from "@/server/order-events";
import { withTenantHandler } from "@/server/request-tenant";

async function getHandler(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  const { id } = await ctx.params;
  return NextResponse.json({ events: await getOrderTimeline(decodeURIComponent(id)) });
}

export const GET = withTenantHandler(getHandler);
