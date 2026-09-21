/**
 * Chỗ cắm cổng thanh toán.
 * COD / chuyển khoản có sẵn. MoMo, VNPay, ZaloPay: thêm adapter cùng chữ ký, đăng ký trong providers.
 */
export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed";

export type PaymentResult = {
  ok: boolean;
  paymentStatus: PaymentStatus;
  message: string;
  payUrl?: string;
};

export type PaymentProvider = {
  key: string;
  charge(order: { code: string; total: number; ip?: string }): Promise<PaymentResult>;
};

const cod: PaymentProvider = {
  key: "cod",
  async charge() {
    return { ok: true, paymentStatus: "unpaid", message: "Thanh toán khi nhận hàng" };
  },
};

const bankTransfer: PaymentProvider = {
  key: "bankTransfer",
  async charge() {
    return { ok: true, paymentStatus: "unpaid", message: "Chờ đối soát chuyển khoản" };
  },
};

const stubs: Record<string, PaymentProvider> = {
  momo: {
    key: "momo",
    async charge(order) {
      const { buildMomoPayUrl } = await import("@/server/momo");
      const r = await buildMomoPayUrl(order);
      if (!r.ok) return { ok: false, paymentStatus: "failed", message: r.message };
      return { ok: true, paymentStatus: "pending", message: r.message, payUrl: r.payUrl };
    },
  },
  vnpay: {
    key: "vnpay",
    async charge(order) {
      const { buildVnpayUrl, vnpayConfigured } = await import("@/server/vnpay");
      if (!vnpayConfigured()) {
        return { ok: false, paymentStatus: "failed", message: "Chưa có VNPAY_TMN_CODE / VNPAY_HASH_SECRET" };
      }
      return {
        ok: true,
        paymentStatus: "pending",
        message: "Chuyển cổng VNPay",
        payUrl: buildVnpayUrl(order, order.ip),
      };
    },
  },
  zalopay: {
    key: "zalopay",
    async charge() {
      return { ok: false, paymentStatus: "failed", message: "Chưa gắn khóa ZaloPay — thêm adapter tại src/server/payments.ts" };
    },
  },
};

const providers: Record<string, PaymentProvider> = {
  cod,
  bankTransfer,
  ...stubs,
};

export function getPaymentProvider(key: string) {
  return providers[key];
}

export async function processPayment(method: string, order: { code: string; total: number; ip?: string }) {
  const provider = getPaymentProvider(method);
  if (!provider) {
    return { ok: false, paymentStatus: "failed" as const, message: "Phương thức thanh toán không hỗ trợ" };
  }
  return provider.charge(order);
}
