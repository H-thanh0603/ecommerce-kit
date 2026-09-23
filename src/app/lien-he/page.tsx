"use client";

import { useState } from "react";
import { siteConfig } from "@/config/site";

export default function ContactPage() {
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const form = new FormData(e.currentTarget);
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          message: form.get("message"),
        }),
      });
      setMsg(res.ok ? "Đã gửi. Cửa hàng sẽ liên hệ lại." : "Gửi chưa được, thử lại.");
      if (res.ok) e.currentTarget.reset();
    } catch {
      setMsg("Lỗi mạng — thử lại sau");
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Liên hệ</p>
        <h1 className="mt-2 font-serif text-4xl text-primary">Nói chuyện với cửa hàng</h1>
        <p className="mt-3 text-muted">
          Điền form hoặc nhắn Zalo / gọi hotline. Đội ngũ phản hồi trong giờ làm việc.
        </p>
        <ul className="mt-8 space-y-2 text-sm">
          <li>{siteConfig.brand.address}</li>
          <li>{siteConfig.brand.workingHours}</li>
          <li>{siteConfig.brand.phone} · {siteConfig.brand.hotline}</li>
          <li>{siteConfig.brand.email}</li>
        </ul>
      </div>
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-line bg-white p-6">
        <div>
          <label htmlFor="c-name" className="sr-only">Họ tên</label>
          <input id="c-name" required name="name" autoComplete="name" placeholder="Họ tên" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="c-email" className="sr-only">Email</label>
          <input id="c-email" required type="email" name="email" autoComplete="email" placeholder="Email" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="c-phone" className="sr-only">Số điện thoại</label>
          <input id="c-phone" name="phone" autoComplete="tel" placeholder="Số điện thoại" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="c-msg" className="sr-only">Nội dung</label>
          <textarea id="c-msg" required name="message" rows={5} placeholder="Nội dung" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        </div>
        <button disabled={pending} className="rounded-full bg-primary px-5 py-2.5 text-sm text-white disabled:opacity-60">
          {pending ? "Đang gửi…" : "Gửi tin nhắn"}
        </button>
        <p role="status" aria-live="polite" className="text-sm text-muted">
          {msg}
        </p>
      </form>
    </div>
  );
}
