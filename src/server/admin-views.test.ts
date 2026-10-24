import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteSavedView, listSavedViews, saveSavedView, savedViewInput } from "./admin-views";
import { runWithTenant } from "./tenant-context";
import { ensureSchema, dropSchema } from "./test-schema";
import { prisma } from "./db";

const SLUG = `views_${Date.now()}`;
const SLUG_B = `viewsb_${Date.now()}`;
const stamp = Date.now();

let userA = "";
let userB = "";

async function seed() {
  const [a, b] = await Promise.all([
    prisma.user.create({ data: { email: `a${stamp}@test.vn`, name: "Admin A", passwordHash: "x", role: "admin" } }),
    prisma.user.create({ data: { email: `b${stamp}@test.vn`, name: "Admin B", passwordHash: "x", role: "admin" } }),
  ]);
  userA = a.id;
  userB = b.id;
}

beforeAll(async () => {
  await ensureSchema(SLUG);
  await ensureSchema(SLUG_B);
  await runWithTenant(SLUG, seed);
}, 180_000);

afterAll(async () => {
  await dropSchema(SLUG);
  await dropSchema(SLUG_B);
}, 60_000);

describe("savedViewInput", () => {
  it("chặn path ngoài /admin và query có ký tự lạ", () => {
    expect(savedViewInput.safeParse({ path: "/api/admin", name: "x", query: "" }).success).toBe(false);
    expect(savedViewInput.safeParse({ path: "/admin/don-hang", name: "x", query: "q=<script>" }).success).toBe(false);
    expect(savedViewInput.safeParse({ path: "/admin/don-hang", name: "Đơn chờ", query: "status=pending&page=2" }).success).toBe(true);
  });
});

describe("saved views per-user", () => {
  it("lưu → list → trùng tên ghi đè query", async () => {
    await runWithTenant(SLUG, () =>
      saveSavedView(userA, { path: "/admin/don-hang", name: "Đơn chờ", query: "status=pending" }),
    );
    await runWithTenant(SLUG, () =>
      saveSavedView(userA, { path: "/admin/don-hang", name: "Đơn chờ", query: "status=pending&page=2" }),
    );
    const views = await runWithTenant(SLUG, () => listSavedViews(userA, "/admin/don-hang"));
    expect(views).toHaveLength(1);
    expect(views[0].query).toBe("status=pending&page=2");
  });

  it("view của A không thấy bởi B; B không xóa được view của A", async () => {
    const created = await runWithTenant(SLUG, () =>
      saveSavedView(userA, { path: "/admin/khach-hang", name: "Khách Vàng", query: "" }),
    );
    const viewsB = await runWithTenant(SLUG, () => listSavedViews(userB, "/admin/khach-hang"));
    expect(viewsB).toHaveLength(0);

    await expect(runWithTenant(SLUG, () => deleteSavedView(userB, created.id))).rejects.toThrow(
      "Không tìm thấy bộ lọc",
    );
    // A tự xóa view của A thì OK (idempotent khi lặp lại).
    await expect(runWithTenant(SLUG, () => deleteSavedView(userA, created.id))).resolves.toEqual({ ok: true });
    await expect(runWithTenant(SLUG, () => deleteSavedView(userA, created.id))).rejects.toThrow(
      "Không tìm thấy bộ lọc",
    );
  });

  it("isolation tenant: view của tenant A không thấy/xóa được từ tenant B", async () => {
    const created = await runWithTenant(SLUG, () =>
      saveSavedView(userA, { path: "/admin/don-hang", name: "View Tenant A", query: "status=confirmed" }),
    );
    const viewsB = await runWithTenant(SLUG_B, () => listSavedViews(userA, "/admin/don-hang"));
    expect(viewsB).toHaveLength(0);
    await expect(runWithTenant(SLUG_B, () => deleteSavedView(userA, created.id))).rejects.toThrow(
      "Không tìm thấy bộ lọc",
    );
  });

  it("list lọc đúng theo path", async () => {
    await runWithTenant(SLUG, () =>
      saveSavedView(userA, { path: "/admin/don-hang", name: "Hôm nay", query: "status=shipping" }),
    );
    const donHang = await runWithTenant(SLUG, () => listSavedViews(userA, "/admin/don-hang"));
    const khach = await runWithTenant(SLUG, () => listSavedViews(userA, "/admin/khach-hang"));
    expect(donHang.some((v) => v.name === "Hôm nay")).toBe(true);
    expect(khach).toHaveLength(0);
  });
});
