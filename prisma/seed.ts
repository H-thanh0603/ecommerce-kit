import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { articles, categories, coupons, orders, products, reviews } from "../src/data/catalog";

const prisma = new PrismaClient();

function cartesian(groups: { options: string[] }[]) {
  if (!groups.length) return [] as string[];
  return groups
    .reduce<string[][]>((acc, g) => {
      if (!acc.length) return g.options.map((o) => [o]);
      return acc.flatMap((prefix) => g.options.map((o) => [...prefix, o]));
    }, [])
    .map((p) => p.join(" / "));
}

async function main() {
  await prisma.couponRedemption.deleteMany();
  await prisma.cartLine.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.mailLog.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.sku.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.article.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.newsletter.deleteMany();
  await prisma.orderCounter.deleteMany();
  await prisma.user.deleteMany();

  const adminEmail = process.env.ADMIN_EMAIL || "admin@atelier.vn";
  const adminPass = process.env.ADMIN_PASSWORD || "admin123";
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: "Quản trị",
      passwordHash: await bcrypt.hash(adminPass, 10),
      role: "admin",
    },
  });

  const catRows = await Promise.all(
    categories.map((c) =>
      prisma.category.create({
        data: { id: c.id, slug: c.slug, name: c.name, description: c.description, image: c.image },
      }),
    ),
  );
  const catBySlug = new Map(catRows.map((c) => [c.slug, c]));

  const now = new Date();
  const flashEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  for (const p of products) {
    const cat = catBySlug.get(p.category);
    if (!cat) throw new Error(`Thiếu danh mục ${p.category}`);
    const labels = cartesian(p.variants || []);
    const per = labels.length ? Math.max(2, Math.floor(p.stock / labels.length)) : p.stock;
    await prisma.product.create({
      data: {
        id: p.id,
        slug: p.slug,
        name: p.name,
        subtitle: p.subtitle || "",
        description: p.description,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        tags: p.tags.join(","),
        optionsJson: JSON.stringify(p.variants || []),
        rating: p.rating,
        reviewCount: p.reviewCount,
        stock: p.stock,
        sold: p.sold,
        featured: Boolean(p.featured),
        flashSale: Boolean(p.flashSale),
        flashSaleStartsAt: p.flashSale ? new Date(now.getTime() - 86400000) : null,
        flashSaleEndsAt: p.flashSale ? flashEnd : null,
        categoryId: cat.id,
        images: { create: p.images.map((url, sort) => ({ url, sort })) },
        skus: labels.length
          ? { create: labels.map((label) => ({ label, stock: per })) }
          : undefined,
      },
    });
  }

  for (const r of reviews) {
    await prisma.review.create({
      data: {
        id: r.id,
        productId: r.productId,
        author: r.author,
        rating: r.rating,
        content: r.content,
        createdAt: new Date(r.createdAt),
      },
    });
  }

  for (const a of articles) {
    await prisma.article.create({
      data: {
        id: a.id,
        slug: a.slug,
        title: a.title,
        excerpt: a.excerpt,
        cover: a.cover,
        date: a.date,
        minutes: a.minutes,
        body: a.excerpt,
      },
    });
  }

  const ends = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  for (const c of coupons) {
    await prisma.coupon.create({
      data: {
        code: c.code,
        type: c.type,
        value: c.value,
        minOrder: c.minOrder,
        maxUses: c.code === "WELCOME10" ? 200 : null,
        maxUsesPerUser: c.code === "WELCOME10" ? 1 : null,
        endsAt: c.code === "GIAM50K" ? ends : null,
      },
    });
  }

  let seq = 0;
  for (const o of orders) {
    seq += 1;
    await prisma.order.create({
      data: {
        id: o.id,
        code: o.code,
        seq,
        userId: o.email === admin.email ? admin.id : null,
        customer: o.customer,
        email: o.email,
        phone: o.phone,
        address: o.address,
        note: o.note || "",
        subtotal: o.subtotal,
        shippingFee: o.shippingFee,
        discount: o.discount,
        total: o.total,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.status === "completed" ? "paid" : "unpaid",
        status: o.status,
        createdAt: new Date(o.createdAt),
        items: {
          create: o.items.map((i) => ({
            productId: i.productId,
            slug: i.slug,
            name: i.name,
            image: i.image,
            price: i.price,
            quantity: i.quantity,
            variantLabel: i.variantLabel || "",
          })),
        },
      },
    });
  }
  await prisma.orderCounter.create({ data: { id: "order", value: seq } });

  console.log("Seed xong. Admin:", adminEmail, "/", adminPass);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
