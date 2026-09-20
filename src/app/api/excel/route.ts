import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { isEnabled } from "@/config/site";
import { exportProductsXlsx, importProductsXlsx } from "@/server/excel";

export async function GET() {
  if (!isEnabled("excel")) return NextResponse.json({ message: "Tắt" }, { status: 404 });
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần admin" }, { status: 401 });
  const buf = await exportProductsXlsx();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=products.xlsx",
    },
  });
}

export async function POST(req: Request) {
  if (!isEnabled("excel")) return NextResponse.json({ message: "Tắt" }, { status: 404 });
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần admin" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ message: "Thiếu file" }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const n = await importProductsXlsx(buf);
  return NextResponse.json({ imported: n });
}
