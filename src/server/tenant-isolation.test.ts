import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getClientForSchema, prisma } from "./db";
import { ensureSchema, dropSchema } from "./test-schema";
import { runWithTenant } from "./tenant-context";

const A = `iso_a_${Date.now()}`;
const B = `iso_b_${Date.now()}`;

describe("isolation 2 schema (T3)", () => {
  beforeAll(async () => {
    await ensureSchema(A);
    await ensureSchema(B);
  }, 180_000);

  afterAll(async () => {
    await dropSchema(A);
    await dropSchema(B);
  }, 60_000);

  it("insert ở A không thấy ở B, lặp 20 lần (pool reuse không leak)", async () => {
    const ca = getClientForSchema(A);
    const cb = getClientForSchema(B);
    for (let i = 0; i < 20; i++) {
      const email = `iso${i}.${Date.now()}@iso.test`;
      await ca.user.create({ data: { email, name: "A", passwordHash: "x" } });
      expect(await cb.user.findUnique({ where: { email } })).toBeNull();
      expect(await ca.user.findUnique({ where: { email } })).not.toBeNull();
      await ca.user.delete({ where: { email } });
    }
  }, 60_000);

  it("ALS context chọn đúng client qua prisma proxy", async () => {
    const email = `proxy.${Date.now()}@iso.test`;
    await runWithTenant(A, () => prisma.user.create({ data: { email, name: "P", passwordHash: "x" } }));
    expect(await runWithTenant(B, () => prisma.user.findUnique({ where: { email } }))).toBeNull();
    // Acceptance plan: row trong tenant A VÔ HÌNH từ default scope (ngoài ALS → public)
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
    expect(await runWithTenant(A, () => prisma.user.findUnique({ where: { email } }))).not.toBeNull();
    await runWithTenant(A, () => prisma.user.delete({ where: { email } }));
  }, 30_000);

  it("schema chưa migrate → lỗi rõ tiếng Việt, không cache client chết", () => {
    const missing = `nope_${Date.now()}`;
    expect(() => getClientForSchema(missing)).toThrowError(
      `Thiếu schema ${missing} — chạy migrate-all trước`,
    );
    const map = (globalThis as { prismaClients?: Map<string, unknown> }).prismaClients;
    expect(map?.has(missing)).toBe(false);
    // public giữ nguyên đường cũ — không qua guard
    expect(() => getClientForSchema("public")).not.toThrow();
  });
});
