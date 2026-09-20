"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category } from "@/types";

export function ProductEditor({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    });
    const data = await res.json();
    setMsg(res.ok ? "Đã thêm sản phẩm" : data.message || "Lỗi");
    if (res.ok) {
      e.currentTarget.reset();
      router.refresh();
    }
  };

  return (
    <div className="mt-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-primary px-4 py-2 text-sm text-white"
      >
        {open ? "Đóng form" : "Thêm sản phẩm"}
      </button>
      {open && (
        <form onSubmit={onSubmit} className="mt-4 grid gap-3 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2">
          <input required name="name" placeholder="Tên" className="rounded-xl border border-line px-3 py-2 text-sm" />
          <input required name="slug" placeholder="slug-khong-dau" className="rounded-xl border border-line px-3 py-2 text-sm" />
          <input name="subtitle" placeholder="Phụ đề" className="rounded-xl border border-line px-3 py-2 text-sm sm:col-span-2" />
          <input required name="price" type="number" placeholder="Giá (VND)" className="rounded-xl border border-line px-3 py-2 text-sm" />
          <input required name="stock" type="number" placeholder="Tồn" className="rounded-xl border border-line px-3 py-2 text-sm" />
          <select name="categorySlug" className="rounded-xl border border-line px-3 py-2 text-sm">
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <input name="tags" placeholder="tag1, tag2" className="rounded-xl border border-line px-3 py-2 text-sm" />
          <textarea
            name="images"
            rows={2}
            placeholder="URL ảnh, mỗi dòng một ảnh"
            className="rounded-xl border border-line px-3 py-2 text-sm sm:col-span-2"
          />
          <textarea
            required
            name="description"
            rows={3}
            placeholder="Mô tả"
            className="rounded-xl border border-line px-3 py-2 text-sm sm:col-span-2"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="featured" /> Nổi bật
          </label>
          <button className="rounded-full bg-primary py-2 text-sm text-white">Lưu</button>
          {msg && <p className="text-sm text-muted sm:col-span-2">{msg}</p>}
        </form>
      )}
    </div>
  );
}
