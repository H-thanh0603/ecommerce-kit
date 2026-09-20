import Link from "next/link";
import { siteConfig } from "@/config/site";
import { moduleCatalog } from "@/lib/modules";

export default function AdminSettings() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-primary">Cài đặt khung</h1>
        <Link href="/admin" className="text-sm text-muted">
          ← Dashboard
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted">
        Đổi thật trong <code>src/config/site.ts</code>. Theme hex ở đây được bơm vào CSS variables.
      </p>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-medium">Thương hiệu</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>Tên: {siteConfig.brand.name}</div>
          <div>Hotline: {siteConfig.brand.hotline}</div>
          <div>Email: {siteConfig.brand.email}</div>
          <div>Địa chỉ: {siteConfig.brand.address}</div>
        </dl>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-medium">Module</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {moduleCatalog.map((m) => {
            const on =
              "included" in m && m.included
                ? true
                : "flag" in m
                  ? Boolean(siteConfig.features[m.flag as keyof typeof siteConfig.features])
                  : false;
            return (
              <li key={m.id} className="flex items-center justify-between border-b border-line py-2 last:border-0">
                <span>{m.name}</span>
                <span className={on ? "text-primary" : "text-muted"}>{on ? "Bật" : "Tắt"}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
