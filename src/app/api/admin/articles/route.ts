import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { deleteArticle, listArticlesAdmin, upsertArticle } from "@/server/catalog";
import { withTenantHandler } from "@/server/request-tenant";

async function getHandler() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  return NextResponse.json({ articles: await listArticlesAdmin() });
}

async function postHandler(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  try {
    if (body.action === "delete") {
      await deleteArticle(String(body.id || ""));
      return NextResponse.json({ ok: true });
    }
    const article = await upsertArticle({
      id: body.id || undefined,
      slug: String(body.slug || ""),
      title: String(body.title || ""),
      excerpt: String(body.excerpt || ""),
      cover: String(body.cover || ""),
      body: String(body.body || ""),
      date: body.date ? String(body.date) : undefined,
      minutes: body.minutes ? Number(body.minutes) : undefined,
    });
    return NextResponse.json({ ok: true, article });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Lưu thất bại" }, { status: 400 });
  }
}

export const GET = withTenantHandler(getHandler);
export const POST = withTenantHandler(postHandler);
