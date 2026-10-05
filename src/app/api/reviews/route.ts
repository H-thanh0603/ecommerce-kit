import { NextResponse } from "next/server";
import { addReview } from "@/server/commerce";
import { getSession } from "@/server/auth";
import { isFeatureOn } from "@/server/settings";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { withTenantHandler } from "@/server/request-tenant";
import { reviewSchema } from "@/lib/validators";

async function postHandler(req: Request) {
  if (!(await isFeatureOn("reviews"))) return NextResponse.json({ message: "Đang tắt" }, { status: 404 });
  if (!(await rateLimit(clientKey(req, "review"), 10, 60_000)).ok) {
    return NextResponse.json({ message: "Thử lại sau" }, { status: 429 });
  }
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Đăng nhập để đánh giá" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  try {
    const review = await addReview({
      productId: parsed.data.productId,
      userId: session.id,
      author: session.name,
      rating: parsed.data.rating,
      content: parsed.data.content,
    });
    return NextResponse.json({ review });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Lỗi" }, { status: 400 });
  }
}

export const POST = withTenantHandler(postHandler);
