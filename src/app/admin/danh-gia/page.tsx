"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { btnDanger, btnPrimary } from "@/components/admin/buttons";

type Pending = {
  id: string;
  productId: string;
  author: string;
  rating: number;
  content: string;
  createdAt: string;
  product: { name: string; slug: string };
};

export default function AdminReviews() {
  const [rows, setRows] = useState<Pending[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/admin/reviews").then((x) => x.json());
    setRows(r.reviews || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function act(id: string, action: "approve" | "delete") {
    await fetch("/api/admin/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    setMsg(action === "approve" ? "Đã duyệt" : "Đã xóa");
    load();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-primary">Duyệt đánh giá {rows.length > 0 && `(${rows.length})`}</h1>
        <Link href="/admin" className="text-sm text-muted">
          ← Tổng quan
        </Link>
      </div>
      {msg && <p className="mt-2 text-sm text-primary">{msg}</p>}
      <div className="mt-6 space-y-3">
        {rows.map((r) => (
          <article key={r.id} className="rounded-2xl border border-line bg-white p-4 text-sm">
            <p className="font-medium">
              {r.product.name} · {r.rating}/5 · {r.author}
            </p>
            <p className="mt-1 text-muted">{r.content}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => act(r.id, "approve")} className={btnPrimary}>
                Duyệt
              </button>
              <button type="button" onClick={() => act(r.id, "delete")} className={btnDanger}>
                Xóa
              </button>
            </div>
          </article>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted">Không có đánh giá chờ duyệt.</p>}
      </div>
    </div>
  );
}
