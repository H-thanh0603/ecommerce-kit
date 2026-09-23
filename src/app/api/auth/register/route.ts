import { NextResponse } from "next/server";
import { registerUser } from "@/server/auth";
import { clientKey, rateLimit } from "@/server/rate-limit";

export async function POST(req: Request) {
  if (!(await rateLimit(clientKey(req, "register"), 5, 300_000)).ok) {
    return NextResponse.json({ ok: false, message: "Thử lại sau" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const result = await registerUser(
    String(body.name || ""),
    String(body.email || ""),
    String(body.password || ""),
  );
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
