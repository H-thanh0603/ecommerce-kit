"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { UserSession } from "@/types";

type AuthResult = {
  ok: boolean;
  message: string;
  user?: UserSession | null;
  mfaRequired?: boolean;
};

type AuthValue = {
  user: UserSession | null;
  ready: boolean;
  login: (email: string, password: string, mfaCode?: string) => Promise<AuthResult>;
  register: (name: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,
      login: async (email, password, mfaCode) => {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, ...(mfaCode ? { mfaCode } : {}) }),
        });
        const data = await res.json();
        if (data.ok) setUser(data.user);
        return {
          ok: Boolean(data.ok),
          message: data.message || "",
          user: data.user ?? null,
          mfaRequired: Boolean(data.mfaRequired),
        };
      },
      register: async (name, email, password) => {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (data.ok) setUser(data.user);
        return { ok: Boolean(data.ok), message: data.message || "", user: data.user ?? null };
      },
      logout: async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        setUser(null);
      },
    }),
    [user, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải nằm trong AuthProvider");
  return ctx;
}
