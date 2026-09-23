import { NextResponse } from "next/server";
import { listBundles } from "@/server/bundle";
import { isEnabled } from "@/config/site";
import { withTenantHandler } from "@/server/request-tenant";

async function getHandler() {
  if (!isEnabled("bundles")) return NextResponse.json({ bundles: [] });
  return NextResponse.json({ bundles: await listBundles(true) });
}

export const GET = withTenantHandler(getHandler);
