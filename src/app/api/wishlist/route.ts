import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { listWishlistIds, toggleWishlist } from "@/server/commerce";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ids: null });
  return NextResponse.json({ ids: await listWishlistIds(session.id) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Cần đăng nhập" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const on = await toggleWishlist(session.id, String(body.productId || ""));
  return NextResponse.json({ on });
}
