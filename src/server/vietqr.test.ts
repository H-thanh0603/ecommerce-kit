import { beforeEach, describe, expect, it } from "vitest";
import {
  buildVietqrPayUrl,
  checkVietqrTransaction,
  extractVietqrOrderCode,
  handleVietqrIpn,
  signVietqrPayload,
  verifyVietqr,
  type VietqrOrderStore,
} from "./vietqr";

const SECRET = "whsec-test";
const CFG = { bank: "Vietcombank", shortCode: "VCB", accountName: "CONG TY EKKIT", accountNumber: "0123456789" };

const ORDER = { code: "EK-00012", total: 150_000, paymentStatus: "pending" };

function signedBody(overrides: Record<string, unknown> = {}) {
  const body = {
    content: `CK don EK-00012`,
    transferAmount: 150_000,
    referenceCode: "FT123456",
    ...overrides,
  };
  return { body, raw: JSON.stringify(body), signature: signVietqrPayload(JSON.stringify(body), SECRET) };
}

function storeOf(order: typeof ORDER | null, spy: { paid: string[] }): VietqrOrderStore {
  return {
    findOrder: async (code) => (order && order.code === code ? order : null),
    markPaid: async (code) => {
      spy.paid.push(code);
    },
  };
}

describe("vietqr", () => {
  beforeEach(() => {
    process.env.VIETQR_WEBHOOK_SECRET = SECRET;
  });

  it("buildVietqrPayUrl: QR chứa số tiền + mã đơn làm nội dung CK", () => {
    const r = buildVietqrPayUrl({ code: "EK-00012", total: 150_000 }, CFG);
    expect(r.ok).toBe(true);
    expect(r.payUrl).toContain("img.vietqr.io/image/VCB-0123456789");
    expect(r.payUrl).toContain("amount=150000");
    expect(r.payUrl).toContain(`addInfo=EK-00012`);
    expect(r.addInfo).toBe("EK-00012");
  });

  it("extractVietqrOrderCode: tìm được mã đúng tiền tố, hoa/thường như nhau", () => {
    expect(extractVietqrOrderCode("chuyen tien EK-00012 voi 150k")).toBe("EK-00012");
    expect(extractVietqrOrderCode("ek-00013")).toBe("EK-00013");
    expect(extractVietqrOrderCode("khong co ma")).toBeNull();
  });

  it("verifyVietqr: chữ ký đúng qua, sai body/sai chữ ký/rỗng secret trượt", () => {
    const { raw, signature } = signedBody();
    expect(verifyVietqr(raw, signature, SECRET)).toBe(true);
    expect(verifyVietqr(raw + " ", signature, SECRET)).toBe(false);
    expect(verifyVietqr(raw, signature.slice(0, -2) + "ff", SECRET)).toBe(false);
    expect(verifyVietqr(raw, "", SECRET)).toBe(false);
    expect(verifyVietqr(raw, signature, "")).toBe(false);
  });

  it("IPN hợp lệ → markPaid đúng 1 lần; gửi lại lần 2 thì idempotent", async () => {
    const spy = { paid: [] as string[] };
    const { raw, signature } = signedBody();
    const r1 = await handleVietqrIpn(raw, signature, storeOf(ORDER, spy));
    expect(r1.ok).toBe(true);
    expect(spy.paid).toEqual(["EK-00012"]);
    const r2 = await handleVietqrIpn(raw, signature, storeOf({ ...ORDER, paymentStatus: "paid" }, spy));
    expect(r2.ok).toBe(true);
    expect(r2.alreadyPaid).toBe(true);
    expect(spy.paid).toEqual(["EK-00012"]);
  });

  it("IPN: sai chữ ký / thiếu mã / không thấy đơn / thiếu tiền đều từ chối, không mark", async () => {
    const spy = { paid: [] as string[] };
    const { body, raw, signature } = signedBody();
    expect((await handleVietqrIpn(raw, "deadbeef", storeOf(ORDER, spy))).ok).toBe(false);
    expect((await handleVietqrIpn(raw, signature, storeOf(null, spy))).ok).toBe(false);
    const underpaid = JSON.stringify({ ...body, transferAmount: 1000 });
    const r = await handleVietqrIpn(underpaid, signVietqrPayload(underpaid, SECRET), storeOf(ORDER, spy));
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/amount/i);
    expect(spy.paid).toEqual([]);
    // CK thừa tiền (khách cộng dồn) vẫn tính.
    const overpaid = JSON.stringify({ ...body, transferAmount: 200_000 });
    const rok = await handleVietqrIpn(overpaid, signVietqrPayload(overpaid, SECRET), storeOf(ORDER, spy));
    expect(rok.ok).toBe(true);
    expect(spy.paid).toEqual(["EK-00012"]);
  });

  it("checkVietqrTransaction: thấy giao dịch khớp mã + đủ tiền → paid; không thấy → chưa paid", async () => {
    process.env.SEPAY_API_KEY = "sk-test";
    const txs = (items: Array<{ content: string; amount: number }>) => async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: "success", data: { transactions: items } }),
    });
    const r1 = await checkVietqrTransaction({ code: "EK-00012", total: 150_000 }, {
      apiKey: "sk-test",
      fetcher: txs([{ content: "CK don EK-00012", amount: 150_000 }]),
    });
    expect(r1.paid).toBe(true);
    const r2 = await checkVietqrTransaction({ code: "EK-00012", total: 150_000 }, {
      apiKey: "sk-test",
      fetcher: txs([{ content: "CK don khac", amount: 150_000 }, { content: "EK-00012", amount: 5000 }]),
    });
    expect(r2.paid).toBe(false);
    // API lỗi → ok:false, không paid.
    const r3 = await checkVietqrTransaction({ code: "EK-00012", total: 150_000 }, {
      apiKey: "sk-test",
      fetcher: async () => {
        throw new Error("network");
      },
    });
    expect(r3.ok).toBe(false);
    expect(r3.paid).toBe(false);
  });

  it("checkVietqrTransaction: thiếu SEPAY_API_KEY thì báo chưa cấu hình", async () => {
    delete process.env.SEPAY_API_KEY;
    const r = await checkVietqrTransaction({ code: "EK-00012", total: 150_000 });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/SEPAY_API_KEY/);
  });
});
