import { z } from "zod";

export const slugSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{1,30}$/, "slug tenant sai định dạng")
  .refine((s) => s !== "public" && s !== "platform", "slug dành riêng");

export type TenantInfo = { slug: string; name: string };

export function parseHost(host: string): string {
  return host.split(":")[0].toLowerCase();
}

type Lookup = (host: string) => Promise<TenantInfo | null>;
let lookup: Lookup = async () => null;
const cache = new Map<string, { value: TenantInfo | null; exp: number }>();
const TTL = 60_000;

export function setTenantLookup(fn: Lookup) {
  lookup = fn;
  cache.clear();
}

function isLocal(h: string): boolean {
  return h === "localhost" || h === "127.0.0.1" || h.endsWith(".localhost");
}

export async function resolveTenant(host: string): Promise<TenantInfo | null> {
  const h = parseHost(host);
  if (isLocal(h)) {
    return { slug: process.env.DEFAULT_TENANT || "public", name: "Default" };
  }
  const hit = cache.get(h);
  if (hit && hit.exp > Date.now()) return hit.value;
  const value = await lookup(h);
  cache.set(h, { value, exp: Date.now() + TTL });
  return value;
}
