"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { siteConfig } from "@/config/site";

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") || "");
    const password = String(data.get("password") || "");
    const name = String(data.get("name") || "");
    const res = mode === "login" ? await login(email, password) : await register(name, email, password);
    setMessage(res.message);
    if (res.ok) {
      router.push(email === siteConfig.admin.email ? "/admin" : "/tai-khoan");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-4xl text-primary">
        {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        Admin mẫu: {siteConfig.admin.email} (mật khẩu trong HUONG-DAN.md). Khách đăng ký tài khoản mới.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-3 rounded-2xl border border-line bg-white p-5">
        {mode === "register" && (
          <input name="name" required placeholder="Họ tên" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        )}
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        <input name="password" type="password" required placeholder="Mật khẩu" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        <button className="w-full rounded-full bg-primary py-3 text-sm text-white">
          {mode === "login" ? "Đăng nhập" : "Đăng ký"}
        </button>
        {message && <p className="text-sm text-muted">{message}</p>}
      </form>
      <button
        className="mt-4 text-sm text-muted underline"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
      </button>
    </div>
  );
}
