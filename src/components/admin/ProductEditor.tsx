"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category, Product } from "@/types";

/** "Tên: giá trị" mỗi dòng → object thuộc tính. */
export function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const i = line.indexOf(":");
    if (i <= 0) continue;
    const k = line.slice(0, i).trim().slice(0, 60);
    const v = line.slice(i + 1).trim().slice(0, 200);
    if (k && v) out[k] = v;
  }
  return out;
}

export function ProductEditor({
  categories,
  products,
  initialEditId,
}: {
  categories: Category[];
  products: Product[];
  initialEditId?: string;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(Boolean(initialEditId));
  const [editId, setEditId] = useState<string>(initialEditId || "");
  const editing = products.find((p) => p.id === editId);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      slug: String(form.get("slug") || "")
        .toLowerCase()
        .replace(/\s+/g, "-"),
      subtitle: form.get("subtitle"),
      description: form.get("description"),
      price: Number(form.get("price")),
      stock: Number(form.get("stock")),
      categorySlug: form.get("categorySlug"),
      images: String(form.get("images") || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      tags: String(form.get("tags") || ""),
      attrs: parseAttrs(String(form.get("attrsText") || "")),
      featured: form.get("featured") === "on",
      flashSale: form.get("flashSale") === "on",
      published: form.get("published") === "on",
    };
    if (editId && !editing) {
      setMsg("Không thấy sản phẩm này trên trang. Không lưu form trống.");
      return;
    }
    const url = editId ? `/api/products/${editId}` : "/api/products";
    const res = await fetch(url, {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    const shown = payload.published ? "đang hiện" : "đang ẩn";
    setMsg(res.ok ? `Đã lưu «${payload.name}», ${shown}` : data.message || "Lỗi");
    if (res.ok) router.refresh();
  };

  const upload = async (file: File) => {
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    return data.url as string | undefined;
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setOpen((v) => !v); setEditId(""); }} className="rounded-full bg-primary px-4 py-2 text-sm text-white">
          {open && !editId ? "Đóng" : "Thêm sản phẩm"}
        </button>
        <select
          className="rounded-full border border-line bg-white px-3 py-2 text-sm"
          value={editId}
          onChange={(e) => {
            setEditId(e.target.value);
            setOpen(Boolean(e.target.value));
          }}
        >
          <option value="">Sửa sản phẩm…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {open && editId && !editing && (
        <p className="mt-4 text-sm text-accent">Không thấy sản phẩm này. Chọn lại trong danh sách.</p>
      )}
      {open && (!editId || editing) && (
        <form key={editId || "new"} onSubmit={onSubmit} className="mt-4 grid gap-3 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">Tên<input required name="name" defaultValue={editing?.name} className="rounded-xl border border-line px-3 py-2" /></label>
          <label className="grid gap-1 text-sm">Đường dẫn<input required name="slug" defaultValue={editing?.slug} placeholder="ao-linen-xanh" className="rounded-xl border border-line px-3 py-2" /></label>
          <label className="grid gap-1 text-sm sm:col-span-2">Phụ đề<input name="subtitle" defaultValue={editing?.subtitle} className="rounded-xl border border-line px-3 py-2" /></label>
          <label className="grid gap-1 text-sm">Giá (đ)<input required name="price" type="number" defaultValue={editing?.price} className="rounded-xl border border-line px-3 py-2" /></label>
          <label className="grid gap-1 text-sm">Tồn<input required name="stock" type="number" defaultValue={editing?.stock} className="rounded-xl border border-line px-3 py-2" /></label>
          <label className="grid gap-1 text-sm">
            Danh mục
            <select name="categorySlug" defaultValue={editing?.category} className="rounded-xl border border-line px-3 py-2">
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Thẻ, cách nhau bởi dấu phẩy<input name="tags" defaultValue={editing?.tags.join(", ")} className="rounded-xl border border-line px-3 py-2" /></label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            Ảnh, mỗi dòng một URL
            <textarea
              name="images"
              rows={2}
              defaultValue={editing?.images.join("\n")}
              className="rounded-xl border border-line px-3 py-2"
              id="images-field"
            />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            Tải ảnh lên
          <input
            type="file"
            accept="image/*"
            className="text-sm"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = await upload(file);
              if (!url) return setMsg("Upload thất bại");
              const area = document.getElementById("images-field") as HTMLTextAreaElement | null;
              if (area) area.value = area.value ? `${area.value}\n${url}` : url;
              setMsg("Đã thêm ảnh " + url);
            }}
          />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">Mô tả<textarea required name="description" rows={3} defaultValue={editing?.description} className="rounded-xl border border-line px-3 py-2" /></label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            Thuộc tính, mỗi dòng «Tên: giá trị»
            <textarea
              name="attrsText"
              rows={2}
              defaultValue={editing?.attrs ? Object.entries(editing.attrs).map(([k, v]) => `${k}: ${v}`).join("\n") : ""}
              placeholder="Chất liệu: cotton 100%"
              className="rounded-xl border border-line px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={editing?.featured} /> Nổi bật</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="flashSale" defaultChecked={editing?.flashSale} /> Flash sale</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={editing ? editing.published !== false : true} /> Đang hiện trên cửa hàng</label>
          <button className="rounded-full bg-primary py-2 text-sm text-white sm:col-span-2">Lưu</button>
          {msg && <p role="status" className="text-sm text-muted sm:col-span-2">{msg}</p>}
        </form>
      )}
    </div>
  );
}
