import { beforeEach, describe, expect, it } from "vitest";
import { extractOrderCode, handleSepayWebhook, type SepayStore } from "./sepay";

function storeOf(order: { code: string; total: number; paymentStatus: string; paymentMethod: string } | null, spy: { paid: string[] }): SepayStore {
  return {
    findOrder: async (code) => (order && order.code === code ? order : null),
    markPaid: async (code) => {
      spy.paid.push(code);
    },
  };
}

describe("sepay", () => {
  beforeEach(() => {
    process.env.SEPAY_API_KEY = "TESTKEY";
  });

  it("tách mã đơn từ nội dung CK", () => {
    expect(extractOrderCode("Thanh toan atl-00012 cam on")).toBe("ATL-00012");
    expect(extractOrderCode("CK tiền hàng")).toBeNull();
  });

  it("sai key / thiếu cấu hình bị chặn", async () => {
    const spy = { paid: [] as string[] };
    const order = { code: "ATL-00012", total: 100_000, paymentStatus: "unpaid", paymentMethod: "bankTransfer" };
    expect((await handleSepayWebhook({ authorization: "Apikey SAI" }, { content: "ATL-00012", transferAmount: 100_000 }, storeOf(order, spy))).ok).toBe(false);
    delete process.env.SEPAY_API_KEY;
    expect((await handleSepayWebhook({ authorization: "Apikey TESTKEY" }, { content: "ATL-00012", transferAmount: 100_000 }, storeOf(order, spy))).ok).toBe(false);
    process.env.SEPAY_API_KEY = "TESTKEY";
  });

  it("đủ tiền → gạch paid; thiếu tiền / đã paid thì bỏ qua", async () => {
    const spy = { paid: [] as string[] };
    const order = { code: "ATL-00012", total: 100_000, paymentStatus: "unpaid", paymentMethod: "bankTransfer" };
    const ok = await handleSepayWebhook({ authorization: "Apikey TESTKEY" }, { content: "ATL-00012", transferAmount: 100_000 }, storeOf(order, spy));
    expect(ok.message).toMatch(/Đã gạch/);
    expect(spy.paid).toEqual(["ATL-00012"]);

    const short = await handleSepayWebhook({ authorization: "Apikey TESTKEY" }, { content: "ATL-00012", transferAmount: 10_000 }, storeOf(order, spy));
    expect(short.message).toMatch(/Bỏ qua/);
    const paid = await handleSepayWebhook({ authorization: "Apikey TESTKEY" }, { content: "ATL-00012", transferAmount: 100_000 }, storeOf({ ...order, paymentStatus: "paid" }, spy));
    expect(paid.message).toMatch(/đã paid/i);
    expect(spy.paid).toEqual(["ATL-00012"]);
  });
});
