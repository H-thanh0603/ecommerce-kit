import { NextResponse } from "next/server";
import { quoteShipping } from "@/server/shipping";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const quote = await quoteShipping({
    subtotal: Number(body.subtotal || 0),
    innerCity: Boolean(body.innerCity),
    weightGrams: Number(body.weightGrams || 500),
    toDistrictId: body.toDistrictId ? Number(body.toDistrictId) : undefined,
    toWardCode: body.toWardCode ? String(body.toWardCode) : undefined,
  });
  return NextResponse.json(quote);
}
