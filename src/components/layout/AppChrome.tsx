"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChatWidget } from "@/components/ai/ChatWidget";
import type { Category } from "@/types";

export function AppChrome({
  categories,
  children,
}: {
  categories: Category[];
  children: React.ReactNode;
}) {
  const path = usePathname();
  if (path.startsWith("/admin") || path.startsWith("/hoa-don/")) {
    return <>{children}</>;
  }
  return (
    <>
      <Header categories={categories} />
      <main className="flex-1">{children}</main>
      <Footer categories={categories} />
      <ChatWidget />
    </>
  );
}
