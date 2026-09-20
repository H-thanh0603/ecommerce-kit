/**
 * Chỗ cắm cổng thanh toán.
 * COD / chuyển khoản có sẵn. MoMo, VNPay, ZaloPay: thêm adapter cùng chữ ký, đăng ký trong providers.
 */
export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed";

export type PaymentResult = {
  ok: boolean;
  paymentStatus: PaymentStatus;
  message: string;
};

export type PaymentProvider = {
  key: string;
  charge(order: { code: string; total: number }): Promise<PaymentResult>;
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
    async charge() {
      return { ok: false, paymentStatus: "failed", message: "Chưa gắn khóa MoMo — thêm adapter tại src/server/payments.ts" };
    },
  },
  vnpay: {
    key: "vnpay",
    async charge() {
      return { ok: false, paymentStatus: "failed", message: "Chưa gắn khóa VNPay — thêm adapter tại src/server/payments.ts" };
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

export async function processPayment(method: string, order: { code: string; total: number }) {
  const provider = getPaymentProvider(method);
  if (!provider) {
    return { ok: false, paymentStatus: "failed" as const, message: "Phương thức thanh toán không hỗ trợ" };
  }
  return provider.charge(order);
}
