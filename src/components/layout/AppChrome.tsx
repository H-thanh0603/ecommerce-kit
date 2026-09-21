"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChatWidget } from "@/components/ai/ChatWidget";
import type { EffectiveSite } from "@/config/site";
import type { Category } from "@/types";

export function AppChrome({
  categories,
  brand,
  shippingEta,
  children,
}: {
  categories: Category[];
  brand?: EffectiveSite["brand"];
  shippingEta?: string;
  children: React.ReactNode;
}) {
  const path = usePathname();
  if (path.startsWith("/admin") || path.startsWith("/hoa-don/")) {
    return <>{children}</>;
  }
  return (
    <>
      <Header categories={categories} brand={brand} shippingEta={shippingEta} />
      <main className="flex-1">{children}</main>
      <Footer categories={categories} brand={brand} />
      <ChatWidget />
    </>
  );
}
