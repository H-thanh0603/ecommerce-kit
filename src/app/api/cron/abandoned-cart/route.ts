import { NextResponse } from "next/server";
import { sendAbandonedReminders } from "@/server/abandoned";
import { safeEqual } from "@/server/crypto-util";
import { withDefaultTenant } from "@/server/tenant";

/** Cron (Vercel Cron / crontab) gọi mỗi ngày — cần CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ message: "Chưa cấu hình CRON_SECRET" }, { status: 500 });
  const auth = req.headers.get("authorization") || "";
  if (!safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ message: "Sai secret" }, { status: 401 });
  // Cron không có Host tenant — chạy cố định ở schema DEFAULT_TENANT (T5).
  const result = await withDefaultTenant(() => sendAbandonedReminders());
  return NextResponse.json({ ok: true, ...result });
}
