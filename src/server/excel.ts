import * as XLSX from "xlsx";
import { getProductBySlug, listProducts, upsertProduct } from "@/server/commerce";

export async function exportProductsXlsx() {
  const { items } = await listProducts({ includeUnpublished: true, pageSize: 48 });
  const rows = items.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle || "",
    description: p.description,
    price: p.price,
    stock: p.stock,
    category: p.category,
    tags: p.tags.join(","),
    unit: p.unit || "cai",
    published: p.published ? 1 : 0,
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "products");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function importProductsXlsx(buf: Buffer) {
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet);
  let n = 0;
  for (const row of rows) {
    if (!row.slug || !row.name) continue;
    const existing = await getProductBySlug(String(row.slug));
    await upsertProduct({
      id: existing?.product.id,
      slug: String(row.slug),
      name: String(row.name),
      subtitle: String(row.subtitle || ""),
      description: String(row.description || row.name),
      price: Number(row.price || 0),
      stock: Number(row.stock || 0),
      categorySlug: String(row.category || ""),
      images: [],
      tags: String(row.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      published: Number(row.published ?? 1) !== 0,
    });
    n += 1;
  }
  return n;
}
