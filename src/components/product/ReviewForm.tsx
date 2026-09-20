"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

export function ReviewForm({ productId }: { productId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [msg, setMsg] = useState("");
  if (!user) {
    return (
      <p className="mt-4 text-sm text-muted">
        <Link href="/dang-nhap" className="underline">Đăng nhập</Link> để viết đánh giá.
      </p>
    );
  }
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        rating: Number(form.get("rating")),
        content: form.get("content"),
      }),
    });
    const data = await res.json();
    setMsg(res.ok ? "Đã gửi đánh giá" : data.message || "Lỗi");
    if (res.ok) {
      e.currentTarget.reset();
      router.refresh();
    }
  };
  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-2 rounded-2xl border border-line bg-white p-4">
      <p className="text-sm font-medium">Viết đánh giá</p>
      <select name="rating" className="rounded-xl border border-line px-3 py-2 text-sm" defaultValue="5">
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>{n} sao</option>
        ))}
      </select>
      <textarea required name="content" rows={3} placeholder="Cảm nhận của bạn" className="w-full rounded-xl border border-line px-3 py-2 text-sm" />
      <button className="rounded-full bg-primary px-4 py-2 text-sm text-white">Gửi</button>
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </form>
  );
}
