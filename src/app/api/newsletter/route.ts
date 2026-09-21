import { NextResponse } from "next/server";
import { subscribeNewsletter } from "@/server/commerce";
import { isEnabled } from "@/config/site";
import { clientKey, rateLimit } from "@/server/rate-limit";

export async function POST(req: Request) {
  if (!isEnabled("newsletter")) return NextResponse.json({ message: "Đang tắt" }, { status: 404 });
  if (!(await rateLimit(clientKey(req, "news"), 8, 60_000)).ok) {
    return NextResponse.json({ message: "Thử lại sau" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!email.includes("@")) return NextResponse.json({ message: "Email không hợp lệ" }, { status: 400 });
  await subscribeNewsletter(email);
  return NextResponse.json({ ok: true, message: "Đã đăng ký nhận thư" });
}
