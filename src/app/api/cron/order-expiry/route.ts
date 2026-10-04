import { NextResponse } from "next/server";
import { safeEqual } from "@/server/crypto-util";

/** Cron hủy đơn pending quá hạn (khách bỏ ngang gateway) — CRON_SECRET bắt buộc. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ message: "Chưa cấu hình CRON_SECRET" }, { status: 500 });
  const auth = req.headers.get("authorization") || "";
  if (!safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ message: "Sai secret" }, { status: 401 });
  try {
    const { cancelStalePendingOrders } = await import("@/server/order");
    const { withAllTenants } = await import("@/server/tenant");
    // Cron không có Host tenant — chạy qua public + mọi tenant active.
    const results = await withAllTenants(() => cancelStalePendingOrders());
    return NextResponse.json({
      ok: results.every((r) => r.ok),
      tenants: results.map((r) => ({ slug: r.slug, ok: r.ok, ...(r.ok ? { ...r.result } : { error: r.error }) })),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Lỗi auto-cancel" },
      { status: 500 },
    );
  }
}
