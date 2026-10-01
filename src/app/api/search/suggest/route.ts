import { NextResponse } from "next/server";
import { listProducts } from "@/server/commerce";
import { withTenantHandler } from "@/server/request-tenant";

/** Gợi ý tìm kiếm cho ô search header — trả về tối đa 6 SP khớp q. */
async function handler(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ items: [] });
  const { items } = await listProducts({ q, pageSize: 6 });
  return NextResponse.json({
    items: items.map((p) => ({
      name: p.name,
      slug: p.slug,
      image: p.images[0] || "",
      price: p.price,
    })),
  });
}

export const GET = withTenantHandler(handler);
