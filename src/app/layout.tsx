import type { Metadata } from "next";
import { Be_Vietnam_Pro, Noto_Serif } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChatWidget } from "@/components/ai/ChatWidget";
import { listCategories } from "@/server/commerce";

const sans = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
});

const serif = Noto_Serif({
  variable: "--font-noto",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.seo.defaultTitle,
    template: siteConfig.seo.titleTemplate,
  },
  description: siteConfig.seo.defaultDescription,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const categories = await listCategories().catch(() => []);
  const theme = siteConfig.theme;
  return (
    <html lang="vi" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        <style>{`:root{--brand-primary:${theme.primary};--brand-accent:${theme.accent};--brand-ink:${theme.ink};--brand-muted:${theme.muted};--brand-canvas:${theme.canvas};--brand-line:${theme.line};}`}</style>
        <Providers>
          <Header categories={categories} />
          <main className="flex-1">{children}</main>
          <Footer categories={categories} />
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}
