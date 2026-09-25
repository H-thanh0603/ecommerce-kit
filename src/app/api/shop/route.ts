import { NextResponse } from "next/server";
import { getEffectiveSiteConfig } from "@/server/settings";
import { withTenantHandler } from "@/server/request-tenant";

async function getHandler() {
  const site = await getEffectiveSiteConfig();
  return NextResponse.json({ payments: site.payments, home: site.home, features: site.features });
}

export const GET = withTenantHandler(getHandler);
