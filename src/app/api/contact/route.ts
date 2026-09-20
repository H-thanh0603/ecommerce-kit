import { NextResponse } from "next/server";
import { createLead } from "@/server/commerce";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const message = String(body.message || "").trim();
  if (!name || !email || !message) {
    return NextResponse.json({ message: "Điền tên, email và nội dung" }, { status: 400 });
  }
  await createLead({ name, email, phone: String(body.phone || ""), message });
  return NextResponse.json({ ok: true });
}
