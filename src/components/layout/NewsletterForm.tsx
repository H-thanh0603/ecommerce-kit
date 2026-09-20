"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [msg, setMsg] = useState("");
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") || "");
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setMsg(data.message || (res.ok ? "Đã đăng ký" : "Lỗi"));
    if (res.ok) e.currentTarget.reset();
  };
  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md gap-2">
      <input
        type="email"
        name="email"
        required
        placeholder="Email của bạn"
        className="flex-1 rounded-full bg-white px-4 py-2.5 text-sm text-ink outline-none"
      />
      <button className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white">Đăng ký</button>
      {msg && <span className="sr-only">{msg}</span>}
    </form>
  );
}
