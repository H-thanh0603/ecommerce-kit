import { NextResponse } from "next/server";
import { listCategories, upsertCategory } from "@/server/commerce";
import { requireAdmin } from "@/server/auth";
import { withTenantHandler } from "@/server/request-tenant";

async function getHandler() {
  return NextResponse.json({ categories: await listCategories() });
}

async function postHandler(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const category = await upsertCategory({
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

export const GET = withTenantHandler(getHandler);
export const POST = withTenantHandler(postHandler);
