import type { NextConfig } from "next";

// Whitelist host ảnh cho next/image (chống image-optimizer thành SSRF open-proxy).
// Admin dán URL host khác → thêm pattern tại đây.
const remotePatterns: Array<{ protocol: "http" | "https"; hostname: string }> = [
  { protocol: "https", hostname: "images.unsplash.com" },
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
  images: {
    remotePatterns,
  },
};

export default nextConfig;
