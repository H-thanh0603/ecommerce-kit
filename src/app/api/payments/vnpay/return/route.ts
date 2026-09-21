import { NextResponse } from "next/server";
import { verifyVnpay } from "@/server/vnpay";
import { prisma } from "@/server/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    query[k] = v;
  });
  const app = process.env.APP_URL || "http://localhost:3000";
  const fail = (err: string) => NextResponse.redirect(`${app}/thanh-toan?err=${err}`);
  if (!verifyVnpay(query)) return fail("vnpay");
  const code = (query.vnp_TxnRef || "").trim();
  const order = code ? await prisma.order.findUnique({ where: { code } }) : null;
  if (!order) return fail("notfound");
  const amount = Math.floor(Number(query.vnp_Amount || "0") / 100);
  if (amount !== order.total) return fail("amount");
  const ok = query.vnp_ResponseCode === "00";
  if (order.paymentStatus !== "paid") {
    await prisma.order.updateMany({
      where: { code },
      data: { paymentStatus: ok ? "paid" : "failed" },
    });
  }
  if (!ok) return fail("failed");
  return NextResponse.redirect(`${app}/dat-hang-thanh-cong?code=${code}`);
}
