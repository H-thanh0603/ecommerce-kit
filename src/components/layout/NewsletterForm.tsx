"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    try {
      const email = String(new FormData(e.currentTarget).get("email") || "");
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMsg(data.message || (res.ok ? "Đã đăng ký" : "Lỗi"));
      if (res.ok) e.currentTarget.reset();
    } catch {
      setMsg("Lỗi mạng — thử lại sau");
    } finally {
      setPending(false);
    }
  };
  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="Email của bạn"
          aria-label="Email đăng ký nhận thư"
          className="flex-1 rounded-full bg-white px-4 py-2.5 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-accent"
        />
        <button disabled={pending} className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">
          {pending ? "…" : "Đăng ký"}
        </button>
      </div>
      <p role="status" aria-live="polite" className="min-h-4 text-xs text-white/80">
        {msg}
      </p>
      <a
        href="/chinh-sach#privacy"
        className="text-[10px] text-white/60 underline hover:text-white/90"
      >
        Chính sách · Huỷ đăng ký (liên hệ hoặc gửi DELETE /api/newsletter)
      </a>
    </form>
  );
}
