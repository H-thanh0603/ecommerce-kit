import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// Whitelist host ảnh cho next/image (chống image-optimizer thành SSRF open-proxy).
// Admin dán URL host khác → thêm pattern tại đây.
const remotePatterns: Array<{ protocol: "http" | "https"; hostname: string }> = [
  { protocol: "https", hostname: "images.unsplash.com" },
  { protocol: "https", hostname: "img.vietqr.io" },
];
if (process.env.S3_PUBLIC_BASE) {
  try {
    const u = new URL(process.env.S3_PUBLIC_BASE);
    remotePatterns.push({ protocol: u.protocol === "http:" ? "http" : "https", hostname: u.hostname });
  } catch {
    /* S3_PUBLIC_BASE sai cú pháp → bỏ qua, ảnh S3 sẽ cần thêm pattern tay */
  }
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "nodemailer"],
  // Tắt header lộ phiên bản Next
  poweredByHeader: false,
  // Security headers toàn cục
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    },
  ],
  images: {
    remotePatterns,
  },
};

const sentryEnabled = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      // Bundle size — chỉ tree-shake logger phía client
      bundleSizeOptimizations: {
        excludeDebugStatements: true,
        excludeReplayIframe: true,
        excludeReplayShadowDom: true,
        excludeReplayWorker: true,
      },
      // Source maps upload chỉ khi có token — không block build nếu thiếu
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
      widenClientFileUpload: false,
      tunnelRoute: "/api/monitoring",
    })
  : nextConfig;
