"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const data = new FormData(e.currentTarget);
      const res = await fetch("/api/platform/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(data.get("email") || ""),
          password: String(data.get("password") || ""),
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.message || "Đăng nhập thất bại");
      router.push("/platform");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Lỗi mạng — thử lại sau");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-4xl text-primary">Đăng nhập Platform</h1>
      <p className="mt-2 text-sm text-muted">Khu vực quản trị đa tenant — dành cho super-admin.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-3 rounded-2xl border border-line bg-white p-5">
        <div>
          <label htmlFor="pf-email" className="sr-only">Email</label>
          <input
            id="pf-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            className="w-full rounded-xl border border-line px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="pf-pass" className="sr-only">Mật khẩu</label>
          <input
            id="pf-pass"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Mật khẩu"
            className="w-full rounded-xl border border-line px-3 py-2.5 text-sm"
          />
        </div>
        <button
          disabled={pending}
          className="w-full rounded-full bg-primary py-3 text-sm text-white disabled:opacity-60"
        >
          {pending ? "Đang xử lý…" : "Đăng nhập"}
        </button>
        <p role="status" aria-live="polite" className="text-sm text-muted">
          {message}
        </p>
      </form>
    </div>
  );
}
