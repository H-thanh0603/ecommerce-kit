import { NextResponse } from "next/server";
import { isEnabled } from "@/config/site";
import { aiConfigured, shopChat } from "@/server/ai";
import { clientKey, rateLimit } from "@/server/rate-limit";

export async function POST(req: Request) {
  if (!(await rateLimit(clientKey(req, "ai-chat"), 20, 60_000)).ok) {
    return NextResponse.json({ message: "Thử lại sau" }, { status: 429 });
  }
  // Quota theo ngày cho mỗi client (chatbot công khai tốn token XAI).
  if (!(await rateLimit(clientKey(req, "ai-chat-day"), 40, 24 * 60 * 60_000)).ok) {
    return NextResponse.json({ message: "Đã hết hạn mức chat hôm nay" }, { status: 429 });
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
  try {
    const reply = await shopChat(body.messages);
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("[ai/chat]", e instanceof Error ? e.message : e);
    return NextResponse.json({ message: "Lỗi AI — thử lại sau" }, { status: 500 });
  }
}
