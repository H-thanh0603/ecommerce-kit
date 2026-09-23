import { NextResponse } from "next/server";
import { createLead } from "@/server/commerce";
import { clientKey, rateLimit } from "@/server/rate-limit";

export async function POST(req: Request) {
  if (!(await rateLimit(clientKey(req, "contact"), 5, 600_000)).ok) {
    return NextResponse.json({ message: "Thử lại sau" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const message = String(body.message || "").trim();
  if (!name || !email || !message) {
    return NextResponse.json({ message: "Điền tên, email và nội dung" }, { status: 400 });
  }
  await createLead({ name, email, phone: String(body.phone || ""), message });
  // Báo admin có lead mới — best-effort, lỗi mail không chặn submit.
  const { sendMail } = await import("@/server/mail");
  const admin = process.env.ADMIN_EMAIL;
  if (admin) {
    void sendMail(
      admin,
      `[Liên hệ] ${name}`,
      `${email}${body.phone ? ` · ${body.phone}` : ""}\n\n${message.slice(0, 2000)}`,
    ).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
