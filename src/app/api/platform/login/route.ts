import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { PLATFORM_COOKIE, signPlatformSession } from "@/server/platform-auth";
import { platformDb } from "@/server/platform-db";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { withTenantHandler } from "@/server/request-tenant";

async function postHandler(req: Request) {
  if (!(await rateLimit(clientKey(req, "platform-login"), 8, 60_000)).ok) {
    return NextResponse.json({ ok: false, message: "Thử lại sau" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (email && !(await rateLimit(`platform-login-email:${email}`, 10, 900_000)).ok) {
    return NextResponse.json({ ok: false, message: "Thử lại sau" }, { status: 429 });
  }
  const admin = email ? await platformDb.platformAdmin.findUnique({ where: { email } }) : null;
  if (!admin || !password || !(await bcrypt.compare(password, admin.passwordHash))) {
    return NextResponse.json({ ok: false, message: "Email hoặc mật khẩu chưa đúng" }, { status: 401 });
  }
  const token = await signPlatformSession({ id: admin.id, email: admin.email });
  const jar = await cookies();
  jar.set(PLATFORM_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
  });
  return NextResponse.json({ ok: true, email: admin.email });
}

async function deleteHandler() {
  const jar = await cookies();
  jar.delete(PLATFORM_COOKIE);
  return NextResponse.json({ ok: true });
}

export const POST = withTenantHandler(postHandler);
export const DELETE = withTenantHandler(deleteHandler);
