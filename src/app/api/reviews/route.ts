import { NextResponse } from "next/server";
import { addReview } from "@/server/commerce";
import { getSession } from "@/server/auth";
import { isFeatureOn } from "@/server/settings";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { withTenantHandler } from "@/server/request-tenant";

async function postHandler(req: Request) {
  if (!(await isFeatureOn("reviews"))) return NextResponse.json({ message: "Đang tắt" }, { status: 404 });
  if (!(await rateLimit(clientKey(req, "review"), 10, 60_000)).ok) {
    return NextResponse.json({ message: "Thử lại sau" }, { status: 429 });
  }
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Đăng nhập để đánh giá" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const review = await addReview({
      productId: String(body.productId || ""),
      userId: session.id,
      author: session.name,
      rating: Number(body.rating),
      content: String(body.content || ""),
    });
    return NextResponse.json({ review });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Lỗi" }, { status: 400 });
  }
}

export const POST = withTenantHandler(postHandler);
