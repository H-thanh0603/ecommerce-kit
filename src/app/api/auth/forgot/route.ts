import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/server/auth";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { withTenantHandler } from "@/server/request-tenant";

async function postHandler(req: Request) {
  if (!(await rateLimit(clientKey(req, "forgot"), 5, 60_000)).ok) {
    return NextResponse.json({ message: "Thử lại sau" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const result = await requestPasswordReset(String(body.email || ""));
  return NextResponse.json(result);
}

export const POST = withTenantHandler(postHandler);
