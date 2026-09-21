import { NextResponse } from "next/server";
import { listReturns, requestReturn, resolveReturn } from "@/server/returns";
import { getSession, requireAdmin } from "@/server/auth";
import { prisma } from "@/server/db";

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

/** Admin xem tất cả; khách xem yêu cầu của chính mình. */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  const status = new URL(req.url).searchParams.get("status") || undefined;
  if (admin) return NextResponse.json({ returns: await listReturns(status) });
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Cần đăng nhập" }, { status: 401 });
  const rows = await prisma.returnRequest.findMany({
    where: {
      ...(status ? { status } : {}),
      order: { OR: [{ userId: session.id }, { email: session.email }] },
    },
    orderBy: { createdAt: "desc" },
    include: { order: { select: { code: true } } },
  });
  return NextResponse.json({ returns: rows });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  try {
    const r = await resolveReturn(String(body.id || ""), body.approve === true, Number(body.refundAmount || 0));
    return NextResponse.json({ ok: true, status: r.status });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Xử lý thất bại" }, { status: 400 });
  }
}
