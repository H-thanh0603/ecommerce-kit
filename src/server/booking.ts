import { prisma } from "@/server/db";

export async function listServices() {
  return prisma.bookingService.findMany({ where: { active: true }, orderBy: { name: "asc" } });
}

export async function listBookings() {
  return prisma.booking.findMany({ include: { service: true }, orderBy: { startsAt: "desc" } });
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
  const clash = await prisma.booking.findFirst({
    where: { serviceId: data.serviceId, startsAt: data.startsAt, status: { not: "cancelled" } },
  });
  if (clash) throw new Error("Khung giờ đã được đặt");
  return prisma.booking.create({
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

export async function setBookingStatus(id: string, status: string) {
  return prisma.booking.update({ where: { id }, data: { status } });
}
