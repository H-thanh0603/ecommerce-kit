import { describe, expect, it } from "vitest";
import { prisma } from "./db";
import { addReview, approveReview, deleteReview, getProductBySlug, listPendingReviews } from "./catalog";

describe("review moderation", () => {
  it("mới tạo ở pending, ẩn khỏi trang SP, duyệt xong mới hiện", async () => {
    const slug = "dau-duong-toc-cam-gao";
    const r = await addReview({ productId: "p8", author: "Kiểm duyệt", rating: 5, content: `Hay ${Date.now()}` });
    expect(r.id).toBeTruthy();
    const row = await prisma.review.findUnique({ where: { id: r.id } });
    expect(row?.status).toBe("pending");

    const before = await getProductBySlug(slug);
    expect(before?.reviews.some((x) => x.id === r.id)).toBe(false);
    expect((await listPendingReviews()).some((x) => x.id === r.id)).toBe(true);

    await approveReview(r.id);
    const after = await getProductBySlug(slug);
    expect(after?.reviews.some((x) => x.id === r.id)).toBe(true);
    expect((await listPendingReviews()).some((x) => x.id === r.id)).toBe(false);

    await deleteReview(r.id);
    expect(await prisma.review.findUnique({ where: { id: r.id } })).toBeNull();
  });
});
