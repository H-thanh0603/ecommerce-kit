import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client";

export const BOOKING_STATUSES = ["pending", "confirmed", "cancelled"] as const;

export async function listServices() {
  return prisma.bookingService.findMany({ where: { active: true }, orderBy: { name: "asc" } });
}

export async function listBookings() {
  return prisma.booking.findMany({ include: { service: true }, orderBy: { startsAt: "desc" } });
}

/** Serializable isolation đóng race double-book: 2 request song song cùng khung giờ
 *  không thể cùng qua bước check-clash (P2034 conflict → client retry). */
async function createBookingTx(tx: Prisma.TransactionClient, data: Parameters<typeof createBooking>[0]) {
  const clash = await tx.booking.findFirst({
    where: { serviceId: data.serviceId, startsAt: data.startsAt, status: { not: "cancelled" } },
  });
  if (clash) throw new Error("Khung giờ đã được đặt");
  return tx.booking.create({
    data: {
      serviceId: data.serviceId,
      userId: data.userId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      startsAt: data.startsAt,
      note: data.note || "",
    },
    include: { service: true },
  });
}

export async function createBooking(data: {
  serviceId: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  startsAt: Date;
  note?: string;
}) {
  const service = await prisma.bookingService.findFirst({ where: { id: data.serviceId, active: true } });
  if (!service) throw new Error("Dịch vụ không tồn tại");
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(
        (tx) => createBookingTx(tx, data),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (e) {
      const conflict =
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034";
      if (!conflict || attempt === 2) throw e;
    }
  }
  throw new Error("Không tạo được lịch — thử lại");
}

export async function setBookingStatus(id: string, status: string) {
  if (!(BOOKING_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Trạng thái không hợp lệ");
  }
  return prisma.booking.update({ where: { id }, data: { status } });
}
