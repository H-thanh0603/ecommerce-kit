import { NextResponse } from "next/server";
import { safeEqual } from "@/server/crypto-util";

/** Cron dọn retention (Q63/Q64) — CRON_SECRET bắt buộc. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ message: "Chưa cấu hình CRON_SECRET" }, { status: 500 });
  const auth = req.headers.get("authorization") || "";
  if (!safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ message: "Sai secret" }, { status: 401 });
  }
  try {
    const { runRetentionPurge } = await import("@/server/retention");
    const { withDefaultTenant } = await import("@/server/tenant");
    // Cron không có Host tenant — chạy cố định ở schema DEFAULT_TENANT (T5).
    const result = await withDefaultTenant(() => runRetentionPurge());
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Lỗi purge" },
      { status: 500 },
    );
  }
}
