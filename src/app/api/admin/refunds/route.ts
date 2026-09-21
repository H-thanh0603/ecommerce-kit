import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { createRefund, listRefunds, setRefundStatus } from "@/server/refunds";

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
  try {
    if (body.action === "complete" || body.action === "fail") {
      const r = await setRefundStatus(String(body.id || ""), body.action === "complete" ? "completed" : "failed");
      return NextResponse.json({ ok: true, status: r.status });
    }
    const refund = await createRefund(
      String(body.orderCode || ""),
      Number(body.amount || 0),
      String(body.method || "bank"),
      String(body.note || ""),
    );
    return NextResponse.json({ ok: true, refund });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Thất bại" }, { status: 400 });
  }
}
