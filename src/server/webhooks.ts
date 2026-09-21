import { createHmac } from "crypto";
import { prisma } from "@/server/db";

export const WEBHOOK_EVENTS = ["order.created", "order.status", "order.paid", "return.completed"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number] | string;

export function signWebhook(secret: string, timestamp: string, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

/** Bắn event tới các endpoint đã đăng ký — lỗi endpoint không vỡ luồng chính. */
export async function dispatchWebhooks(
  event: string,
  payload: unknown,
): Promise<Array<{ url: string; ok: boolean; status?: number }>> {
  const endpoints = await prisma.webhookEndpoint.findMany({ where: { active: true } }).catch(() => []);
  const targets = endpoints.filter((e) =>
    e.events
      .split(",")
      .map((s) => s.trim())
      .includes(event),
  );
  const body = JSON.stringify({ event, at: new Date().toISOString(), data: payload });
  const results = await Promise.all(
    targets.map(async (t) => {
      const ts = String(Date.now());
      try {
        const res = await fetch(t.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-EK-Event": event,
            "X-EK-Timestamp": ts,
            "X-EK-Signature": signWebhook(t.secret, ts, body),
          },
          body,
          signal: AbortSignal.timeout(8000),
        });
        return { url: t.url, ok: res.ok, status: res.status };
      } catch {
        return { url: t.url, ok: false };
      }
    }),
  );
  return results;
}

export async function listWebhooks() {
  return prisma.webhookEndpoint.findMany({ orderBy: { createdAt: "desc" } });
}

export async function upsertWebhook(data: { id?: string; url: string; secret?: string; events?: string; active?: boolean }) {
  let url: URL;
  try {
    url = new URL(data.url);
  } catch {
    throw new Error("URL không hợp lệ");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Chỉ http(s)");
  const secret =
    data.secret ||
    (data.id
      ? (await prisma.webhookEndpoint.findUnique({ where: { id: data.id } }))?.secret || ""
      : [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join(""));
  if (!secret) throw new Error("Thiếu secret");
  const payload = {
    url: url.toString(),
    secret,
    events: (data.events || "order.created,order.status,order.paid").slice(0, 500),
    active: data.active ?? true,
  };
  return data.id
    ? prisma.webhookEndpoint.update({ where: { id: data.id }, data: payload })
    : prisma.webhookEndpoint.create({ data: payload });
}

export async function deleteWebhook(id: string) {
  await prisma.webhookEndpoint.delete({ where: { id } });
}
