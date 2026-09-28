import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { toOrder } from "@/server/map";
import { processPayment } from "@/server/payments";
import { getSession } from "@/server/auth";
import { withTenantHandler } from "@/server/request-tenant";

/**
 * Thử lại build payUrl cho đơn pending bị needsRetry (cổng sập lúc checkout).
 * Đơn vẫn giữ pending + tồn đã trừ — route này chỉ dựng lại URL, không tạo đơn mới.
 */
async function postHandler(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;
  const row = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!row) return NextResponse.json({ message: "Không thấy đơn" }, { status: 404 });
  // Chủ đơn hoặc admin mới được retry (guest checkout: khớp email session hoặc admin).
  if (session?.role !== "admin" && session?.id && row.userId && row.userId !== session.id) {
    return NextResponse.json({ message: "Không có quyền" }, { status: 403 });
  }
  if (row.paymentMethod !== "vnpay" && row.paymentMethod !== "momo") {
    return NextResponse.json({ message: "Đơn này không cần thanh toán lại" }, { status: 400 });
  }
  if (row.paymentStatus === "paid") {
    return NextResponse.json({ message: "Đơn đã thanh toán" }, { status: 400 });
  }
  const order = toOrder(row);
  try {
    const pay = await processPayment(row.paymentMethod, {
      code: row.code,
      total: row.total,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1",
    });
    if (!pay.ok) return NextResponse.json({ order, payUrl: undefined, needsRetry: true }, { status: 502 });
    return NextResponse.json({ order, payUrl: pay.payUrl, needsRetry: false });
  } catch {
    return NextResponse.json({ order, payUrl: undefined, needsRetry: true }, { status: 502 });
  }
}

export const POST = withTenantHandler(postHandler);
