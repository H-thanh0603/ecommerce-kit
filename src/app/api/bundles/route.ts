import { NextResponse } from "next/server";
import { listBundles } from "@/server/bundle";
import { isFeatureOn } from "@/server/settings";
import { withTenantHandler } from "@/server/request-tenant";

async function getHandler() {
  if (!(await isFeatureOn("bundles"))) return NextResponse.json({ bundles: [] });
  return NextResponse.json({ bundles: await listBundles(true) });
}

export const GET = withTenantHandler(getHandler);
