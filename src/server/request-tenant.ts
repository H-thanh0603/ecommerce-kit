import { headers } from "next/headers";
import { resolveBaseUrl, resolveTenant, wireTenantLookup, type TenantInfo } from "@/server/tenant";
import { enterTenantScope, runWithTenant } from "@/server/tenant-context";

/** resolveTenant chống lỗi: lookup/DB ném → null (fail-closed — không tin Host). */
async function resolveTenantSafe(host: string): Promise<TenantInfo | null> {
  try {
    return await resolveTenant(host);
  } catch {
    return null;
  }
}

/**
 * Base URL cho link mail người dùng CHỈ tin Host khi Host resolve ra tenant
 * (local theo T2 hoặc platform lookup khớp); Host lạ/forged → APP_URL.
 * Chặn Host-header poisoning token reset — route mail không đi qua 404 của layout.
 */
export async function resolveTrustedBaseUrl(host: string | null): Promise<string> {
  wireTenantLookup(); // idempotent — request entry, gọi nhiều lần an toàn
  if (!host) return resolveBaseUrl(null);
  const tenant = await resolveTenantSafe(host);
  return resolveBaseUrl(tenant ? host : null);
}

/**
 * Chạy fn dưới ALS schema của Host (wrap runWithTenant).
 * ALS lồng: inner wins, thoát inner về lại outer (xem request-tenant.test).
 * Next render page/metadata song song layout → mỗi entry tự gọi helper (wire idempotent).
 */
export async function withTenantFromRequest<T>(
  host: string | null,
  fn: (tenant: TenantInfo | null) => T,
): Promise<T> {
  wireTenantLookup();
  const tenant = host ? await resolveTenantSafe(host) : null;
  return runWithTenant(tenant?.slug ?? "public", () => fn(tenant));
}

/** Resolve tenant từ Host của request hiện tại; ngoài request context (script/cron) → null. */
export async function resolveRequestTenant(): Promise<TenantInfo | null> {
  wireTenantLookup();
  let host: string | null = null;
  try {
    host = (await headers()).get("host");
  } catch {
    /* ngoài request context → default */
  }
  return host ? resolveTenantSafe(host) : null;
}

/**
 * Page entry: `enterTenant(await resolveRequestTenant())` dòng đầu hàm —
 * enterWith phải gọi TRỰC TIẾP trong frame page (xem enterTenantScope).
 */
export function enterTenant(tenant: TenantInfo | null): void {
  enterTenantScope(tenant?.slug ?? "public");
}
