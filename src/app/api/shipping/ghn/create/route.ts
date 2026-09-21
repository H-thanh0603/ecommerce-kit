import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { createGhnOrder, ghnConfigured } from "@/server/shipping";
import { isFeatureOn } from "@/server/settings";
import { prisma } from "@/server/db";

/** Admin tạo vận đơn GHN cho 1 đơn hàng, lưu mã vào Order.ghnOrderCode. */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, message: "Cần quyền admin" }, { status: 403 });
  if (!(await isFeatureOn("ghn"))) {
    return NextResponse.json({ ok: false, message: "Chưa bật features.ghn" }, { status: 400 });
  }
  if (!ghnConfigured()) {
    return NextResponse.json({ ok: false, message: "Chưa cấu hình GHN_TOKEN / GHN_SHOP_ID" }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const code = String(body.orderCode || "").trim();
  if (!code) return NextResponse.json({ ok: false, message: "Thiếu orderCode" }, { status: 400 });
  const order = await prisma.order.findUnique({ where: { code }, include: { items: true } });
  if (!order) return NextResponse.json({ ok: false, message: "Không thấy đơn" }, { status: 404 });
  if (order.ghnOrderCode) {
    return NextResponse.json({ ok: true, orderCode: order.ghnOrderCode, message: "Đơn đã có vận đơn" });
  }
  const result = await createGhnOrder({
    toName: order.customer,
    toPhone: order.phone,
    toAddress: order.address,
    toWardCode: String(body.toWardCode || ""),
    toDistrictId: Number(body.toDistrictId || 0),
    weightGrams: order.items.length * 500,
    codAmount: order.paymentMethod === "cod" ? order.total : 0,
    note: order.note || undefined,
    items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
  });
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  await prisma.order.update({ where: { code }, data: { ghnOrderCode: result.orderCode } });
  const { logOrderEvent } = await import("@/server/order-events");
  await logOrderEvent(order.id, "shipping", `Tạo vận đơn GHN ${result.orderCode}`);
  return NextResponse.json(result);
}
