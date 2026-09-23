import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

/** Health check cho uptime monitor + CI (không auth, không nhạy cảm). */
export async function GET() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      db: "up",
      ms: Date.now() - start,
      uptimeSec: Math.round(process.uptime()),
    });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
