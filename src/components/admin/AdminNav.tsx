"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { isEnabled, siteConfig } from "@/config/site";
import { adminNavGroups, type AdminNavItem } from "@/lib/admin-nav";

const groups = adminNavGroups;

function visible(items: AdminNavItem[]) {
  return items.filter((l) => !l.flag || isEnabled(l.flag));
}

export function AdminNav() {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/dang-nhap");
    router.refresh();
  };

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-line bg-white print:hidden md:w-56 md:border-r md:border-b-0">
      <div className="flex items-center justify-between border-b border-line px-4 py-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-accent">Admin</p>
          <p className="font-serif text-xl text-primary">{siteConfig.brand.name}</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-line px-3 py-1 text-sm md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Đóng" : "Menu"}
        </button>
      </div>
      <nav className={`${open ? "block" : "hidden"} flex-1 space-y-3 p-3 text-sm md:block`}>
        {groups.map((g) => {
          const items = visible(g.items);
          if (items.length === 0) return null;
          return (
            <div key={g.title}>
              <p className="px-3 pb-1 text-[10px] uppercase tracking-[0.16em] text-muted">{g.title}</p>
              <div className="space-y-0.5">
                {items.map((l) => {
                  const on = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className={`block rounded-xl px-3 py-2 ${on ? "bg-primary text-white" : "hover:bg-canvas"}`}
                    >
                      {l.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className={`${open ? "flex" : "hidden"} flex-col gap-2 border-t border-line p-3 text-sm md:flex`}>
        <Link href="/" className="text-muted hover:text-primary">
          ← Xem cửa hàng
        </Link>
        <button type="button" onClick={logout} disabled={busy} className="text-left text-muted hover:text-primary disabled:opacity-50">
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
