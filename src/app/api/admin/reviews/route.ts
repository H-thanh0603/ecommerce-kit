import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { approveReview, deleteReview, listPendingReviews } from "@/server/catalog";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  return NextResponse.json({ reviews: await listPendingReviews() });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ message: "Thiếu id" }, { status: 400 });
  if (body.action === "delete") {
    await deleteReview(id);
    return NextResponse.json({ ok: true });
  }
  const review = await approveReview(id);
  return NextResponse.json({ ok: true, review });
}
