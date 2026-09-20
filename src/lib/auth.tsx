"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { siteConfig } from "@/config/site";
import type { UserSession } from "@/types";

const KEY = "atelier.auth.v1";

type AuthValue = {
  user: UserSession | null;
  login: (email: string, password: string) => { ok: boolean; message: string };
  register: (name: string, email: string, password: string) => { ok: boolean; message: string };
  logout: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw) as UserSession);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (u: UserSession | null) => {
    setUser(u);
    if (u) localStorage.setItem(KEY, JSON.stringify(u));
    else localStorage.removeItem(KEY);
  };

  const value = useMemo<AuthValue>(
    () => ({
      user,
      login: (email, password) => {
        if (email === siteConfig.admin.email && password === siteConfig.admin.password) {
          persist({ name: "Quản trị", email, role: "admin" });
          return { ok: true, message: "Đăng nhập admin thành công" };
        }
        if (password.length >= 4) {
          persist({
            name: email.split("@")[0],
            email,
            role: "customer",
          });
          return { ok: true, message: "Đăng nhập thành công" };
        }
        return { ok: false, message: "Email hoặc mật khẩu chưa đúng" };
      },
      register: (name, email, password) => {
        if (!name || !email || password.length < 4) {
          return { ok: false, message: "Điền đủ thông tin, mật khẩu tối thiểu 4 ký tự" };
        }
        persist({ name, email, role: "customer" });
        return { ok: true, message: "Tạo tài khoản thành công" };
      },
      logout: () => persist(null),
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải nằm trong AuthProvider");
  return ctx;
}
