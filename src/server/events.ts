import type { Order, OrderStatus } from "@/types";
import { mailOrderCreated, mailOrderStatus } from "@/server/mail";
import { dispatchWebhooks } from "@/server/webhooks";

type Handler = (payload: unknown) => Promise<void> | void;

const handlers: Record<string, Handler[]> = {};

export function on(event: string, handler: Handler) {
  (handlers[event] ||= []).push(handler);
}

async function emit(event: string, payload: unknown) {
  for (const h of handlers[event] || []) await h(payload);
}

on("order.created", async (p) => {
  await mailOrderCreated(p as Order);
  await dispatchWebhooks("order.created", p);
});
on("order.status", async (p) => {
  const { order } = p as { order: Order; status: OrderStatus };
  await mailOrderStatus(order);
  await dispatchWebhooks("order.status", p);
});

export async function onOrderCreated(order: Order) {
  await emit("order.created", order);
}

export async function onOrderStatusChanged(order: Order, status: OrderStatus) {
  await emit("order.status", { order, status });
}
