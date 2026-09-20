import { NextResponse } from "next/server";
import { registerUser } from "@/server/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = await registerUser(
    String(body.name || ""),
    String(body.email || ""),
    String(body.password || ""),
  );
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
