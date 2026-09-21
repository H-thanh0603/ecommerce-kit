import { NextResponse } from "next/server";
import { listReturns, requestReturn, resolveReturn } from "@/server/returns";
import { requireAdmin } from "@/server/auth";

/** Khách gửi yêu cầu trả hàng. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    const r = await requestReturn(
      String(body.orderCode || ""),
      String(body.email || ""),
      Array.isArray(body.items) ? body.items : [],
      String(body.reason || ""),
    );
    return NextResponse.json({ ok: true, id: r.id });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Gửi thất bại" }, { status: 400 });
  }
}

/** Admin xem/duyệt yêu cầu. */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  const status = new URL(req.url).searchParams.get("status") || undefined;
  return NextResponse.json({ returns: await listReturns(status) });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  try {
    const r = await resolveReturn(String(body.id || ""), body.approve === true);
    return NextResponse.json({ ok: true, status: r.status });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Xử lý thất bại" }, { status: 400 });
  }
}
