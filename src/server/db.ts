import { PrismaClient } from "@prisma/client";
import { getTenantSchema } from "./tenant-context";

const globalForPrisma = globalThis as unknown as { prismaClients?: Map<string, PrismaClient> };

function baseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("Thiếu DATABASE_URL");
  const u = new URL(raw);
  u.search = "";
  return u.toString();
}

export function getClientForSchema(schema: string): PrismaClient {
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
