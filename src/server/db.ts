import { PrismaClient } from "@prisma/client";
import { getTenantSchema } from "./tenant-context";

const globalForPrisma = globalThis as unknown as {
  prismaClients?: Map<string, PrismaClient>;
  schemasProvisioned?: Set<string>;
};

const DEFAULT_CONNECTION_LIMIT = 5;
const EVICT_DISCONNECT_GRACE_MS = 5_000;

/**
 * Dựng URL cho 1 schema tenant: giữ lại query param kết nối (sslmode, pgbouncer...),
 * gắn `schema` và giới hạn `connection_limit` mỗi client để 10 tenant không làm cạn
 * `max_connections` của Postgres.
 */
export function buildSchemaUrl(rawUrl: string, schema: string): string {
  const u = new URL(rawUrl);
  u.searchParams.set("schema", schema);
  if (!u.searchParams.has("connection_limit")) {
    const rawLimit = Number(process.env.PRISMA_CONNECTION_LIMIT);
    const limit =
      Number.isFinite(rawLimit) && rawLimit >= 1 && rawLimit <= 50
        ? Math.floor(rawLimit)
        : DEFAULT_CONNECTION_LIMIT;
    u.searchParams.set("connection_limit", String(limit));
  }
  return u.toString();
}

function datasourceUrl(schema: string): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("Thiếu DATABASE_URL");
  return buildSchemaUrl(raw, schema);
}

// Đánh dấu schema đã được migrate (ensureSchema / migrate-all / đăng ký tenant gọi).
// Set đồng bộ trên globalThis — Proxy get-trap cần check sync, không đợi được query async.
export function markSchemaProvisioned(schema: string): void {
  const s = globalForPrisma.schemasProvisioned ?? new Set<string>();
  globalForPrisma.schemasProvisioned = s;
  s.add(schema);
}

export function unmarkSchemaProvisioned(schema: string): void {
  globalForPrisma.schemasProvisioned?.delete(schema);
}

export function isSchemaProvisioned(schema: string): boolean {
  return Boolean(globalForPrisma.schemasProvisioned?.has(schema));
}

// Gỡ client khỏi cache + ngắt pool — mặc định ngắt ngay (dùng khi drop schema).
// Khi evict LRU truyền graceMs > 0 để query đang in-flight kịp xong trước khi đóng pool.
export function forgetClient(schema: string, graceMs = 0): void {
  const c = globalForPrisma.prismaClients?.get(schema);
  if (c) {
    globalForPrisma.prismaClients!.delete(schema);
    if (graceMs > 0) {
      const t = setTimeout(() => {
        void c.$disconnect().catch(() => {});
      }, graceMs);
      t.unref?.();
    } else {
      void c.$disconnect().catch(() => {});
    }
  }
}

// Tenant <10 nên cache tối đa 10 client — vượt thì evict LRU (key cũ nhất).
const MAX_CLIENTS = 10;

export function getClientForSchema(schema: string): PrismaClient {
  // Fail-closed: slug chưa mark = schema chưa migrate (cửa sổ T4→T10) —
  // lỗi rõ ràng thay vì build pool chết rồi mọi query ném P2021 và cache vĩnh viễn.
  // "public" đi đường cũ, không check — giữ nguyên hành vi 89 test hiện có.
  if (schema !== "public" && !globalForPrisma.schemasProvisioned?.has(schema)) {
    throw new Error(`Thiếu schema ${schema} — chạy migrate-all trước`);
  }
  const map = globalForPrisma.prismaClients ?? new Map();
  globalForPrisma.prismaClients = map;
  let c = map.get(schema);
  if (c) {
    // LRU touch: xóa-insert lại để mark recent (Map giữ thứ tự insert).
    map.delete(schema);
    map.set(schema, c);
    return c;
  }
  c = new PrismaClient({
    datasources: { db: { url: datasourceUrl(schema) } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  map.set(schema, c);
  // Tenant <10 nên MAX 10 đủ — vượt thì evict key cũ nhất (đầu Map) + trì hoãn disconnect để không cắt query in-flight.
  while (map.size > MAX_CLIENTS) {
    const oldest = map.keys().next().value as string | undefined;
    if (oldest === undefined || oldest === schema) break;
    forgetClient(oldest, EVICT_DISCONNECT_GRACE_MS);
  }
  return c;
}

function currentClient(): PrismaClient {
  return getClientForSchema(getTenantSchema());
}

// Proxy giữ nguyên call site `prisma.model.op()` — resolve client theo ALS schema hiện tại.
export const prisma = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    const client = currentClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
