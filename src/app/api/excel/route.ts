import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { isFeatureOn } from "@/server/settings";
import { rateLimit, clientKey } from "@/server/rate-limit";
import { exportProductsXlsx, importProductsXlsx } from "@/server/excel";
import { withTenantHandler } from "@/server/request-tenant";

async function getHandler(req: Request) {
  // Export quét toàn bộ bảng product + dựng file xlsx — endpoint đắt, giới hạn mạnh.
  if (!(await rateLimit(clientKey(req, "excel-export"), 5, 60_000)).ok) {
    return NextResponse.json({ message: "Quá nhiều yêu cầu, thử lại sau" }, { status: 429 });
  }
  if (!(await isFeatureOn("excel"))) return NextResponse.json({ message: "Tắt" }, { status: 404 });
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

async function postHandler(req: Request) {
  if (!(await rateLimit(clientKey(req, "excel-import"), 5, 60_000)).ok) {
    return NextResponse.json({ message: "Quá nhiều yêu cầu, thử lại sau" }, { status: 429 });
  }
  if (!(await isFeatureOn("excel"))) return NextResponse.json({ message: "Tắt" }, { status: 404 });
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần admin" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ message: "Thiếu file" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ message: "Tối đa 5MB" }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  // xlsx = ZIP (PK\x03\x04) — chặn upload file mù
  if (buf.length < 4 || buf[0] !== 0x50 || buf[1] !== 0x4b) {
    return NextResponse.json({ message: "File không phải .xlsx hợp lệ" }, { status: 400 });
  }
  const n = await importProductsXlsx(buf);
  return NextResponse.json({ imported: n });
}

export const GET = withTenantHandler(getHandler);
export const POST = withTenantHandler(postHandler);
