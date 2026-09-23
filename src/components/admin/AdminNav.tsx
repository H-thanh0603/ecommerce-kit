"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isEnabled, siteConfig } from "@/config/site";

const links = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/don-hang", label: "Đơn hàng" },
  { href: "/admin/san-pham", label: "Sản phẩm" },
  { href: "/admin/danh-muc", label: "Danh mục" },
  { href: "/admin/khach-hang", label: "Khách hàng" },
  { href: "/admin/ma-giam", label: "Mã giảm" },
  { href: "/admin/lien-he", label: "Hộp thư" },
  { href: "/admin/dat-lich", label: "Đặt lịch", flag: "booking" as const },
  { href: "/admin/kho", label: "Kho", flag: "multiWarehouse" as const },
  { href: "/admin/hoa-don", label: "Hóa đơn", flag: "invoices" as const },
  { href: "/admin/ai", label: "AI Agent", flag: "aiAgent" as const },
  { href: "/admin/mfa", label: "MFA", flag: "mfa" as const },
  { href: "/admin/cai-dat", label: "Cài đặt" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-white">
      <div className="border-b border-line px-4 py-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-accent">Admin</p>
        <p className="font-serif text-xl text-primary">{siteConfig.brand.name}</p>
      </div>
      <nav className="flex-1 space-y-0.5 p-3 text-sm">
        {links.map((l) => {
          if (l.flag && !isEnabled(l.flag)) return null;
          const on = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`block rounded-xl px-3 py-2 ${on ? "bg-primary text-white" : "hover:bg-canvas"}`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line p-3 text-sm">
        <Link href="/" className="text-muted hover:text-primary">
          ← Xem cửa hàng
        </Link>
      </div>
    </aside>
  );
}
