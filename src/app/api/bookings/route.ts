import { NextResponse } from "next/server";
import { createBooking, listBookings, listServices } from "@/server/booking";
import { getSession, requireAdmin } from "@/server/auth";
import { isFeatureOn } from "@/server/settings";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { withTenantHandler } from "@/server/request-tenant";

async function getHandler() {
  if (!(await isFeatureOn("booking"))) return NextResponse.json({ message: "Tắt" }, { status: 404 });
  const session = await getSession();
  if (session?.role === "admin") {
    return NextResponse.json({ bookings: await listBookings(), services: await listServices() });
  }
  return NextResponse.json({ services: await listServices() });
}

async function postHandler(req: Request) {
  if (!(await isFeatureOn("booking"))) return NextResponse.json({ message: "Tắt" }, { status: 404 });
  if (!(await rateLimit(clientKey(req, "book"), 8, 60_000)).ok) {
    return NextResponse.json({ message: "Thử lại sau" }, { status: 429 });
  }
  const session = await getSession();
  const body = await req.json().catch(() => ({}));
  try {
    const booking = await createBooking({
      serviceId: String(body.serviceId || ""),
      userId: session?.id,
      name: String(body.name || session?.name || ""),
      email: String(body.email || session?.email || ""),
      phone: String(body.phone || ""),
      startsAt: new Date(String(body.startsAt)),
      note: body.note,
    });
    return NextResponse.json({ booking });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Lỗi" }, { status: 400 });
  }
}

async function patchHandler(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần admin" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { setBookingStatus } = await import("@/server/booking");
  const booking = await setBookingStatus(String(body.id), String(body.status));
  return NextResponse.json({ booking });
}

export const GET = withTenantHandler(getHandler);
export const POST = withTenantHandler(postHandler);
export const PATCH = withTenantHandler(patchHandler);
