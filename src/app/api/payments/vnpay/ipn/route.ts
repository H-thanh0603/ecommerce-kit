import { NextResponse } from "next/server";
import { verifyVnpay } from "@/server/vnpay";
import { prisma } from "@/server/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    query[k] = v;
  });
  if (!verifyVnpay(query)) return NextResponse.json({ RspCode: "97", Message: "Fail checksum" });
  const code = query.vnp_TxnRef;
  const ok = query.vnp_ResponseCode === "00";
  if (code) {
    await prisma.order.updateMany({
      where: { code },
      data: { paymentStatus: ok ? "paid" : "failed" },
    });
  }
  return NextResponse.json({ RspCode: "00", Message: "Success" });
}
