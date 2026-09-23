import { NextResponse } from "next/server";
import { listProducts } from "@/server/commerce";
import { requireAdmin } from "@/server/auth";
import { upsertProduct } from "@/server/commerce";
import { withTenantHandler } from "@/server/request-tenant";

async function getHandler(req: Request) {
  const { clientKey, rateLimit } = await import("@/server/rate-limit");
  if (!(await rateLimit(clientKey(req, "products"), 120, 60_000)).ok) {
    return NextResponse.json({ message: "Thử lại sau" }, { status: 429 });
  }
  const url = new URL(req.url);
  const ids = url.searchParams.get("ids");
  const result = await listProducts({
    q: url.searchParams.get("q") || undefined,
    cat: url.searchParams.get("cat") || undefined,
    sort: url.searchParams.get("sort") || undefined,
    ids: ids ? ids.split(",").filter(Boolean) : undefined,
    page: Number(url.searchParams.get("page") || 1),
    pageSize: Number(url.searchParams.get("pageSize") || 24),
  });
  return NextResponse.json({ products: result.items, total: result.total, page: result.page, pages: result.pages });
}

async function postHandler(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 401 });
  try {
    const body = await req.json();
    const product = await upsertProduct({
      slug: String(body.slug || ""),
      name: String(body.name || ""),
      subtitle: body.subtitle,
      description: String(body.description || ""),
      price: Number(body.price),
      compareAtPrice: body.compareAtPrice ? Number(body.compareAtPrice) : null,
      images: Array.isArray(body.images) ? body.images : String(body.images || "").split("\n").filter(Boolean),
      tags: Array.isArray(body.tags) ? body.tags : String(body.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean),
      categorySlug: String(body.categorySlug || ""),
      stock: Number(body.stock ?? 0),
      featured: Boolean(body.featured),
      flashSale: Boolean(body.flashSale),
      published: body.published !== false,
      attrs: body.attrs && typeof body.attrs === "object" ? body.attrs : undefined,
    });
    const { logAudit } = await import("@/server/audit");
    await logAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "product.upsert",
      entity: "Product",
      entityId: product.id,
      after: { slug: product.slug, price: product.price, stock: product.stock, published: product.published },
      ip: req.headers.get("x-real-ip") || "",
    });
    return NextResponse.json({ product });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Lỗi" }, { status: 400 });
  }
}

export const GET = withTenantHandler(getHandler);
export const POST = withTenantHandler(postHandler);
