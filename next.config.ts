import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "nodemailer"],
  images: {
    // S3/R2/domain khách tự thêm host tại đây nếu không dùng wildcard.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
