"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const data = new FormData(e.currentTarget);
      const email = String(data.get("email") || "");
      const password = String(data.get("password") || "");
      const name = String(data.get("name") || "");
      const res =
        mode === "login"
          ? await login(email, password, mfaRequired ? mfaCode : undefined)
          : await register(name, email, password);
      setMessage(res.message);
      if (res.ok) {
        // Admin đi thẳng /admin — phát hiện theo session trả về, không lộ email trên UI.
        if (res.user?.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/tai-khoan");
        }
      } else if ("mfaRequired" in res && res.mfaRequired) {
        setMfaRequired(true);
      }
    } catch {
      setMessage("Lỗi mạng — thử lại sau");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-4xl text-primary">
        {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
      </h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-3 rounded-2xl border border-line bg-white p-5">
        {mode === "register" && (
          <div>
            <label htmlFor="lg-name" className="sr-only">Họ tên</label>
            <input id="lg-name" name="name" required autoComplete="name" placeholder="Họ tên" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
          </div>
        )}
        <div>
          <label htmlFor="lg-email" className="sr-only">Email</label>
          <input id="lg-email" name="email" type="email" required autoComplete="email" placeholder="Email" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="lg-pass" className="sr-only">Mật khẩu</label>
          <input id="lg-pass" name="password" type="password" required autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Mật khẩu" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        </div>
        {mfaRequired && (
          <div>
            <label htmlFor="lg-mfa" className="sr-only">Mã TOTP hoặc recovery</label>
            <input
              id="lg-mfa"
              name="mfaCode"
              required
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              autoComplete="one-time-code"
              placeholder="Mã 2 lớp (TOTP / recovery)"
              className="w-full rounded-xl border border-line px-3 py-2.5 text-sm"
            />
          </div>
        )}
        <button disabled={pending} className="w-full rounded-full bg-primary py-3 text-sm text-white disabled:opacity-60">
          {pending ? "Đang xử lý…" : mode === "login" ? "Đăng nhập" : "Đăng ký"}
        </button>
        <p role="status" aria-live="polite" className="text-sm text-muted">
          {message}
        </p>
      </form>
      <button
        className="mt-4 text-sm text-muted underline"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
      </button>
      {mode === "login" && (
        <Link href="/quen-mat-khau" className="mt-3 block text-sm text-muted underline">
          Quên mật khẩu
        </Link>
      )}
    </div>
  );
}
