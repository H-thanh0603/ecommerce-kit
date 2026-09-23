import { PrismaClient } from "@prisma/client";
import { getTenantSchema } from "./tenant-context";

const globalForPrisma = globalThis as unknown as {
  prismaClients?: Map<string, PrismaClient>;
  schemasProvisioned?: Set<string>;
};

function baseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("Thiếu DATABASE_URL");
  const u = new URL(raw);
  u.search = "";
  return u.toString();
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

// Gỡ client khỏi cache + ngắt pool — dùng khi drop schema để không giữ pool trỏ schema đã xóa.
export function forgetClient(schema: string): void {
  const c = globalForPrisma.prismaClients?.get(schema);
  if (c) {
    globalForPrisma.prismaClients!.delete(schema);
    void c.$disconnect().catch(() => {});
  }
}

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
  if (!c) {
    c = new PrismaClient({
      datasources: { db: { url: `${baseUrl()}?schema=${encodeURIComponent(schema)}` } },
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
    map.set(schema, c);
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
