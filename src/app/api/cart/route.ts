import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { loadCart, syncCart } from "@/server/commerce";
import type { CartItem } from "@/types";
import { withTenantHandler } from "@/server/request-tenant";

async function getHandler() {
  const session = await getSession();
  if (!session) return NextResponse.json({ items: null });
  return NextResponse.json({ items: await loadCart(session.id) });
}

async function postHandler(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: true });
  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? (body.items as CartItem[]) : [];
  await syncCart(session.id, items);
  return NextResponse.json({ ok: true });
}

export const GET = withTenantHandler(getHandler);
export const POST = withTenantHandler(postHandler);
