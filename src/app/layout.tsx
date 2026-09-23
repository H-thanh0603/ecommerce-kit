import type { Metadata } from "next";
import { Be_Vietnam_Pro, Noto_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppChrome } from "@/components/layout/AppChrome";
import { OrganizationJsonLd } from "@/components/seo/JsonLd";
import { listCategories } from "@/server/commerce";
import { getEffectiveSiteConfig } from "@/server/settings";

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

export async function generateMetadata(): Promise<Metadata> {
  const site = await getEffectiveSiteConfig().catch(() => null);
  const name = site?.brand.name || "Atelier";
  const description =
    site?.brand.description ||
    "Mua sắm thời trang, nhà cửa và lifestyle. Giao hàng toàn quốc, đổi trả 7 ngày.";
  const app = process.env.APP_URL || "http://localhost:3000";
  return {
    metadataBase: new URL(app),
    title: {
      default: `${name} — Cửa hàng trực tuyến`,
      template: `%s · ${name}`,
    },
    description,
    openGraph: { title: name, description, type: "website", locale: "vi_VN", url: app },
    twitter: { card: "summary", title: name, description },
    icons: { icon: "/favicon.svg" },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [categories, site] = await Promise.all([
    listCategories().catch(() => []),
    getEffectiveSiteConfig().catch(() => null),
  ]);
  const theme = site?.theme;
  const brand = site?.brand;
  const shippingEta = site?.shipping.estimatedDays;
  return (
    <html lang="vi" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-white"
        >
          Bỏ qua tới nội dung chính
        </a>
        {site && <OrganizationJsonLd name={site.brand.name} description={site.brand.description} />}
        {theme && (
          <style>{`:root{--brand-primary:${theme.primary};--brand-accent:${theme.accent};--brand-ink:${theme.ink};--brand-muted:${theme.muted};--brand-canvas:${theme.canvas};--brand-line:${theme.line};}`}</style>
        )}
        <Providers>
          <AppChrome
            categories={categories}
            brand={brand || undefined}
            shippingEta={shippingEta}
            announcement={site?.announcement}
            consent={site?.consent}
          >
            {children}
          </AppChrome>
        </Providers>
      </body>
    </html>
  );
}
