import { NextResponse } from "next/server";
import { listCategories, upsertCategory } from "@/server/commerce";
import { requireAdmin } from "@/server/auth";

export async function GET() {
  return NextResponse.json({ categories: await listCategories() });
}

export async function POST(req: Request) {
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
