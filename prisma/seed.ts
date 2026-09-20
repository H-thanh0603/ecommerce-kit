import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { articles, categories, coupons, orders, products, reviews } from "../src/data/catalog";
import { siteConfig } from "../src/config/site";

const prisma = new PrismaClient();

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.article.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();

  const adminHash = await bcrypt.hash(siteConfig.admin.password, 10);
  const admin = await prisma.user.create({
    data: {
      email: siteConfig.admin.email,
      name: "Quản trị",
      passwordHash: adminHash,
      role: "admin",
    },
  });

  const catRows = await Promise.all(
    categories.map((c) =>
      prisma.category.create({
        data: {
          id: c.id,
          slug: c.slug,
          name: c.name,
          description: c.description,
          image: c.image,
        },
      }),
    ),
  );
  const catBySlug = new Map(catRows.map((c) => [c.slug, c]));

  for (const p of products) {
    const cat = catBySlug.get(p.category);
    if (!cat) throw new Error(`Thiếu danh mục ${p.category}`);
    await prisma.product.create({
      data: {
        id: p.id,
        slug: p.slug,
        name: p.name,
        subtitle: p.subtitle || "",
        description: p.description,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        imagesJson: JSON.stringify(p.images),
        tagsJson: JSON.stringify(p.tags),
        variantsJson: JSON.stringify(p.variants || []),
        rating: p.rating,
        reviewCount: p.reviewCount,
        stock: p.stock,
        sold: p.sold,
        featured: Boolean(p.featured),
        flashSale: Boolean(p.flashSale),
        categoryId: cat.id,
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

  for (const c of coupons) {
    await prisma.coupon.create({ data: { code: c.code, type: c.type, value: c.value, minOrder: c.minOrder } });
  }

  for (const o of orders) {
    await prisma.order.create({
      data: {
        id: o.id,
        code: o.code,
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

  console.log("Seed xong. Admin:", siteConfig.admin.email, "/", siteConfig.admin.password);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
