import { NextResponse } from "next/server";
import { isEnabled } from "@/config/site";
import { requireAdmin } from "@/server/auth";
import { aiConfigured, runStoreAgent } from "@/server/ai";
import { clientKey, rateLimit } from "@/server/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "ai-agent"), 20, 60_000).ok) {
    return NextResponse.json({ message: "Thử lại sau" }, { status: 429 });
  }
  if (!isEnabled("aiAgent")) {
    return NextResponse.json({ message: "AI Agent đang tắt" }, { status: 404 });
  }
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 401 });
  if (!aiConfigured()) {
    return NextResponse.json(
      { message: "Chưa cấu hình XAI_API_KEY. Thêm key SpaceXAI vào .env để bật agent." },
      { status: 503 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const messages = Array.isArray(body.messages) ? body.messages : [];
  try {
    const reply = await runStoreAgent(messages);
    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Lỗi AI" }, { status: 500 });
  }
}
