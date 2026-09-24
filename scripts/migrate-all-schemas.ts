import { execSync } from "node:child_process";
import { platformDb } from "../src/server/platform-db";
import { slugSchema } from "../src/server/tenant";

/**
 * Migrate toàn bộ schema: public + platform + mọi tenant active.
 * Idempotent (T5): đã migrate → prisma migrate deploy skip, chạy 2 lần exit 0.
 * Schema tenant chưa tồn tại (row /platform UI tạo trước) → prisma tự CREATE rồi migrate.
 */
async function main() {
  const tenants = await platformDb.tenant.findMany({
    where: { active: true },
    select: { slug: true },
  });
  const tenantSchemas = tenants.map((t) => {
    const parsed = slugSchema.safeParse(t.slug);
    if (!parsed.success) throw new Error(`Slug tenant sai trong platform DB: ${t.slug}`);
    return parsed.data;
  });
  const schemas = ["public", "platform", ...tenantSchemas];
  const base = (process.env.DATABASE_URL || "").split("?")[0];
  if (!base) throw new Error("Thiếu DATABASE_URL");

  for (const s of [...new Set(schemas)]) {
    console.log(`migrate → ${s}`);
    execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: `${base}?schema=${s}` },
      stdio: "inherit",
    });
  }
  await platformDb.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
