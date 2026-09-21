import { NextResponse } from "next/server";
import { handleVnpayIpn } from "@/server/vnpay";
import { prisma } from "@/server/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    query[k] = v;
  });
  const result = await handleVnpayIpn(query, {
    findOrder: async (code) =>
      prisma.order.findUnique({ where: { code }, select: { code: true, total: true, paymentStatus: true } }),
    markPaid: async (code) => {
      await prisma.order.updateMany({ where: { code }, data: { paymentStatus: "paid" } });
    },
    markFailed: async (code) => {
      await prisma.order.updateMany({ where: { code }, data: { paymentStatus: "failed" } });
    },
  });
  return NextResponse.json(result);
}
