import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { deleteBundle, listBundles, upsertBundle } from "@/server/bundle";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  return NextResponse.json({ bundles: await listBundles(false) });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  try {
    if (body.action === "delete") {
      await deleteBundle(String(body.id || ""));
      return NextResponse.json({ ok: true });
    }
    const bundle = await upsertBundle({
      id: body.id || undefined,
      name: String(body.name || ""),
      lines: Array.isArray(body.lines) ? body.lines : JSON.parse(String(body.linesJson || "[]")),
      price: Number(body.price || 0),
      active: body.active !== false,
    });
    return NextResponse.json({ ok: true, bundle });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Lưu thất bại" }, { status: 400 });
  }
}
