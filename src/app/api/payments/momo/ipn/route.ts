import { NextResponse } from "next/server";
import { handleMomoIpn } from "@/server/momo";
import { prisma } from "@/server/db";

/** MoMo gọi POST JSON về đây sau khi khách trả. */
export async function POST(req: Request) {
  const data = await req.json().catch(() => ({}));
  const result = await handleMomoIpn(data, {
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
