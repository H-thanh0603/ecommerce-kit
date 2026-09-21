import { beforeEach, describe, expect, it } from "vitest";
import { createHmac } from "crypto";
import {
  buildMomoPayUrl,
  handleMomoIpn,
  signMomoCreate,
  verifyMomoIpn,
  type MomoOrderStore,
} from "./momo";

const KEYS = { accessKey: "AK", secretKey: "SK", partnerCode: "PM" };

function signedIpn(overrides: Record<string, string | number> = {}) {
  const base: Record<string, string | number> = {
    partnerCode: KEYS.partnerCode,
    orderId: "ATL-00001",
    requestId: "ATL-00001-1",
    amount: 150_000,
    orderInfo: "Thanh toan don ATL-00001",
    orderType: "momo_wallet",
    transId: 999,
    resultCode: 0,
    message: "Successful.",
    payType: "qr",
    responseTime: 1700000000000,
    extraData: "",
    ...overrides,
  };
  const s = (k: string) => String(base[k] ?? "");
  const raw =
    `accessKey=${KEYS.accessKey}&amount=${s("amount")}&extraData=${s("extraData")}&message=${s("message")}` +
    `&orderId=${s("orderId")}&orderInfo=${s("orderInfo")}&orderType=${s("orderType")}` +
    `&partnerCode=${s("partnerCode")}&payType=${s("payType")}&requestId=${s("requestId")}` +
    `&responseTime=${s("responseTime")}&resultCode=${s("resultCode")}&transId=${s("transId")}`;
  return { ...base, signature: createHmac("sha256", KEYS.secretKey).update(raw).digest("hex") };
}

function storeOf(order: { code: string; total: number; paymentStatus: string } | null, spy: { paid: string[]; failed: string[] }): MomoOrderStore {
  return {
    findOrder: async (code) => (order && order.code === code ? order : null),
    markPaid: async (code) => {
      spy.paid.push(code);
    },
    markFailed: async (code) => {
      spy.failed.push(code);
    },
  };
}

describe("momo", () => {
  beforeEach(() => {
    process.env.MOMO_PARTNER_CODE = KEYS.partnerCode;
    process.env.MOMO_ACCESS_KEY = KEYS.accessKey;
    process.env.MOMO_SECRET_KEY = KEYS.secretKey;
  });

  it("thiếu cấu hình thì báo rõ, không throw", async () => {
    delete process.env.MOMO_PARTNER_CODE;
    const r = await buildMomoPayUrl({ code: "ATL-1", total: 1000 });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/MOMO_/);
  });

  it("verify qua với IPN ký đúng, trượt khi sửa amount", () => {
    expect(verifyMomoIpn(signedIpn())).toBe(true);
    expect(verifyMomoIpn({ ...signedIpn(), amount: 150_001 })).toBe(false);
  });

  it("signMomoCreate ổn định", () => {
    const p = {
      ...KEYS,
      amount: "150000",
      extraData: "",
      ipnUrl: "https://x/ipn",
      orderId: "ATL-00001",
      orderInfo: "info",
      redirectUrl: "https://x/return",
      requestId: "r1",
      requestType: "captureWallet",
    };
    expect(signMomoCreate(p)).toBe(signMomoCreate(p));
    expect(signMomoCreate(p)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("IPN: sai checksum / mất đơn / lệch tiền / đã paid / paid / failed", async () => {
    const spy = { paid: [] as string[], failed: [] as string[] };
    const order = { code: "ATL-00001", total: 150_000, paymentStatus: "pending" };
    expect((await handleMomoIpn({ orderId: "ATL-00001" }, storeOf(order, spy))).ok).toBe(false);
    expect((await handleMomoIpn(signedIpn(), storeOf(null, spy))).message).toMatch(/not found/i);
    expect((await handleMomoIpn(signedIpn(), storeOf({ ...order, total: 1 }, spy))).message).toMatch(/amount/i);
    expect((await handleMomoIpn(signedIpn(), storeOf({ ...order, paymentStatus: "paid" }, spy))).ok).toBe(true);
    expect(spy.paid).toEqual([]);
    const r1 = await handleMomoIpn(signedIpn({ resultCode: 0 }), storeOf(order, spy));
    expect(r1.ok).toBe(true);
    expect(spy.paid).toEqual(["ATL-00001"]);
    const r2 = await handleMomoIpn(signedIpn({ resultCode: 1006 }), storeOf(order, spy));
    expect(r2.ok).toBe(true);
    expect(spy.failed).toEqual(["ATL-00001"]);
  });
});
