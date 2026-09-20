import { NextResponse } from "next/server";
import { loginUser } from "@/server/auth";
import { clientKey, rateLimit } from "@/server/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "login"), 8, 60_000).ok) {
    return NextResponse.json({ ok: false, message: "Thử lại sau" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const result = await loginUser(String(body.email || ""), String(body.password || ""));
  const status = result.ok ? 200 : 400;
  return NextResponse.json(result, { status });
}
