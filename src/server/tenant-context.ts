import { AsyncLocalStorage } from "node:async_hooks";

type Ctx = { schema: string };
const store = new AsyncLocalStorage<Ctx>();

export function runWithTenant<T>(schema: string, fn: () => T): T {
  return store.run({ schema }, fn);
}

export function getTenantSchema(): string {
  return store.getStore()?.schema ?? "public";
}
