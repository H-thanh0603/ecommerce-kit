import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { updateOrderStatus } from "@/server/commerce";
import type { OrderStatus } from "@/types";

const allowed: OrderStatus[] = ["pending", "confirmed", "shipping", "completed", "cancelled"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body.status as OrderStatus;
  if (!allowed.includes(status)) {
    return NextResponse.json({ message: "Trạng thái không hợp lệ" }, { status: 400 });
  }
  const order = await updateOrderStatus(id, status);
  return NextResponse.json({ order });
}
