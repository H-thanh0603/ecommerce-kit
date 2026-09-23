"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ConsentBanner } from "@/components/layout/ConsentBanner";
import type { EffectiveSite } from "@/config/site";
import type { Category } from "@/types";

// Chat widget chỉ tải khi client — không chặn first paint (Q96).
const ChatWidget = dynamic(() =>
  import("@/components/ai/ChatWidget").then((m) => ({ default: m.ChatWidget })),
);

export function AppChrome({
  categories,
  brand,
  shippingEta,
  announcement,
  consent,
  children,
}: {
  categories: Category[];
  brand?: EffectiveSite["brand"];
  shippingEta?: string;
  announcement?: EffectiveSite["announcement"];
  consent?: EffectiveSite["consent"];
  children: React.ReactNode;
}) {
  const path = usePathname();
  if (path.startsWith("/admin") || path.startsWith("/hoa-don/")) {
    return <>{children}</>;
  }
  return (
    <>
      {announcement?.enabled && announcement.text && (
        <p className="bg-accent px-4 py-2 text-center text-xs text-white" role="status">
          {announcement.text}
        </p>
      )}
      <Header categories={categories} brand={brand} shippingEta={shippingEta} />
      <main id="main" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <Footer categories={categories} brand={brand} />
      <ChatWidget />
      <ConsentBanner enabled={consent?.enabled} text={consent?.text} />
    </>
  );
}
