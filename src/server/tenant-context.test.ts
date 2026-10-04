import { describe, expect, it } from "vitest";
import { enterTenantScope, getTenantSchema, runWithTenant } from "./tenant-context";

describe("tenant-context (ALS)", () => {
  it("ngoài scope → schema 'public'", () => {
    expect(getTenantSchema()).toBe("public");
  });

  it("runWithTenant: bên trong thấy schema, ra ngoài về public (nested store không rò rỉ)", async () => {
    const seen = await runWithTenant("shopa", async () => {
      expect(getTenantSchema()).toBe("shopa");
      await Promise.resolve(); // ALS phải giữ context xuyên qua await
      return getTenantSchema();
    });
    expect(seen).toBe("shopa");
    expect(getTenantSchema()).toBe("public");
  });

  it("runWithTenant lồng: inner wins, thoát inner về lại outer", async () => {
    await runWithTenant("outer", async () => {
      expect(getTenantSchema()).toBe("outer");
      await runWithTenant("inner", async () => {
        expect(getTenantSchema()).toBe("inner");
      });
      expect(getTenantSchema()).toBe("outer");
    });
    expect(getTenantSchema()).toBe("public");
  });

  it("runWithTenant song song: 2 nhánh Promise không đọc nhầm schema của nhau", async () => {
    const [a, b] = await Promise.all([
      runWithTenant("sa", async () => {
        await new Promise((r) => setTimeout(r, 5));
        return getTenantSchema();
      }),
      runWithTenant("sb", async () => {
        await new Promise((r) => setTimeout(r, 1));
        return getTenantSchema();
      }),
    ]);
    expect(a).toBe("sa");
    expect(b).toBe("sb");
  });

  it("enterTenantScope: đổi ngay tại frame gọi, awaiter thấy schema mới", async () => {
    enterTenantScope("direct");
    expect(getTenantSchema()).toBe("direct");
    await Promise.resolve();
    expect(getTenantSchema()).toBe("direct");
  });
});
