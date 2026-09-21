import { NextResponse } from "next/server";
import { isEnabled } from "@/config/site";
import { aiConfigured, shopChat } from "@/server/ai";
import { clientKey, rateLimit } from "@/server/rate-limit";

export async function POST(req: Request) {
  if (!(await rateLimit(clientKey(req, "ai-chat"), 20, 60_000)).ok) {
    return NextResponse.json({ message: "Thử lại sau" }, { status: 429 });
  }
  if (!isEnabled("aiChatbot")) {
    return NextResponse.json({ message: "Chatbot đang tắt" }, { status: 404 });
  }
  if (!aiConfigured()) {
    return NextResponse.json(
      { message: "Chưa cấu hình XAI_API_KEY. Thêm key SpaceXAI vào .env để bật chatbot." },
      { status: 503 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const messages = Array.isArray(body.messages) ? body.messages : [];
  try {
    const reply = await shopChat(messages);
    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Lỗi AI" }, { status: 500 });
  }
}
