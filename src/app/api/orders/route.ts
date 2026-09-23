import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, listOrders } from "@/server/commerce";
import { getSession } from "@/server/auth";
import { isEnabled } from "@/config/site";
import { clientKey, rateLimit } from "@/server/rate-limit";

const itemSchema = z.object({
  productId: z.string(),
  slug: z.string(),
  name: z.string(),
  image: z.string(),
  price: z.number(),
  quantity: z.number().int().positive(),
  variantLabel: z.string().optional(),
  skuId: z.string().optional(),
});

const checkoutSchema = z.object({
  customer: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  address: z.string().min(6),
  note: z.string().optional(),
  paymentMethod: z.string(),
  couponCode: z.string().optional(),
  giftCode: z.string().optional(),
  bundleId: z.string().optional(),
  innerCity: z.boolean().optional(),
  pointsToUse: z.number().int().min(0).max(1_000_000).optional(),
  /** Idempotency key phía client — double-POST không tạo 2 đơn. */
  clientRequestId: z.string().min(8).max(64).optional(),
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
  if (!(await rateLimit(clientKey(req, "checkout"), 10, 60_000)).ok) {
    return NextResponse.json({ message: "Thử lại sau" }, { status: 429 });
  }
  const session = await getSession();
  if (!session && !isEnabled("guestCheckout")) {
    return NextResponse.json({ message: "Cần đăng nhập để đặt hàng" }, { status: 401 });
  }
  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Thiếu thông tin đặt hàng" }, { status: 400 });
  }
  // Idempotency: client gửi lại cùng clientRequestId → trả đơn cũ, không tạo mới.
  const rid = parsed.data.clientRequestId;
  if (rid) {
    const { prisma } = await import("@/server/db");
    const { toOrder } = await import("@/server/map");
    const dup = await prisma.order.findUnique({ where: { clientRequestId: rid }, include: { items: true } });
    if (dup) return NextResponse.json({ order: toOrder(dup), idempotent: true });
  }
  try {
    const order = await createOrder({
      ...parsed.data,
      userId: session?.id,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1",
    });
    return NextResponse.json({ order, payUrl: order.payUrl });
  } catch (e) {
    // Race: unique clientRequestId vừa bị POST khác thắng → trả đơn đã tạo.
    if (rid && /unique|Unique/i.test(String(e))) {
      const { prisma } = await import("@/server/db");
      const { toOrder } = await import("@/server/map");
      const dup = await prisma.order.findUnique({ where: { clientRequestId: rid }, include: { items: true } });
      if (dup) return NextResponse.json({ order: toOrder(dup), idempotent: true });
    }
    return NextResponse.json({ message: e instanceof Error ? e.message : "Không đặt được hàng" }, { status: 400 });
  }
}
