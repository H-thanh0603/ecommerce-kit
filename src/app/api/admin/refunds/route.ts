import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { createRefund, executeGatewayRefund, listRefunds, setRefundStatus } from "@/server/refunds";
import { prisma } from "@/server/db";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  const status = new URL(req.url).searchParams.get("status") || undefined;
  return NextResponse.json({ refunds: await listRefunds(status) });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { logAudit } = await import("@/server/audit");
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "";
  try {
    if (body.action === "complete" || body.action === "fail") {
      const r = await setRefundStatus(String(body.id || ""), body.action === "complete" ? "completed" : "failed");
      await logAudit({
        actorId: admin.id,
        actorEmail: admin.email,
        action: `refund.${body.action}`,
        entity: "Refund",
        entityId: r.id,
        after: r.status,
        ip,
      });
      return NextResponse.json({ ok: true, status: r.status });
    }
    const orderCode = String(body.orderCode || "");
    const amount = Number(body.amount || 0);
    const method = String(body.method || "bank");
    const refund = await createRefund(orderCode, amount, method, String(body.note || ""));
    await logAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "refund.create",
      entity: "Refund",
      entityId: refund.id,
      after: { orderCode, amount: refund.amount, method },
      ip,
    });
    // method vnpay/momo: gọi cổng hoàn tiền thật; thành công → completed, fail → failed.
    if (method === "vnpay" || method === "momo") {
      const order = await prisma.order.findUnique({ where: { code: orderCode.trim() } });
      if (!order) throw new Error("Không thấy đơn");
      const exec = await executeGatewayRefund(order, refund.amount, method, admin.email);
      if (exec.ok) {
        await setRefundStatus(refund.id, "completed");
        return NextResponse.json({ ok: true, message: exec.message, refund: { ...refund, status: "completed" } });
      }
      await setRefundStatus(refund.id, "failed");
      return NextResponse.json({ ok: false, message: exec.message, refund: { ...refund, status: "failed" } }, { status: 400 });
    }
    return NextResponse.json({ ok: true, refund });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Thất bại" }, { status: 400 });
  }
}
