import { z } from "zod";

/**
 * Schema dùng chung client + server: server validate trước khi ghi DB,
 * client (GĐ 4.2) import cùng schema để hiện lỗi tiếng Việt ngắn dưới field.
 * Giữ ràng buộc KHỚP với những gì server đã check tay trước đây — không siết thêm
 * để không vỡ e2e/flow hiện tại (VD: phone nhận 8–15 ký tự số/dấu, không bắt buộc đầu số 0).
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^\+?[0-9\s.-]{8,15}$/;

const emailField = z.string().trim().max(120).regex(EMAIL_RE, "Email không hợp lệ");
const phoneField = z.string().trim().regex(PHONE_RE, "Số điện thoại không hợp lệ");

/** POST /api/reviews */
export const reviewSchema = z.object({
  productId: z.string().trim().min(1),
  rating: z.coerce.number().int("Điểm phải là số nguyên").min(1, "Điểm 1–5").max(5, "Điểm 1–5"),
  content: z.string().trim().min(1, "Nhập nội dung").max(2000, "Tối đa 2000 ký tự"),
});

/** POST /api/bookings */
export const bookingSchema = z.object({
  serviceId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80),
  email: emailField,
  phone: phoneField,
  startsAt: z
    .string()
    .refine((s) => !Number.isNaN(new Date(s).getTime()), "Thời gian không hợp lệ")
    .refine((s) => new Date(s).getTime() > Date.now(), "Chọn thời gian trong tương lai"),
  note: z.string().trim().max(500).optional(),
});

/** POST /api/addresses */
export const addressSchema = z.object({
  label: z.string().trim().max(20).optional(),
  name: z.string().trim().min(1, "Thiếu tên").max(80),
  phone: phoneField,
  address: z.string().trim().min(1, "Thiếu địa chỉ").max(300),
  isDefault: z.boolean().optional(),
});

/** Chuỗi rỗng/null → null (form admin gửi ""), số khác phải nguyên dương. */
const nullableInt = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.coerce.number().int().min(1).nullable(),
);

/** POST /api/coupons/admin — value/minOrder đều không âm, type whitelist. */
export const couponAdminSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(1).max(40),
  type: z.enum(["percent", "amount"]),
  value: z.coerce.number().min(0, "Giá trị không âm"),
  minOrder: z.coerce.number().min(0).default(0),
  active: z.boolean().default(true),
  maxUses: nullableInt,
  maxUsesPerUser: nullableInt,
  endsAt: z
    .string()
    .refine((s) => !Number.isNaN(new Date(s).getTime()), "Ngày hết hạn không hợp lệ")
    .optional(),
});

/** Webhook URL — chặn scheme lạ trước khi dispatch/ping ra ngoài (SSRF). */
export const webhookUrlSchema = z
  .string()
  .trim()
  .url("URL không hợp lệ")
  .refine((u) => /^https?:$/.test(new URL(u).protocol), "Chỉ nhận http(s)");

/** Client-side form checkout (server /api/orders đã có checkoutSchema riêng). */
export const checkoutFormSchema = z.object({
  name: z.string().trim().min(1, "Nhập họ tên").max(80),
  phone: phoneField,
  email: emailField,
  address: z.string().trim().min(6, "Địa chỉ quá ngắn").max(300),
});

/** Client-side form đăng ký (server auth.ts đã check 6–72 ký tự). */
export const registerFormSchema = z.object({
  name: z.string().trim().min(1, "Nhập họ tên").max(80),
  email: emailField,
  password: z.string().min(6, "Tối thiểu 6 ký tự").max(72),
});

/** Trả object { field: message } để form hiện lỗi dưới input. */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
