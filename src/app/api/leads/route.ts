import { NextResponse } from "next/server";
import { listLeads, listNewsletter } from "@/server/commerce";
import { requireAdmin } from "@/server/auth";
import { listMailLog } from "@/server/mail";
import { withTenantHandler } from "@/server/request-tenant";

async function getHandler() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 401 });
  const [leads, newsletter, mail] = await Promise.all([listLeads(), listNewsletter(), listMailLog(30)]);
  return NextResponse.json({ leads, newsletter, mail });
}

export const GET = withTenantHandler(getHandler);
