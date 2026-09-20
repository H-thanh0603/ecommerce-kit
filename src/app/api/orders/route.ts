import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, listOrders } from "@/server/commerce";
import { getSession } from "@/server/auth";
import { isEnabled } from "@/config/site";

const itemSchema = z.object({
  productId: z.string(),
  slug: z.string(),
  name: z.string(),
  image: z.string(),
  price: z.number(),
  quantity: z.number().int().positive(),
  variantLabel: z.string().optional(),
});

const checkoutSchema = z.object({
  customer: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  address: z.string().min(6),
  note: z.string().optional(),
  paymentMethod: z.string(),
  couponCode: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ orders: [] });
  const orders =
    session.role === "admin"
      ? await listOrders()
      : await listOrders({ email: session.email, userId: session.id });
  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session && !isEnabled("guestCheckout")) {
    return NextResponse.json({ message: "Cần đăng nhập để đặt hàng" }, { status: 401 });
  }
  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Thiếu thông tin đặt hàng" }, { status: 400 });
  }
  try {
    const order = await createOrder({
      ...parsed.data,
      userId: session?.id,
    });
    return NextResponse.json({ order });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Không đặt được hàng" }, { status: 400 });
  }
}
