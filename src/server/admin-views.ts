import { z } from "zod";
import { prisma } from "@/server/db";
import { publicError } from "@/server/errors";

/**
 * Bộ lọc lưu sẵn của admin (pattern Twenty CRM "saved view") — module phụ,
 * không đụng 4 file lõi. Mỗi view = 1 bộ querystring của 1 trang admin, per-user.
 * Filter vẫn nằm 100% trong URL khi bấm view (rule UI-001/UI-011) — view chỉ
 * lưu chuỗi query để bấm là điều hướng, không lọc client-side.
 */

/** Chỉ nhận path trong /admin (bắt đầu "/admin/") — chặn path lạ từ client. */
const adminPath = z
  .string()
  .max(200)
  .regex(/^\/admin\/[a-z0-9\-/]*$/, "Path không hợp lệ");

/** Querystring không có "?": chỉ ký tự an toàn khi ghép vào router.push. */
const safeQuery = z
  .string()
  .max(500)
  .regex(/^[A-Za-z0-9%=&._+\-~]*$/, "Query không hợp lệ");

export const savedViewInput = z.object({
  path: adminPath,
  name: z.string().trim().min(1, "Cần tên view").max(60),
  query: safeQuery,
});

export type SavedView = {
  id: string;
  name: string;
  path: string;
  query: string;
  createdAt: Date;
};

export async function listSavedViews(userId: string, path: string) {
  const safePath = adminPath.parse(path);
  const rows = await prisma.adminSavedView.findMany({
    where: { userId, path: safePath },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return rows.map((r) => ({ id: r.id, name: r.name, path: r.path, query: r.query, createdAt: r.createdAt }));
}

/** Lưu/đổi tên view — trùng (user, path, name) thì ghi đè (P2002 không nổ ra ngoài). */
export async function saveSavedView(userId: string, input: z.infer<typeof savedViewInput>) {
  const data = savedViewInput.parse(input);
  try {
    const existing = await prisma.adminSavedView.findUnique({
      where: { userId_path_name: { userId, path: data.path, name: data.name } },
    });
    if (existing) {
      const updated = await prisma.adminSavedView.update({
        where: { id: existing.id },
        data: { query: data.query },
      });
      return toView(updated);
    }
    const created = await prisma.adminSavedView.create({
      data: { userId, path: data.path, name: data.name, query: data.query },
    });
    return toView(created);
  } catch (e) {
    throw new Error(publicError(e, "Lưu bộ lọc thất bại"));
  }
}

export async function deleteSavedView(userId: string, id: string) {
  // deleteMany với userId trong where: view của người khác không xóa được
  // dù đoán được id (không nổ P2025 khi id không tồn tại — idempotent).
  const res = await prisma.adminSavedView.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw new Error("Không tìm thấy bộ lọc");
  return { ok: true as const };
}

function toView(r: { id: string; name: string; path: string; query: string; createdAt: Date }): SavedView {
  return { id: r.id, name: r.name, path: r.path, query: r.query, createdAt: r.createdAt };
}
