import { NextResponse } from "next/server";
import { getCoupon } from "@/server/commerce";
import { isEnabled } from "@/config/site";

export async function POST(req: Request) {
  if (!isEnabled("coupons")) {
    return NextResponse.json({ message: "Module mã giảm giá đang tắt" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const coupon = await getCoupon(String(body.code || ""));
  if (!coupon) return NextResponse.json({ message: "Mã không tồn tại" }, { status: 404 });
  return NextResponse.json({
    coupon: { code: coupon.code, type: coupon.type, value: coupon.value, minOrder: coupon.minOrder },
  });
}
