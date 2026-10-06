"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category, Product } from "@/types";
import { btnPrimary } from "@/components/admin/buttons";

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
  // Gallery ảnh: dòng đầu là ảnh chính. Reset theo editId bằng pattern
  // "adjust state during render" (React docs) — không dùng effect.
  const [images, setImages] = useState<{ url: string; alt: string }[]>(() =>
    editing ? (editing.images || []).map((url, i) => ({ url, alt: editing.imageAlts?.[i] || "" })) : [],
  );
  const [prevEditId, setPrevEditId] = useState(editId);
  if (prevEditId !== editId) {
    setPrevEditId(editId);
    setImages(
      editing
        ? (editing.images || []).map((url, i) => ({ url, alt: editing.imageAlts?.[i] || "" }))
        : [],
    );
  }

  const setImage = (idx: number, patch: Partial<{ url: string; alt: string }>) =>
    setImages((cur) => cur.map((im, i) => (i === idx ? { ...im, ...patch } : im)));
  const moveImage = (idx: number, dir: -1 | 1) =>
    setImages((cur) => {
      const to = idx + dir;
      if (to < 0 || to >= cur.length) return cur;
      const next = [...cur];
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });
  const removeImage = (idx: number) => setImages((cur) => cur.filter((_, i) => i !== idx));

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
      images: images.map((im) => im.url.trim()).filter(Boolean),
      imageAlts: images.map((im) => im.alt.trim().slice(0, 200)),
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
        <button type="button" onClick={() => { setOpen((v) => !v); setEditId(""); }} className={btnPrimary}>
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
          <div className="grid gap-2 text-sm sm:col-span-2">
            <span>
              Ảnh — dòng đầu là <strong>ảnh chính</strong>, mỗi ảnh nên có alt text (SEO + người khiếm thị)
            </span>
            {images.map((im, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-canvas px-3 py-2">
                <span title="Ảnh chính" aria-label={i === 0 ? "Ảnh chính" : `Ảnh ${i + 1}`} className="w-6 text-center">
                  {i === 0 ? "★" : i + 1}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element -- preview ảnh admin */}
                <img src={im.url} alt={im.alt || "Ảnh sản phẩm"} className="h-10 w-10 rounded object-cover" />
                <input
                  value={im.url}
                  onChange={(e) => setImage(i, { url: e.target.value })}
                  placeholder="URL ảnh"
                  aria-label={`URL ảnh ${i + 1}`}
                  className="min-w-40 flex-1 rounded-lg border border-line bg-white px-2 py-1.5"
                />
                <input
                  value={im.alt}
                  onChange={(e) => setImage(i, { alt: e.target.value })}
                  placeholder="Mô tả ảnh (alt)"
                  aria-label={`Alt text ảnh ${i + 1}`}
                  className="min-w-40 flex-1 rounded-lg border border-line bg-white px-2 py-1.5"
                />
                <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label="Chuyển ảnh lên" className="px-1 disabled:opacity-30">
                  ↑
                </button>
                <button type="button" onClick={() => moveImage(i, 1)} disabled={i === images.length - 1} aria-label="Chuyển ảnh xuống" className="px-1 disabled:opacity-30">
                  ↓
                </button>
                <button type="button" onClick={() => removeImage(i)} aria-label="Xóa ảnh" className="px-1 text-accent">
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="w-fit rounded-full border border-line px-3 py-1.5 text-xs hover:border-primary"
              onClick={() => setImages((cur) => [...cur, { url: "", alt: "" }])}
            >
              + Thêm ảnh
            </button>
          </div>
          <label className="grid gap-1 text-sm sm:col-span-2">
            Tải ảnh lên
          <input
            type="file"
            accept="image/*"
            className="text-sm"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setMsg("Đang tải ảnh…");
              const url = await upload(file);
              if (!url) return setMsg("Upload thất bại");
              setImages((cur) => [...cur, { url, alt: "" }]);
              setMsg("Đã thêm ảnh");
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
          <button className={`${btnPrimary} sm:col-span-2`}>Lưu sản phẩm</button>
          {msg && <p role="status" className="text-sm text-muted sm:col-span-2">{msg}</p>}
        </form>
      )}
    </div>
  );
}
