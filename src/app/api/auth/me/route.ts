import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { withTenantHandler } from "@/server/request-tenant";

async function getHandler() {
  const user = await getSession();
  return NextResponse.json({ user });
}

export const GET = withTenantHandler(getHandler);
