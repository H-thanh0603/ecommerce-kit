import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { markSchemaProvisioned, unmarkSchemaProvisioned, forgetClient } from "./db";

export function baseDbUrl(): string {
  const u = new URL(process.env.DATABASE_URL!);
  u.search = "";
  return u.toString();
}

function rootClient(): PrismaClient {
  return new PrismaClient({ datasources: { db: { url: baseDbUrl() } } });
}

export async function ensureSchema(slug: string) {
  const root = rootClient();
  await root.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${slug}"`);
  await root.$disconnect();
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: `${baseDbUrl()}?schema=${slug}` },
    stdio: "pipe",
  });
  // Migrate xong mới mark — getClientForSchema check set này (fail-closed sync).
  markSchemaProvisioned(slug);
}

export async function dropSchema(slug: string) {
  const root = rootClient();
  await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${slug}" CASCADE`);
  await root.$disconnect();
  // Gỡ cache client + unmark — tránh giữ pool trỏ schema đã xóa.
  forgetClient(slug);
  unmarkSchemaProvisioned(slug);
}
