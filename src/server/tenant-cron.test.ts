import { describe, expect, it } from "vitest";
import { runWithTenant } from "./tenant-context";
import { getClientForSchema } from "./db";
import { ensureSchema, dropSchema } from "./test-schema";
import { runRetentionPurge } from "./retention";
import { withDefaultTenant } from "./tenant";

const S = `cron_${Date.now()}`;

describe("cron under tenant context (T5)", () => {
  it("retention purge chạy đúng schema", async () => {
    await ensureSchema(S);
    try {
      const client = getClientForSchema(S);
      const u = await client.user.create({
        data: { email: `cron${Date.now()}@t.vn`, name: "C", passwordHash: "x" },
      });
      await client.passwordReset.create({
        data: {
          userId: u.id,
          tokenHash: "h",
          expiresAt: new Date(Date.now() - 1000),
          createdAt: new Date(Date.now() - 8 * 86400_000),
        },
      });
      const result = await runWithTenant(S, () => runRetentionPurge());
      expect(result.passwordResets).toBeGreaterThanOrEqual(1);
      expect(await client.passwordReset.count({ where: { userId: u.id } })).toBe(0);
      await client.user.delete({ where: { id: u.id } });
    } finally {
      await dropSchema(S);
    }
  }, 180_000);

  it("cron retention route wrap withDefaultTenant (đọc source)", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/app/api/cron/retention/route.ts", "utf8");
    expect(src).toContain("withDefaultTenant");
  });

  it("withDefaultTenant chạy fn trong schema DEFAULT_TENANT/public", async () => {
    const prev = process.env.DEFAULT_TENANT;
    try {
      process.env.DEFAULT_TENANT = "public";
      const { getTenantSchema } = await import("./tenant-context");
      expect(withDefaultTenant(() => getTenantSchema())).toBe("public");
      // Mặc định khi thiếu env cũng là public (quan trọng — `= undefined`
      // của process.env sẽ thành chuỗi "undefined" nên phải delete).
      delete process.env.DEFAULT_TENANT;
      expect(withDefaultTenant(() => getTenantSchema())).toBe("public");
    } finally {
      if (prev === undefined) delete process.env.DEFAULT_TENANT;
      else process.env.DEFAULT_TENANT = prev;
    }
  });
});
