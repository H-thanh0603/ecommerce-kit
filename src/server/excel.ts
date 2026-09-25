import { getProductBySlug, listProducts, upsertProduct } from "@/server/commerce";

// exceljs — thay xlsx (CVE) — admin-only route đã requireAdmin + size limit.
async function excel() {
  return import("exceljs");
}

export async function exportProductsXlsx() {
  const ExcelJS = await excel();
  const { items } = await listProducts({ includeUnpublished: true, pageSize: 48 });
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("products");
  sheet.columns = [
    { header: "id", key: "id" },
    { header: "slug", key: "slug" },
    { header: "name", key: "name" },
    { header: "subtitle", key: "subtitle" },
    { header: "description", key: "description" },
    { header: "price", key: "price" },
    { header: "stock", key: "stock" },
    { header: "category", key: "category" },
    { header: "tags", key: "tags" },
    { header: "unit", key: "unit" },
    { header: "published", key: "published" },
  ];
  for (const p of items) {
    sheet.addRow({
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
    });
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function importProductsXlsx(buf: Buffer) {
  const ExcelJS = await excel();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const sheet = wb.worksheets[0];
  if (!sheet) return 0;
  const headerRow = sheet.getRow(1);
  const headers = headerRow.values as (string | undefined)[];
  const colOf = (name: string) => headers.findIndex((h) => h === name);
  const idx = {
    slug: colOf("slug"),
    name: colOf("name"),
    subtitle: colOf("subtitle"),
    description: colOf("description"),
    price: colOf("price"),
    stock: colOf("stock"),
    category: colOf("category"),
    tags: colOf("tags"),
    published: colOf("published"),
  };
  if (idx.slug < 0 || idx.name < 0) return 0;
  let n = 0;
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const get = (i: number) => (i >= 0 ? row.getCell(i + 1).value : null);
    const slug = String(get(idx.slug) ?? "").trim();
    const name = String(get(idx.name) ?? "").trim();
    if (!slug || !name) continue;
    const existing = await getProductBySlug(slug);
    await upsertProduct({
      id: existing?.product.id,
      slug,
      name,
      subtitle: String(get(idx.subtitle) ?? ""),
      description: String(get(idx.description) ?? name),
      price: Number(get(idx.price) ?? 0),
      stock: Number(get(idx.stock) ?? 0),
      categorySlug: String(get(idx.category) ?? ""),
      images: [],
      tags: String(get(idx.tags) ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      published: Number(get(idx.published) ?? 1) !== 0,
    });
    n += 1;
  }
  return n;
}
