import { NextResponse } from "next/server";
import { checkVietqrTransaction } from "@/server/vietqr";
import { logOrderEventByCode } from "@/server/order-events";
import { prisma } from "@/server/db";
import { withTenantHandler } from "@/server/request-tenant";
import { getSession } from "@/server/auth";
import { rateLimit, clientKey } from "@/server/rate-limit";

/** Khách bấm "Tôi đã chuyển khoản" — dò giao dịch rồi chốt đơn nếu thấy tiền.
 *  Mỗi lượt dò là 1 call outbound tới cổng VietQR nên phải có rate-limit;
 *  chốt đơn là mutation trạng thái nên phải đối chiếu quyền như retry-pay. */
export const POST = withTenantHandler(async (req: Request) => {
  if (!(await rateLimit(clientKey(req, "vietqr-check"), 10, 60_000)).ok) {
    return NextResponse.json({ ok: false, message: "Thử lại sau" }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as { code?: string; email?: string };
  const code = String(body.code || "").trim();
  if (!code) return NextResponse.json({ ok: false, message: "Thiếu mã đơn" }, { status: 400 });
  const order = await prisma.order.findUnique({
    where: { code },
    select: {
      code: true,
      total: true,
      email: true,
      userId: true,
      paymentStatus: true,
      paymentMethod: true,
    },
  });
  if (!order) return NextResponse.json({ ok: false, message: "Không thấy đơn" }, { status: 404 });

  // Chống IDOR (pattern retry-pay): admin bypass; user chỉ đơn của mình; guest
  // phải gửi email khớp — sai trả 404 như đơn không tồn tại.
  const session = await getSession();
  if (session?.role !== "admin") {
    if (session?.id) {
      const owns =
        order.userId != null
          ? order.userId === session.id
          : !!session.email &&
            order.email.toLowerCase() === session.email.trim().toLowerCase();
      if (!owns) return NextResponse.json({ ok: false, message: "Không có quyền" }, { status: 403 });
    } else {
      const bodyEmail = String(body.email || "").trim().toLowerCase();
      if (!bodyEmail || order.email.toLowerCase() !== bodyEmail) {
        return NextResponse.json({ ok: false, message: "Không thấy đơn" }, { status: 404 });
      }
    }
  }
  if (order.paymentMethod !== "vietqr") {
    return NextResponse.json({ ok: false, message: "Đơn không dùng VietQR" }, { status: 400 });
  }
  if (order.paymentStatus === "paid") {
    return NextResponse.json({ ok: true, paid: true, message: "Đơn đã được xác nhận thanh toán" });
  }
  const r = await checkVietqrTransaction({ code: order.code, total: order.total });
  if (r.ok && r.paid) {
    // Chốt paid trong 1 transaction; where chặn sửa đè nếu webhook đã kịp ghi.
    await prisma.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: { code, paymentStatus: { not: "paid" } },
        data: { paymentStatus: "paid" },
      });
    });
    await logOrderEventByCode(code, "payment", "VietQR: khách xác nhận đã chuyển khoản, dò thấy giao dịch");
    const { dispatchWebhooks } = await import("@/server/webhooks");
    await dispatchWebhooks("order.paid", { code, gateway: "vietqr" });
  }
  return NextResponse.json(r);
});
