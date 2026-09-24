import { PrismaClient } from "@prisma/client";
import { isSchemaProvisioned, markSchemaProvisioned } from "./db";
import { parseHost, slugSchema, type TenantInfo } from "./tenant";

function platformUrl(): string {
  const base = process.env.PLATFORM_DATABASE_URL || process.env.DATABASE_URL;
  if (!base) throw new Error("Thiếu DATABASE_URL");
  const u = new URL(base);
  u.searchParams.set("schema", "platform");
  return u.toString();
}

export const platformDb = new PrismaClient({
  datasources: { db: { url: platformUrl() } },
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

export async function createTenant(input: { slug: string; name: string; hosts: string[] }) {
  const parsed = slugSchema.safeParse(input.slug);
  if (!parsed.success) throw new Error("Slug tenant không hợp lệ (chặn public/platform)");
  if (!input.name.trim()) throw new Error("Tên tenant bắt buộc");
  const hosts = input.hosts.map(parseHost).filter(Boolean);
  if (!hosts.length) throw new Error("Cần ít nhất 1 domain");
  return platformDb.$transaction(async (tx) => {
    for (const h of hosts) {
      if (await tx.tenantDomain.findUnique({ where: { host: h } })) {
        throw new Error(`Domain đã gán: ${h}`);
      }
    }
    return tx.tenant.create({
      data: {
        slug: parsed.data,
        name: input.name.trim(),
        domains: { create: hosts.map((host) => ({ host })) },
      },
      include: { domains: true },
    });
  });
}

/**
 * Warm-up (đóng T4 watch): migrate:all chạy process khác → Set schemasProvisioned
 * của process web trống. Check information_schema 1 lần rồi mark — fail-closed chỉ
 * khi schema vắng thật (query lỗi → không mark, getClientForSchema vẫn throw).
 */
async function warmSchemaIfProvisioned(slug: string): Promise<void> {
  if (slug === "public" || isSchemaProvisioned(slug)) return;
  try {
    const rows = await platformDb.$queryRaw<{ n: number }[]>`
      SELECT 1 AS n FROM information_schema.schemata WHERE schema_name = ${slug} LIMIT 1`;
    if (rows.length) markSchemaProvisioned(slug);
  } catch {
    // không mark khi không kiểm tra được — giữ fail-closed
  }
}

export async function findTenantByHost(host: string): Promise<TenantInfo | null> {
  const row = await platformDb.tenantDomain.findUnique({
    where: { host: parseHost(host) },
    include: { tenant: true },
  });
  if (!row || !row.tenant.active) return null;
  await warmSchemaIfProvisioned(row.tenant.slug);
  return { slug: row.tenant.slug, name: row.tenant.name };
}
