import { prisma } from "@/server/db";
import { lineAmount } from "@/types";

export type BundleLine = { productId: string; skuId?: string; variantLabel?: string; quantity: number };

export function parseBundleLines(raw: string): BundleLine[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function listBundles(activeOnly = true) {
  const rows = await prisma.bundle.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({ ...r, lines: parseBundleLines(r.linesJson) }));
}

export async function getBundle(id: string) {
  const r = await prisma.bundle.findUnique({ where: { id } });
  return r ? { ...r, lines: parseBundleLines(r.linesJson) } : null;
}

export async function upsertBundle(data: {
  id?: string;
  name: string;
  lines: BundleLine[];
  price: number;
  active?: boolean;
}) {
  if (!data.name.trim()) throw new Error("Thiếu tên combo");
  const lines = data.lines.filter((l) => l.productId && l.quantity > 0);
  if (!lines.length) throw new Error("Combo cần ít nhất 1 dòng hàng");
  const ids = [...new Set(lines.map((l) => l.productId))];
  const found = await prisma.product.count({ where: { id: { in: ids }, published: true } });
  if (found !== ids.length) throw new Error("Combo chứa SP không còn bán");
  const payload = {
    name: data.name.trim().slice(0, 120),
    linesJson: JSON.stringify(lines),
    price: Math.max(0, Math.round(data.price)),
    active: data.active ?? true,
  };
  return data.id
    ? prisma.bundle.update({ where: { id: data.id }, data: payload })
    : prisma.bundle.create({ data: payload });
}

export async function deleteBundle(id: string) {
  await prisma.bundle.delete({ where: { id } });
}

export type PricedLine = {
  productId: string;
  skuId?: string;
  price: number;
  quantity: number;
  unit?: string;
};

/**
 * Tính tiền combo từ giỏ: mỗi dòng combo phải được giỏ bao phủ đủ số lượng.
 * Giảm = max(0, tổng giá lẻ DB − giá combo). Throw nếu thiếu hàng/gói tắt.
 */
export async function quoteBundle(
  bundleId: string,
  cart: PricedLine[],
): Promise<{ name: string; discount: number }> {
  const bundle = await getBundle(bundleId);
  if (!bundle || !bundle.active) throw new Error("Combo không tồn tại hoặc đã tắt");
  let sum = 0;
  for (const line of bundle.lines) {
    const covered = cart
      .filter((c) => c.productId === line.productId && (c.skuId || "") === (line.skuId || ""))
      .reduce((s, c) => s + c.quantity, 0);
    if (covered < line.quantity) throw new Error(`Combo "${bundle.name}" thiếu hàng trong giỏ`);
    const priceOf = cart.find(
      (c) => c.productId === line.productId && (c.skuId || "") === (line.skuId || ""),
    )!;
    sum += lineAmount(priceOf.price, line.quantity, priceOf.unit === "kg" ? "kg" : "cai");
  }
  return { name: bundle.name, discount: Math.max(0, sum - bundle.price) };
}
