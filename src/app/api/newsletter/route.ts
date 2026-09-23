import { NextResponse } from "next/server";
import { subscribeNewsletter } from "@/server/commerce";
import { isEnabled } from "@/config/site";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { withTenantHandler } from "@/server/request-tenant";

async function postHandler(req: Request) {
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

/** Huỷ đăng ký (Q156) — không cần login, rate limit theo IP. */
async function deleteHandler(req: Request) {
  if (!isEnabled("newsletter")) return NextResponse.json({ message: "Đang tắt" }, { status: 404 });
  if (!(await rateLimit(clientKey(req, "news-unsub"), 8, 60_000)).ok) {
    return NextResponse.json({ message: "Thử lại sau" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!email.includes("@")) return NextResponse.json({ message: "Email không hợp lệ" }, { status: 400 });
  const res = await prisma.newsletter.deleteMany({ where: { email } });
  await logAudit({ action: "newsletter.unsubscribe", entity: "Newsletter", entityId: email });
  return NextResponse.json({
    ok: true,
    message: res.count > 0 ? "Đã huỷ đăng ký" : "Email chưa có trong danh sách",
  });
}

export const POST = withTenantHandler(postHandler);
export const DELETE = withTenantHandler(deleteHandler);
