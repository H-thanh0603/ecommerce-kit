import { afterAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { platformDb, createTenant, findTenantByHost } from "./platform-db";
import { getClientForSchema, unmarkSchemaProvisioned, forgetClient } from "./db";
import { dropSchema, ensureSchema } from "./test-schema";

const run = { stdio: "pipe" as const, timeout: 180_000 };

describe("migrate-all-schemas (T5)", () => {
  it("chạy 2 lần liên tiếp đều exit 0 (idempotent)", () => {
    expect(() => execSync("npx tsx scripts/migrate-all-schemas.ts", run)).not.toThrow();
    expect(() => execSync("npx tsx scripts/migrate-all-schemas.ts", run)).not.toThrow();
  }, 360_000);
});

// Warm-up (đóng T4 watch): migrate:all / tenant:create chạy ở process khác nên
// Set schemasProvisioned của process web trống — lookup theo Host phải tự mark
// khi schema đã tồn tại, giữ fail-closed khi schema vắng thật.
const W = `wm${Date.now()}`;
const G = `wg${Date.now()}`;
const HOST_W = `${W}.warm.test`;
const HOST_G = `${G}.warm.test`;

describe("schemasProvisioned warm-up (T4 watch)", () => {
  it("schema đã migrate nhưng chưa mark → findTenantByHost tự heal; schema thiếu → vẫn fail-closed", async () => {
    await createTenant({ slug: W, name: "Warm Shop", hosts: [HOST_W] });
    await createTenant({ slug: G, name: "Ghost Shop", hosts: [HOST_G] });

    // Migrate như process khác (migrate:all) rồi bỏ mark — mô phỏng web process chưa warm
    await ensureSchema(W);
    unmarkSchemaProvisioned(W);
    forgetClient(W);

    // Chưa warm → fail-closed với lỗi rõ ràng
    expect(() => getClientForSchema(W)).toThrowError(`Thiếu schema ${W} — chạy migrate-all trước`);

    // Lookup theo Host (request entry trước khi vào ALS) → warm đánh dấu → query đi được
    expect((await findTenantByHost(HOST_W))?.slug).toBe(W);
    expect(() => getClientForSchema(W)).not.toThrow();

    // Row tenant có nhưng schema vắng thật sự → warm không mark, vẫn fail-closed
    expect((await findTenantByHost(HOST_G))?.slug).toBe(G);
    expect(() => getClientForSchema(G)).toThrowError(`Thiếu schema ${G} — chạy migrate-all trước`);
  }, 180_000);

  afterAll(async () => {
    await dropSchema(W);
    await platformDb.tenantDomain.deleteMany({ where: { host: { in: [HOST_W, HOST_G] } } });
    await platformDb.tenant.deleteMany({ where: { slug: { in: [W, G] } } });
    await platformDb.$disconnect();
  });
});
