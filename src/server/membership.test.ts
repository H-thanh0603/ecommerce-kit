import { describe, expect, it } from "vitest";
import { prisma } from "./db";
import { createOrder, getProductById } from "./commerce";
import { defaultWarehouse, setWarehouseStock } from "./warehouse";

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

/** Đảm bảo cờ membership bật (default true; có thể bị override trong DB). */
async function ensureMembership() {
  const row = await prisma.siteSetting.findUnique({ where: { key: "features" } });
  const cur = row ? (JSON.parse(row.value) as Record<string, boolean>) : {};
  if (cur.membership === false) {
    const next = JSON.stringify({ ...cur, membership: true });
    await prisma.siteSetting.upsert({
      where: { key: "features" },
      create: { key: "features", value: next },
      update: { value: next },
    });
  }
}

async function restockP12(n = 20) {
  await prisma.product.update({ where: { id: "p12" }, data: { stock: n } });
  const wh = await defaultWarehouse();
  if (wh) await setWarehouseStock(wh.id, "p12", "", n);
}

async function makeUser(points: number) {
  return prisma.user.create({
    data: { email: `mb${uid()}@kit.vn`.replace(/-/g, ""), name: "Member", passwordHash: "x", points },
  });
}

async function checkout(user: { id: string }, pointsToUse?: number) {
  const p = await getProductById("p12");
  return createOrder({
    customer: "Diem",
    email: `d${uid()}@kit.vn`.replace(/-/g, ""),
    phone: "0900000000",
    address: "1 Test, Q1",
    paymentMethod: "cod",
    userId: user.id,
    pointsToUse,
    items: [
      {
        productId: "p12",
        slug: p!.slug,
        name: p!.name,
        image: p!.images[0] || "",
        price: p!.price,
        quantity: 1,
        variantLabel: "",
      },
    ],
  });
}

async function cleanupUser(userId: string, orderIds: string[] = []) {
  for (const id of orderIds) {
    await prisma.orderItem.deleteMany({ where: { orderId: id } });
    const o = await prisma.order.findUnique({ where: { id }, select: { code: true } });
    if (o) await prisma.stockMovement.deleteMany({ where: { ref: o.code } });
    await prisma.order.deleteMany({ where: { id } });
  }
  await prisma.user.delete({ where: { id: userId } });
}

describe("membership điểm tích lũy", () => {
  it("không đủ điểm: bị từ chối, không được giảm giá, số dư không đổi", async () => {
    await ensureMembership();
    await restockP12();
    const user = await makeUser(0);
    await expect(checkout(user, 100_000)).rejects.toThrow(/điểm/i);
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after!.points).toBe(0);
    await cleanupUser(user.id);
  });

  it("đủ điểm: trừ đúng số dư, order.pointsUsed khớp, giảm tổng", async () => {
    await ensureMembership();
    await restockP12();
    const user = await makeUser(1_000);
    const order = await checkout(user, 500);
    expect(order.pointsUsed).toBe(500);
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after!.points).toBe(500);
    await cleanupUser(user.id, [order.id]);
  });

  it("điểm âm / không nguyên bị chặn server-side", async () => {
    await ensureMembership();
    await restockP12();
    const user = await makeUser(100);
    await expect(checkout(user, -100)).rejects.toThrow(/điểm/i);
    await expect(checkout(user, 10.5)).rejects.toThrow(/điểm/i);
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after!.points).toBe(100);
    await cleanupUser(user.id);
  });
});
