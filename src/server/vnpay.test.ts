import { beforeEach, describe, expect, it } from "vitest";
import {
  buildVnpayUrl,
  handleVnpayIpn,
  signVnpayParams,
  verifyVnpay,
  type VnpOrderRecord,
  type VnpOrderStore,
} from "./vnpay";

function signedQuery(overrides: Record<string, string> = {}) {
  const url = new URL(buildVnpayUrl({ code: "ATL-00001", total: 150_000 }, "1.2.3.4"));
  const q: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    q[k] = v;
  });
  // Cổng thật thêm field response rồi ký lại — mô phỏng đúng như vậy.
  delete q.vnp_SecureHash;
  const merged = { ...q, ...overrides };
  merged.vnp_SecureHash = signVnpayParams(merged, process.env.VNPAY_HASH_SECRET!);
  return merged;
}

function storeOf(order: VnpOrderRecord | null, spy: { paid: string[]; failed: string[] }): VnpOrderStore {
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

describe("vnpay ký/verify", () => {
  beforeEach(() => {
    process.env.VNPAY_TMN_CODE = "TESTTMN";
    process.env.VNPAY_HASH_SECRET = "TESTSECRET";
    process.env.APP_URL = "http://localhost:3000";
  });

  it("build rồi verify qua", () => {
    expect(verifyVnpay(signedQuery())).toBe(true);
  });

  it("sửa 1 đồng cũng trượt checksum", () => {
    const q = signedQuery();
    q.vnp_Amount = String(150_000 * 100 + 100); // can thiệp sau khi ký, không ký lại
    expect(verifyVnpay(q)).toBe(false);
  });

  it("thiếu secret thì verify false, không throw", () => {
    const q = signedQuery();
    delete process.env.VNPAY_HASH_SECRET;
    expect(verifyVnpay(q)).toBe(false);
  });
});

describe("handleVnpayIpn", () => {
  beforeEach(() => {
    process.env.VNPAY_TMN_CODE = "TESTTMN";
    process.env.VNPAY_HASH_SECRET = "TESTSECRET";
  });

  it("97 khi checksum sai", async () => {
    const spy = { paid: [] as string[], failed: [] as string[] };
    const r = await handleVnpayIpn({ vnp_TxnRef: "ATL-00001" }, storeOf(null, spy));
    expect(r.RspCode).toBe("97");
  });

  it("01 khi không thấy đơn", async () => {
    const spy = { paid: [] as string[], failed: [] as string[] };
    const r = await handleVnpayIpn(signedQuery(), storeOf(null, spy));
    expect(r.RspCode).toBe("01");
    expect(spy.paid).toEqual([]);
  });

  it("04 khi số tiền lệch", async () => {
    const spy = { paid: [] as string[], failed: [] as string[] };
    const order = { code: "ATL-00001", total: 150_000, paymentStatus: "pending" };
    const r = await handleVnpayIpn(signedQuery(), storeOf({ ...order, total: 999_000 }, spy));
    expect(r.RspCode).toBe("04");
    expect(spy.paid).toEqual([]);
  });

  it("02 khi đơn đã paid (idempotent, không ghi lại)", async () => {
    const spy = { paid: [] as string[], failed: [] as string[] };
    const order = { code: "ATL-00001", total: 150_000, paymentStatus: "paid" };
    const r = await handleVnpayIpn(signedQuery({ vnp_ResponseCode: "00" }), storeOf(order, spy));
    expect(r.RspCode).toBe("02");
    expect(spy.paid).toEqual([]);
  });

  it("00 + markPaid khi thanh toán thành công", async () => {
    const spy = { paid: [] as string[], failed: [] as string[] };
    const order = { code: "ATL-00001", total: 150_000, paymentStatus: "pending" };
    const r = await handleVnpayIpn(signedQuery({ vnp_ResponseCode: "00" }), storeOf(order, spy));
    expect(r.RspCode).toBe("00");
    expect(spy.paid).toEqual(["ATL-00001"]);
  });

  it("00 + markFailed khi cổng báo thất bại", async () => {
    const spy = { paid: [] as string[], failed: [] as string[] };
    const order = { code: "ATL-00001", total: 150_000, paymentStatus: "pending" };
    const r = await handleVnpayIpn(signedQuery({ vnp_ResponseCode: "24" }), storeOf(order, spy));
    expect(r.RspCode).toBe("00");
    expect(spy.failed).toEqual(["ATL-00001"]);
  });
});
