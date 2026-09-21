import { describe, expect, it } from "vitest";
import { prisma } from "./db";
import { findAbandonedCarts, sendAbandonedReminders } from "./abandoned";

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

describe("abandoned cart", () => {
  it("giỏ cũ bị nhắc 1 lần; giỏ mới không nhắc", async () => {
    const email = `a${uid()}@kit.vn`.replace(/-/g, "");
    const user = await prisma.user.create({
      data: { email, name: "Bo Quen", passwordHash: "x" },
    });
    const old = new Date(Date.now() - 30 * 3600_000);
    const line = await prisma.cartLine.create({
      data: { userId: user.id, productId: "p5", quantity: 1, variantLabel: "" },
    });
    // Giả lập giỏ từ 30 giờ trước: updatedAt @updatedAt nên set tay bằng raw SQL,
    // đúng định dạng epoch-ms mà Prisma dùng trên SQLite.
    await prisma.$executeRaw`UPDATE CartLine SET updatedAt = ${old.getTime()} WHERE id = ${line.id}`;

    const fresh = await prisma.cartLine.create({
      data: { userId: user.id, productId: "p7", quantity: 1, variantLabel: "" },
    });

    const found = await findAbandonedCarts(24);
    const mine = found.find((c) => c.userId === user.id);
    expect(mine).toBeTruthy();
    // Chỉ dòng cũ hơn cutoff mới tính; dòng mới tạo không lọt vào.
    expect(mine!.lines.length).toBe(1);
    expect(mine!.lines[0].name).toBeTruthy();

    const r1 = await sendAbandonedReminders([mine!]);
    expect(r1.sent).toBe(1);
    expect(await findAbandonedCarts(24).then((l) => l.some((c) => c.userId === user.id))).toBe(false);

    await prisma.cartLine.deleteMany({ where: { userId: user.id } });
    await prisma.mailLog.deleteMany({ where: { to: email } });
    await prisma.user.delete({ where: { id: user.id } });
    void fresh;
  });
});
