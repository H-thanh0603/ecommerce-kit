import { z } from "zod";
import { runWithTenant } from "./tenant-context";

/** Chạy fn trong schema DEFAULT_TENANT (fallback "public") — dùng cho cron/IPN không có Host tenant. */
export function withDefaultTenant<T>(fn: () => T): T {
  return runWithTenant(process.env.DEFAULT_TENANT || "public", fn);
}

export const slugSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{1,30}$/, "slug tenant sai định dạng")
  .refine((s) => s !== "public" && s !== "platform", "slug dành riêng");

export type TenantInfo = { slug: string; name: string };

export function parseHost(host: string): string {
  return host.split(":")[0].toLowerCase();
}

/** Host → base URL cho link mail: prod https, dev http; thiếu Host → APP_URL fallback. */
export function resolveBaseUrl(host: string | null): string {
  if (host) {
    const proto = process.env.NODE_ENV === "production" ? "https" : "http";
    return `${proto}://${parseHost(host)}`;
  }
  return process.env.APP_URL || "http://localhost:3000";
}

type Lookup = (host: string) => Promise<TenantInfo | null>;
let lookup: Lookup = async () => null;
const cache = new Map<string, { value: TenantInfo | null; exp: number }>();
const TTL = 60_000;

export function setTenantLookup(fn: Lookup) {
  lookup = fn;
  cache.clear();
}

function isBareLocal(h: string): boolean {
  return h === "localhost" || h === "127.0.0.1";
}

export async function resolveTenant(host: string): Promise<TenantInfo | null> {
  const h = parseHost(host);
  // Bare localhost → default không lookup (cron/health/dev không đăng ký domain).
  // `*.localhost` (shopa.localhost) đi lookup như host thật — multi-tenant local
  // theo spec §4.3; miss → fallback default (browser tự resolve subdomain local).
  if (isBareLocal(h)) {
    return { slug: process.env.DEFAULT_TENANT || "public", name: "Default" };
  }
  const hit = cache.get(h);
  if (hit && hit.exp > Date.now()) return hit.value;
  const value = await lookup(h);
  if (value) {
    cache.set(h, { value, exp: Date.now() + TTL });
    return value;
  }
  if (h.endsWith(".localhost")) {
    return { slug: process.env.DEFAULT_TENANT || "public", name: "Default" };
  }
  cache.set(h, { value, exp: Date.now() + TTL });
  return null;
}

import { findTenantByHost } from "./platform-db";

let wired = false;

/** Set lookup từ platform DB — idempotent: set 1 lần/module, không wipe cache mỗi request. */
export function wireTenantLookup() {
  if (wired) return;
  wired = true;
  setTenantLookup(findTenantByHost);
}
