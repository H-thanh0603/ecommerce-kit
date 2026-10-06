import { NextResponse } from "next/server";
import { listProducts } from "@/server/commerce";
import { rateLimit, clientKey } from "@/server/rate-limit";
import { withTenantHandler } from "@/server/request-tenant";

/** Gợi ý tìm kiếm cho ô search header — trả về tối đa 6 SP khớp q. */
async function handler(req: Request) {
  // Search là endpoint truy vấn DB thường xuyên (mỗi keystroke) — cần rate limit.
  if (!(await rateLimit(clientKey(req, "search"), 60, 60_000)).ok) {
    return NextResponse.json({ items: [], message: "Too many requests" }, { status: 429 });
  }
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
