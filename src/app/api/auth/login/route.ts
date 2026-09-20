import { NextResponse } from "next/server";
import { loginUser } from "@/server/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = await loginUser(String(body.email || ""), String(body.password || ""));
  const status = result.ok ? 200 : 400;
  return NextResponse.json(result, { status });
}
