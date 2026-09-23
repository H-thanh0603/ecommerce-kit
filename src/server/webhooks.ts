import { createHmac } from "crypto";
import { prisma } from "@/server/db";

export const WEBHOOK_EVENTS = ["order.created", "order.status", "order.paid", "return.completed"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number] | string;

export function signWebhook(secret: string, timestamp: string, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

/** POST 1 lần với timeout — pure network, dùng cho retry. */
async function postOnce(url: string, headers: Record<string, string>, body: string) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body,
      signal: AbortSignal.timeout(8000),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false };
  }
}

/**
 * Bắn event tới endpoint đã đăng ký — lỗi không vỡ luồng chính.
 * Retry tối đa 3 lần (Q85): backoff 200ms → 600ms, chỉ khi network/5xx.
 */
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
      const headers = {
        "X-EK-Event": event,
        "X-EK-Timestamp": ts,
        "X-EK-Signature": signWebhook(t.secret, ts, body),
      };
      let out = await postOnce(t.url, headers, body);
      let attempts = 1;
      while (!out.ok && attempts < 3 && (out.status === undefined || out.status >= 500)) {
        await new Promise((r) => setTimeout(r, 200 * attempts * 3));
        out = await postOnce(t.url, headers, body);
        attempts += 1;
      }
      return { url: t.url, ok: out.ok, status: out.status, attempts };
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
