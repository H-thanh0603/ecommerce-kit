import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { saveImage } from "@/server/storage";
import path from "path";

/** Magic-byte check — chặn upload file mù / polyglot chỉ đổi phần mở rộng. */
function isImageMagic(buf: Buffer, ext: string): boolean {
  if (buf.length < 12) return false;
  const e = ext === ".jpeg" ? ".jpg" : ext;
  if (e === ".jpg") return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (e === ".png") return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (e === ".gif") return buf.subarray(0, 6).toString("latin1") === "GIF89a" || buf.subarray(0, 6).toString("latin1") === "GIF87a";
  if (e === ".webp") return buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP";
  return false;
}

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
  const buf = Buffer.from(await file.arrayBuffer());
  if (!isImageMagic(buf, ext)) {
    return NextResponse.json({ message: "File không phải ảnh hợp lệ" }, { status: 400 });
  }
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const saved = await saveImage(buf, name, file.type || "application/octet-stream");
  if (!saved.ok) return NextResponse.json({ message: saved.message || "Upload thất bại" }, { status: 502 });
  return NextResponse.json({ url: saved.url });
}
