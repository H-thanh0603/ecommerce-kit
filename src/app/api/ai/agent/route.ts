import { NextResponse } from "next/server";
import { isEnabled } from "@/config/site";
import { requireAdmin } from "@/server/auth";
import { aiConfigured, runStoreAgent } from "@/server/ai";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { withTenantHandler } from "@/server/request-tenant";

async function postHandler(req: Request) {
  if (!(await rateLimit(clientKey(req, "ai-agent"), 20, 60_000)).ok) {
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
  try {
    const reply = await runStoreAgent(body.messages);
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("[ai/agent]", e instanceof Error ? e.message : e);
    return NextResponse.json({ message: "Lỗi AI — thử lại sau" }, { status: 500 });
  }
}

export const POST = withTenantHandler(postHandler);
