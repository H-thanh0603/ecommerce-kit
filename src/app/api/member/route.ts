import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { getMember } from "@/server/membership";
import { isEnabled } from "@/config/site";

export async function GET() {
  if (!isEnabled("membership")) return NextResponse.json({ member: null });
  const session = await getSession();
  if (!session) return NextResponse.json({ member: null });
  return NextResponse.json({ member: await getMember(session.id) });
}
