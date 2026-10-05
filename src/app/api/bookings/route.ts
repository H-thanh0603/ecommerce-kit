import { NextResponse } from "next/server";
import { createBooking, listBookings, listServices } from "@/server/booking";
import { getSession, requireAdmin } from "@/server/auth";
import { isFeatureOn } from "@/server/settings";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { withTenantHandler } from "@/server/request-tenant";
import { publicError } from "@/server/errors";
import { bookingSchema } from "@/lib/validators";

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
  // name/email fallback về session khi client không gửi (đã đăng nhập).
  const candidate = {
    serviceId: typeof body?.serviceId === "string" ? body.serviceId : "",
    name: typeof body?.name === "string" && body.name.trim() ? body.name : (session?.name ?? ""),
    email: typeof body?.email === "string" && body.email.trim() ? body.email : (session?.email ?? ""),
    phone: typeof body?.phone === "string" ? body.phone : "",
    startsAt: typeof body?.startsAt === "string" ? body.startsAt : "",
    note: typeof body?.note === "string" ? body.note : undefined,
  };
  const parsed = bookingSchema.safeParse(candidate);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  try {
    const booking = await createBooking({
      serviceId: parsed.data.serviceId,
      userId: session?.id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      startsAt: new Date(parsed.data.startsAt),
      note: parsed.data.note,
    });
    return NextResponse.json({ booking });
  } catch (e) {
    return NextResponse.json({ message: publicError(e) }, { status: 400 });
  }
}

async function patchHandler(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần admin" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { setBookingStatus } = await import("@/server/booking");
  try {
    const booking = await setBookingStatus(String(body.id), String(body.status));
    return NextResponse.json({ booking });
  } catch (e) {
    return NextResponse.json({ message: publicError(e) }, { status: 400 });
  }
}

export const GET = withTenantHandler(getHandler);
export const POST = withTenantHandler(postHandler);
export const PATCH = withTenantHandler(patchHandler);
