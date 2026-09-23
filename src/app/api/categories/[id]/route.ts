import { NextResponse } from "next/server";
import { deleteCategory, upsertCategory } from "@/server/commerce";
import { requireAdmin } from "@/server/auth";
import { withTenantHandler } from "@/server/request-tenant";

async function patchHandler(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const category = await upsertCategory({
      id,
      slug: String(body.slug || ""),
      name: String(body.name || ""),
      description: body.description,
      image: body.image,
    });
    return NextResponse.json({ category });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Lỗi" }, { status: 400 });
  }
}

async function deleteHandler(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 401 });
  const { id } = await params;
  try {
    await deleteCategory(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Lỗi" }, { status: 400 });
  }
}

export const PATCH = withTenantHandler(patchHandler);
export const DELETE = withTenantHandler(deleteHandler);
