import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { deleteProduct, setProductPublished, upsertProduct } from "@/server/commerce";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const product = await upsertProduct({
      id,
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
    return NextResponse.json({ product });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Lỗi" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 401 });
  const { id } = await params;
  const result = await deleteProduct(id);
  return NextResponse.json(result);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (typeof body.published === "boolean") {
    await setProductPublished(id, body.published);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ message: "Không có thay đổi" }, { status: 400 });
}
