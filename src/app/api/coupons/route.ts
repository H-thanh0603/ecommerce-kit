import { NextResponse } from "next/server";
import { assertCoupon } from "@/server/commerce";
import { isEnabled } from "@/config/site";
import { getSession } from "@/server/auth";

export async function POST(req: Request) {
  if (!isEnabled("coupons")) {
    return NextResponse.json({ message: "Module mã giảm giá đang tắt" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const session = await getSession();
  try {
    const coupon = await assertCoupon(
      String(body.code || ""),
      Number(body.subtotal || 0),
      session?.email || String(body.email || ""),
      session?.id,
    );
    return NextResponse.json({
      coupon: { code: coupon.code, type: coupon.type, value: coupon.value, minOrder: coupon.minOrder },
    });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Mã không hợp lệ" }, { status: 400 });
  }
}
