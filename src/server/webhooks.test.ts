import { createServer } from "http";
import { createHmac } from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./db";
import { dispatchWebhooks, signWebhook, upsertWebhook } from "./webhooks";

type Hit = { event: string; signature: string; timestamp: string; body: string };
let hits: Hit[] = [];
let server: ReturnType<typeof createServer>;
let port = 0;

beforeAll(
  () =>
    new Promise<void>((resolve) => {
      server = createServer((req, res) => {
        let raw = "";
        req.on("data", (c) => (raw += c));
        req.on("end", () => {
          hits.push({
            event: String(req.headers["x-ek-event"] || ""),
            signature: String(req.headers["x-ek-signature"] || ""),
            timestamp: String(req.headers["x-ek-timestamp"] || ""),
            body: raw,
          });
          res.writeHead(200).end("ok");
        });
      });
      server.listen(0, "127.0.0.1", () => {
        port = (server.address() as { port: number }).port;
        resolve();
      });
    }),
);

afterAll(
  () =>
    new Promise<void>((resolve) => {
      server.close(() => resolve());
    }),
);

describe("webhooks đi", () => {
  it("ký đúng + chỉ bắn event đã đăng ký", async () => {
    const url = `http://127.0.0.1:${port}/hook`;
    const wh = await upsertWebhook({ url, events: "order.created" });
    hits = [];
    await dispatchWebhooks("order.created", { code: "ATL-1" });
    expect(hits.length).toBe(1);
    expect(hits[0].event).toBe("order.created");
    const expectSig = createHmac("sha256", wh.secret).update(`${hits[0].timestamp}.${hits[0].body}`).digest("hex");
    expect(hits[0].signature).toBe(expectSig);
    expect(signWebhook(wh.secret, hits[0].timestamp, hits[0].body)).toBe(expectSig);

    hits = [];
    await dispatchWebhooks("order.paid", { code: "ATL-1" });
    expect(hits.length).toBe(0);
    await prisma.webhookEndpoint.delete({ where: { id: wh.id } });
  });

  it("endpoint chết không vỡ luồng", async () => {
    const wh = await upsertWebhook({ url: "http://127.0.0.1:1/chet", events: "order.created" });
    const r = await dispatchWebhooks("order.created", {});
    expect(r[0].ok).toBe(false);
    await prisma.webhookEndpoint.delete({ where: { id: wh.id } });
  });

  it("chặn URL bậy", async () => {
    await expect(upsertWebhook({ url: "ftp://x" })).rejects.toThrow();
    await expect(upsertWebhook({ url: "khong-phai-url" })).rejects.toThrow();
  });
});
