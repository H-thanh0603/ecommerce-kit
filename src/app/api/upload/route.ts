import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { saveImage } from "@/server/storage";
import path from "path";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ message: "Thiếu file" }, { status: 400 });
  if (file.size > 3 * 1024 * 1024) return NextResponse.json({ message: "Tối đa 3MB" }, { status: 400 });
  const ext = path.extname(file.name).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
    return NextResponse.json({ message: "Chỉ ảnh jpg/png/webp" }, { status: 400 });
  }
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const saved = await saveImage(buf, name, file.type || "application/octet-stream");
  if (!saved.ok) return NextResponse.json({ message: saved.message || "Upload thất bại" }, { status: 502 });
  return NextResponse.json({ url: saved.url });
}
