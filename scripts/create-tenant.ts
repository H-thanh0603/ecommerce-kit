import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { createTenant } from "../src/server/platform-db";
import { parseHost } from "../src/server/tenant";

/**
 * Tạo tenant: platform row → CREATE SCHEMA → migrate deploy → seed → brand name.
 * Idempotent (T5): slug/domain đã có → createTenant reject, exit 1 (fail sạch).
 */
const [slug, name, hostsArg] = process.argv.slice(2);
if (!slug || !name || !hostsArg) {
  console.error("Usage: tsx scripts/create-tenant.ts <slug> <ten> <host1,host2>");
  process.exit(1);
}
const base = (process.env.DATABASE_URL || "").split("?")[0];
if (!base) {
  console.error("Thiếu DATABASE_URL");
  process.exit(1);
}

async function main() {
  await createTenant({ slug, name, hosts: hostsArg.split(",").map(parseHost) });
  const root = new PrismaClient({ datasources: { db: { url: base } } });
  await root.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${slug}"`);
  await root.$disconnect();
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: `${base}?schema=${slug}` },
    stdio: "inherit",
  });
  execSync("npx tsx prisma/seed.ts", {
    env: { ...process.env, DATABASE_URL: `${base}?schema=${slug}` },
    stdio: "inherit",
  });
  // Seed không ghi SiteSetting — homepage đọc brand từ đó; set name theo tenant
  // để smoke/brand grep thấy đúng thương hiệu (không qua saveSiteSettings: next/cache
  // ngoài runtime Next).
  const tenantDb = new PrismaClient({ datasources: { db: { url: `${base}?schema=${slug}` } } });
  const brand = JSON.stringify({ name, logoText: name.slice(0, 40) });
  await tenantDb.siteSetting.upsert({
    where: { key: "brand" },
    create: { key: "brand", value: brand },
    update: { value: brand },
  });
  await tenantDb.$disconnect();
  console.log(`OK tenant ${slug} — domain: ${hostsArg}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
