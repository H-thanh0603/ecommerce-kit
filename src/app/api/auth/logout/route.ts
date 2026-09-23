import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/server/auth";
import { withTenantHandler } from "@/server/request-tenant";

async function postHandler() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

export const POST = withTenantHandler(postHandler);
