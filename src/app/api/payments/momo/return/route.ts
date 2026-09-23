import { NextResponse } from "next/server";
import { verifyMomoIpn } from "@/server/momo";
import { prisma } from "@/server/db";
import { withTenantHandler } from "@/server/request-tenant";

async function getHandler(req: Request) {
  const url = new URL(req.url);
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    query[k] = v;
  });
  const app = process.env.APP_URL || "http://localhost:3000";
  const fail = (err: string) => NextResponse.redirect(`${app}/thanh-toan?err=${err}`);
  if (!verifyMomoIpn(query)) return fail("momo");
  const code = (query.orderId || "").trim();
  const order = code ? await prisma.order.findUnique({ where: { code } }) : null;
  if (!order) return fail("notfound");
  if (Number(query.amount) !== order.total) return fail("amount");
  const ok = query.resultCode === "0";
  if (order.paymentStatus !== "paid") {
    await prisma.order.updateMany({
      where: { code },
      data: { paymentStatus: ok ? "paid" : "failed", paymentRef: ok ? query.transId || order.paymentRef : order.paymentRef },
    });
  }
  if (!ok) return fail("failed");
  return NextResponse.redirect(`${app}/dat-hang-thanh-cong?code=${code}`);
}

export const GET = withTenantHandler(getHandler);
