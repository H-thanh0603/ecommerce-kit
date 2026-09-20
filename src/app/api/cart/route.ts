import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { loadCart, syncCart } from "@/server/commerce";
import type { CartItem } from "@/types";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ items: null });
  return NextResponse.json({ items: await loadCart(session.id) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: true });
  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? (body.items as CartItem[]) : [];
  await syncCart(session.id, items);
  return NextResponse.json({ ok: true });
}
