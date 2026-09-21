import { NextResponse } from "next/server";
import { resetPassword } from "@/server/auth";
import { clientKey, rateLimit } from "@/server/rate-limit";

export async function POST(req: Request) {
  if (!(await rateLimit(clientKey(req, "reset"), 8, 60_000)).ok) {
    return NextResponse.json({ message: "Thử lại sau" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const result = await resetPassword(String(body.email || ""), String(body.token || ""), String(body.password || ""));
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
