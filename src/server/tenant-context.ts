import { AsyncLocalStorage } from "node:async_hooks";

type Ctx = { schema: string };
const store = new AsyncLocalStorage<Ctx>();

export function runWithTenant<T>(schema: string, fn: () => T): T {
  return store.run({ schema }, fn);
}

/**
 * Chuyển ALS scope ngay tại frame gọi (enterWith): phần còn lại của async frame
 * này thấy schema mới; awaiter và request song song KHÔNG bị ảnh hưởng.
 * Ẩn sau một await trong helper riêng sẽ mất trước khi về caller — chỉ gọi
 * trực tiếp trong frame page entry.
 */
export function enterTenantScope(schema: string): void {
  store.enterWith({ schema });
}

export function getTenantSchema(): string {
  return store.getStore()?.schema ?? "public";
}
