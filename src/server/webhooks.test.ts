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
    // DB dùng chung: dọn endpoint test-junk localhost của run cũ crash để lại (AGENTS.md — test tự dọn).
    await prisma.webhookEndpoint.deleteMany({ where: { url: { startsWith: "http://127.0.0.1" } } });
    const url = `http://127.0.0.1:${port}/hook`;
    const wh = await upsertWebhook({ url, events: "order.created" });
    try {
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

      // upsert 2 lần cùng URL → cập nhật, không tạo row trùng (đẩy event 2 lần)
      const again = await upsertWebhook({ url, events: "order.created,order.status" });
      expect(again.id).toBe(wh.id);
      expect(await prisma.webhookEndpoint.count({ where: { url } })).toBe(1);
    } finally {
      await prisma.webhookEndpoint.deleteMany({ where: { id: wh.id } });
    }
  });

  it("endpoint chết không vỡ luồng", async () => {
    // Dọn junk trước để r[0] chắc chắn là endpoint chết của test này.
    await prisma.webhookEndpoint.deleteMany({ where: { url: { startsWith: "http://127.0.0.1" } } });
    const wh = await upsertWebhook({ url: "http://127.0.0.1:1/chet", events: "order.created" });
    try {
      const r = await dispatchWebhooks("order.created", {});
      expect(r).toHaveLength(1);
      expect(r[0].ok).toBe(false);
    } finally {
      await prisma.webhookEndpoint.deleteMany({ where: { id: wh.id } });
    }
  });

  it("chặn URL bậy", async () => {
    await expect(upsertWebhook({ url: "ftp://x" })).rejects.toThrow();
    await expect(upsertWebhook({ url: "khong-phai-url" })).rejects.toThrow();
  });
});
