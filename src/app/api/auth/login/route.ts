import { NextResponse } from "next/server";
import { loginUser } from "@/server/auth";
import { clientKey, rateLimit } from "@/server/rate-limit";

export async function POST(req: Request) {
  if (!(await rateLimit(clientKey(req, "login"), 8, 60_000)).ok) {
    return NextResponse.json({ ok: false, message: "Thử lại sau" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  // Throttle theo từng tài khoản — chặn brute-force phân tán IP nhắm 1 email.
  if (email && !(await rateLimit(`login-email:${email}`, 10, 900_000)).ok) {
    return NextResponse.json({ ok: false, message: "Thử lại sau" }, { status: 429 });
  }
  const result = await loginUser(email, String(body.password || ""), String(body.mfaCode || "") || undefined);
  const status = result.ok ? 200 : result.mfaRequired ? 401 : 400;
  return NextResponse.json(result, { status });
}
