import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Mock cookie jar của next/headers — cùng pattern auth.test.ts.
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined),
    set: (k: string, v: string) => {
      jar.set(k, v);
    },
    delete: (k: string) => {
      jar.delete(k);
    },
  }),
  headers: async () => new Headers({}),
}));

import { prisma } from "./db";
import { createStaff, loginUser, requireAdmin, requireStaff } from "./auth";
import { canAccessAdminArea, staffLanding } from "@/lib/admin-permissions";

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

beforeEach(() => {
  jar.clear();
});

describe("ma trận quyền admin", () => {
  it("admin toàn quyền; customer không vào đâu", () => {
    for (const href of ["/admin", "/admin/don-hang", "/admin/kho", "/admin/cai-dat", "/admin/nhan-vien"]) {
      expect(canAccessAdminArea("admin", href)).toBe(true);
      expect(canAccessAdminArea("customer", href)).toBe(false);
    }
  });

  it("kho: kho/sản phẩm/đơn được, mã giảm + tổng quan bị chặn", () => {
    expect(canAccessAdminArea("kho", "/admin/kho")).toBe(true);
    expect(canAccessAdminArea("kho", "/admin/don-hang")).toBe(true);
    expect(canAccessAdminArea("kho", "/admin/don-hang?status=pending")).toBe(true);
    expect(canAccessAdminArea("kho", "/admin/ma-giam")).toBe(false);
    expect(canAccessAdminArea("kho", "/admin")).toBe(false);
    expect(staffLanding("kho")).toBe("/admin/don-hang");
  });

  it("cskh + marketing: đúng nhóm trang của vai", () => {
    expect(canAccessAdminArea("cskh", "/admin/hoan-tien")).toBe(true);
    expect(canAccessAdminArea("cskh", "/admin/kho")).toBe(false);
    expect(canAccessAdminArea("marketing", "/admin/ma-giam")).toBe(true);
    expect(canAccessAdminArea("marketing", "/admin/nhan-vien")).toBe(false);
    // path tương tự nhưng module khác — không nhầm tiền tố
    expect(canAccessAdminArea("marketing", "/admin/ma-giam-khac")).toBe(false);
  });
});

describe("requireStaff + createStaff role", () => {
  const email = `nv${uid()}@kit.vn`.replace(/-/g, "");

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
  });

  it("role lạ → ném lỗi, không âm thầm nâng thành admin", async () => {
    await expect(createStaff({ name: "NV", email, password: "matkhau123", role: "superadmin" })).rejects.toThrow(
      "Vai không hợp lệ",
    );
  });

  it("nhân viên kho: vào được /admin qua requireStaff, API ngoài vai bị chặn, requireAdmin = null", async () => {
    await createStaff({ name: "NV Kho", email, password: "matkhau123", role: "kho" });
    const login = await loginUser(email, "matkhau123");
    if (!login.ok) throw new Error("login thất bại");
    expect(login.user.role).toBe("kho");

    expect(await requireStaff("/admin/kho")).not.toBeNull();
    expect(await requireStaff("/admin/ma-giam")).toBeNull();
    expect(await requireStaff()).not.toBeNull(); // khu vực chung (mfa, palette)
    expect(await requireAdmin()).toBeNull(); // KPI/toàn quyền vẫn chỉ dành cho admin
  });
});
