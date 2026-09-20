"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category, Product } from "@/types";

export function ProductEditor({
  categories,
  products,
}: {
  categories: Category[];
  products: Product[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string>("");
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
      featured: form.get("featured") === "on",
      flashSale: form.get("flashSale") === "on",
      published: form.get("published") !== "off",
    };
    const url = editId ? `/api/products/${editId}` : "/api/products";
    const res = await fetch(url, {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setMsg(res.ok ? "Đã lưu" : data.message || "Lỗi");
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
      {open && (
        <form key={editId || "new"} onSubmit={onSubmit} className="mt-4 grid gap-3 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2">
          <input required name="name" defaultValue={editing?.name} placeholder="Tên" className="rounded-xl border border-line px-3 py-2 text-sm" />
          <input required name="slug" defaultValue={editing?.slug} placeholder="slug-khong-dau" className="rounded-xl border border-line px-3 py-2 text-sm" />
          <input name="subtitle" defaultValue={editing?.subtitle} placeholder="Phụ đề" className="rounded-xl border border-line px-3 py-2 text-sm sm:col-span-2" />
          <input required name="price" type="number" defaultValue={editing?.price} placeholder="Giá" className="rounded-xl border border-line px-3 py-2 text-sm" />
          <input required name="stock" type="number" defaultValue={editing?.stock} placeholder="Tồn" className="rounded-xl border border-line px-3 py-2 text-sm" />
          <select name="categorySlug" defaultValue={editing?.category} className="rounded-xl border border-line px-3 py-2 text-sm">
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
          <input name="tags" defaultValue={editing?.tags.join(", ")} placeholder="tag1, tag2" className="rounded-xl border border-line px-3 py-2 text-sm" />
          <textarea
            name="images"
            rows={2}
            defaultValue={editing?.images.join("\n")}
            placeholder="URL ảnh, mỗi dòng một ảnh — hoặc upload"
            className="rounded-xl border border-line px-3 py-2 text-sm sm:col-span-2"
            id="images-field"
          />
          <input
            type="file"
            accept="image/*"
            className="text-sm sm:col-span-2"
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
          <textarea required name="description" rows={3} defaultValue={editing?.description} placeholder="Mô tả" className="rounded-xl border border-line px-3 py-2 text-sm sm:col-span-2" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={editing?.featured} /> Nổi bật</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="flashSale" defaultChecked={editing?.flashSale} /> Flash sale</label>
          <button className="rounded-full bg-primary py-2 text-sm text-white sm:col-span-2">Lưu</button>
          {msg && <p className="text-sm text-muted sm:col-span-2">{msg}</p>}
        </form>
      )}
    </div>
  );
}
