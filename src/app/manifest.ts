import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

export default function manifest(): MetadataRoute.Manifest {
  const name = siteConfig.brand.name;
  return {
    name,
    short_name: name,
    description: siteConfig.brand.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: siteConfig.theme.canvas,
    theme_color: siteConfig.theme.primary,
    lang: "vi",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Sản phẩm", url: "/san-pham" },
      { name: "Giỏ hàng", url: "/gio-hang" },
      { name: "Đơn của tôi", url: "/tai-khoan" },
    ],
  };
}
