import { NextResponse } from "next/server";
import { issueInvoice, listInvoices } from "@/server/invoice";
import { requireAdmin } from "@/server/auth";
import { isEnabled } from "@/config/site";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần admin" }, { status: 401 });
  return NextResponse.json({ invoices: await listInvoices() });
}

export async function POST(req: Request) {
  if (!isEnabled("invoices")) return NextResponse.json({ message: "Tắt" }, { status: 404 });
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần admin" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const invoice = await issueInvoice(String(body.orderId || ""), String(body.buyerTax || ""));
    return NextResponse.json({ invoice });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Lỗi" }, { status: 400 });
  }
}
