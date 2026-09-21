import { NextResponse } from "next/server";
import { sendAbandonedReminders } from "@/server/abandoned";

/** Cron (Vercel Cron / crontab) gọi mỗi ngày — cần CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ message: "Chưa cấu hình CRON_SECRET" }, { status: 500 });
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ message: "Sai secret" }, { status: 401 });
  const result = await sendAbandonedReminders();
  return NextResponse.json({ ok: true, ...result });
}
