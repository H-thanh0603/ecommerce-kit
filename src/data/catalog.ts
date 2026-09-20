import type { Article, Category, Order, Product, Review } from "@/types";

export const categories: Category[] = [
  {
    id: "cat-ao",
    slug: "thoi-trang",
    name: "Thời trang",
    description: "Trang phục mặc hàng ngày, chất liệu chọn lọc.",
    image:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80",
    productCount: 8,
  },
  {
    id: "cat-nha",
    slug: "nha-cua",
    name: "Nhà cửa",
    description: "Đồ dùng sống chậm cho căn hộ và studio.",
    image:
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80",
    productCount: 6,
  },
  {
    id: "cat-cham-soc",
    slug: "cham-soc",
    name: "Chăm sóc",
    description: "Chăm sóc da và cơ thể từ nguyên liệu tự nhiên.",
    image:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200&q=80",
    productCount: 4,
  },
  {
    id: "cat-qua",
    slug: "qua-tang",
    name: "Quà tặng",
    description: "Set quà đóng hộp sẵn, gửi được toàn quốc.",
    image:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1200&q=80",
    productCount: 3,
  },
];

export const products: Product[] = [
  {
    id: "p1",
    slug: "ao-linen-co-v",
    name: "Áo linen cổ V",
    subtitle: "Linen châu Âu, giặt mềm",
    description:
      "Áo linen dáng rộng, cổ V vừa phải. Vải linen châu Âu đã giặt mềm nên ít nhăn hơn linen thô. Phù hợp mặc đi làm hoặc cuối tuần. Nên giặt tay hoặc chế độ nhẹ, phơi bóng mát.",
    price: 490_000,
    compareAtPrice: 620_000,
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1400&q=80",
      "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1400&q=80",
    ],
    category: "thoi-trang",
    tags: ["linen", "basic", "mùa hè"],
    rating: 4.8,
    reviewCount: 126,
    stock: 34,
    sold: 412,
    featured: true,
    flashSale: true,
    variants: [
      { id: "size", name: "Size", options: ["S", "M", "L", "XL"] },
      { id: "color", name: "Màu", options: ["Kem", "Olive", "Đen"] },
    ],
  },
  {
    id: "p2",
    slug: "quan-au-ong-dung",
    name: "Quần âu ống đứng",
    subtitle: "Twill cotton, ly sẵn",
    description:
      "Quần âu ống đứng, ly nhẹ phía trước. Chất twill cotton dày vừa, đứng form. Có thể mặc với áo sơ mi hoặc áo thun.",
    price: 590_000,
    images: [
      "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1400&q=80",
    ],
    category: "thoi-trang",
    tags: ["công sở", "basic"],
    rating: 4.6,
    reviewCount: 84,
    stock: 21,
    sold: 198,
    featured: true,
    variants: [{ id: "size", name: "Size", options: ["28", "29", "30", "31", "32"] }],
  },
  {
    id: "p3",
    slug: "tui-canvas-thu-cong",
    name: "Túi canvas thủ công",
    subtitle: "May tại xưởng nhỏ Sài Gòn",
    description:
      "Túi tote canvas 16oz, may tăng cường đáy và quai. Ngăn trong có khoá. Phù hợp đi chợ, đi làm, đi cuối tuần.",
    price: 320_000,
    compareAtPrice: 380_000,
    images: [
      "https://images.unsplash.com/photo-1544816155-12df9643f363?w=1400&q=80",
    ],
    category: "thoi-trang",
    tags: ["phụ kiện", "thủ công"],
    rating: 4.9,
    reviewCount: 203,
    stock: 56,
    sold: 890,
    featured: true,
  },
  {
    id: "p4",
    slug: "den-ban-gom-su",
    name: "Đèn bàn gốm sứ",
    subtitle: "Đế gốm thủ công, chao vải",
    description:
      "Đèn bàn đế gốm men mát, chao vải linen. Bóng LED 4W ánh sáng ấm 2700K. Phù hợp bàn làm việc và góc đọc sách.",
    price: 780_000,
    images: [
      "https://images.unsplash.com/photo-1507473883501-cd55bddb7079?w=1400&q=80",
    ],
    category: "nha-cua",
    tags: ["nội thất", "ánh sáng"],
    rating: 4.7,
    reviewCount: 41,
    stock: 12,
    sold: 67,
    featured: true,
  },
  {
    id: "p5",
    slug: "bo-chen-gom-4",
    name: "Bộ chén gốm 4 cái",
    subtitle: "Men bóng, dung tích 150ml",
    description:
      "Bộ 4 chén gốm men bóng, vành hơi dày để cầm nóng. Dùng được lò vi sóng và máy rửa chén.",
    price: 360_000,
    images: [
      "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=1400&q=80",
    ],
    category: "nha-cua",
    tags: ["bàn ăn", "gốm"],
    rating: 4.5,
    reviewCount: 58,
    stock: 40,
    sold: 210,
    featured: true,
  },
  {
    id: "p6",
    slug: "nen-thom-go-dan-huong",
    name: "Nến thơm gỗ đàn hương",
    subtitle: "Sáp đậu nành, cháy 45 giờ",
    description:
      "Nến sáp đậu nành, tim cotton, hương gỗ đàn hương và vetiver. Cháy khoảng 45 giờ. Hũ thuỷ tinh tái sử dụng được.",
    price: 240_000,
    images: [
      "https://images.unsplash.com/photo-1602607383111-5d0c0c41b8c7?w=1400&q=80",
    ],
    category: "nha-cua",
    tags: ["hương", "thư giãn"],
    rating: 4.8,
    reviewCount: 177,
    stock: 73,
    sold: 640,
    flashSale: true,
  },
  {
    id: "p7",
    slug: "sua-rua-mat-tram-tra",
    name: "Sữa rửa mặt tràm trà",
    subtitle: "Dành cho da dầu, 150ml",
    description:
      "Sữa rửa mặt dịu, có tràm trà và kẽm PCA. Làm sạch mà không siết khô. Không chứa SLS.",
    price: 210_000,
    images: [
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=1400&q=80",
    ],
    category: "cham-soc",
    tags: ["skincare", "da dầu"],
    rating: 4.4,
    reviewCount: 92,
    stock: 88,
    sold: 330,
  },
  {
    id: "p8",
    slug: "dau-duong-toc-cam-gao",
    name: "Dầu dưỡng tóc cám gạo",
    subtitle: "50ml, không silicon",
    description:
      "Dầu dưỡng từ cám gạo và argan. Thoa 3–4 giọt lên tóc ướt hoặc khô. Mùi nhẹ, không bết.",
    price: 280_000,
    images: [
      "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=1400&q=80",
    ],
    category: "cham-soc",
    tags: ["tóc", "natural"],
    rating: 4.6,
    reviewCount: 61,
    stock: 25,
    sold: 144,
    featured: true,
  },
  {
    id: "p9",
    slug: "set-qua-chao-buoi-sang",
    name: "Set quà chào buổi sáng",
    subtitle: "Nến + trà + khăn linen",
    description:
      "Hộp quà gồm nến thơm mini, trà ô long 50g và khăn linen nhỏ. Kèm thiệp viết tay theo yêu cầu.",
    price: 450_000,
    compareAtPrice: 520_000,
    images: [
      "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=1400&q=80",
    ],
    category: "qua-tang",
    tags: ["set quà", "best seller"],
    rating: 5,
    reviewCount: 38,
    stock: 18,
    sold: 96,
    featured: true,
    flashSale: true,
  },
  {
    id: "p10",
    slug: "ao-somi-oxford",
    name: "Áo sơ mi Oxford",
    subtitle: "Cotton 100%, form regular",
    description:
      "Sơ mi Oxford dày vừa, cổ button-down. Form regular, dễ mặc với quần âu hoặc jeans.",
    price: 540_000,
    images: [
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1400&q=80",
    ],
    category: "thoi-trang",
    tags: ["công sở", "basic"],
    rating: 4.5,
    reviewCount: 73,
    stock: 29,
    sold: 188,
  },
  {
    id: "p11",
    slug: "tham-len-nho",
    name: "Thảm len nhỏ 80x120",
    subtitle: "Len cừu, dệt tay",
    description:
      "Thảm len dệt tay, kích thước 80x120cm. Phù hợp góc đọc sách hoặc cuối giường.",
    price: 1_290_000,
    images: [
      "https://images.unsplash.com/photo-1600166898405-89c0d8888350?w=1400&q=80",
    ],
    category: "nha-cua",
    tags: ["nội thất"],
    rating: 4.7,
    reviewCount: 19,
    stock: 7,
    sold: 22,
  },
  {
    id: "p12",
    slug: "hop-xa-phong-thao-moc",
    name: "Hộp xà phòng thảo mộc",
    subtitle: "3 bánh, hương sả chanh",
    description:
      "Ba bánh xà phòng thủ công hương sả chanh và bạc hà. Dùng được mặt và cơ thể.",
    price: 165_000,
    images: [
      "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=1400&q=80",
    ],
    category: "cham-soc",
    tags: ["gift", "natural"],
    rating: 4.3,
    reviewCount: 44,
    stock: 60,
    sold: 201,
  },
];

export const reviews: Review[] = [
  {
    id: "r1",
    productId: "p1",
    author: "Minh Anh",
    rating: 5,
    content: "Vải mát, form đẹp. Mình lấy size M hơi rộng một chút nhưng mặc rất thoải mái.",
    createdAt: "2026-08-12",
  },
  {
    id: "r2",
    productId: "p1",
    author: "Hải Đăng",
    rating: 4,
    content: "Đường may chắc. Linen vẫn nhăn đúng chất linen, nên giặt và phơi đúng hướng dẫn.",
    createdAt: "2026-07-02",
  },
  {
    id: "r3",
    productId: "p9",
    author: "Thuỳ Dương",
    rating: 5,
    content: "Gói quà đẹp, gửi biếu sếp rất ổn. Có thiệp viết tay là điểm cộng.",
    createdAt: "2026-09-01",
  },
];

export const articles: Article[] = [
  {
    id: "a1",
    slug: "cach-chon-linen-cho-khi-hau-viet-nam",
    title: "Cách chọn linen cho khí hậu Việt Nam",
    excerpt:
      "Linen dày hay mỏng, giặt mềm hay thô — và vì sao không phải chiếc áo linen nào cũng mặc được cả ngày ở Sài Gòn.",
    cover:
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1400&q=80",
    date: "12.09.2026",
    minutes: 6,
  },
  {
    id: "a2",
    slug: "goc-nho-trong-can-ho",
    title: "Bốn góc nhỏ làm căn hộ trông rộng hơn",
    excerpt:
      "Đèn ấm, thảm nhỏ, một bộ chén đẹp — những thứ không chiếm mét vuông nhưng đổi không khí cả phòng.",
    cover:
      "https://images.unsplash.com/photo-1618220179428-22790b461013?w=1400&q=80",
    date: "28.08.2026",
    minutes: 5,
  },
  {
    id: "a3",
    slug: "goi-qua-khong-pha-sinh-thai",
    title: "Gói quà mà không phá sinh thái",
    excerpt:
      "Giấy kraft, ruy băng vải, hộp dùng lại được. Cách gói đơn giản khách vẫn thấy chỉn chu.",
    cover:
      "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=1400&q=80",
    date: "04.08.2026",
    minutes: 4,
  },
];

export const orders: Order[] = [
  {
    id: "o1",
    code: "ATL-24091",
    customer: "Nguyễn Lan",
    email: "lan@email.com",
    phone: "0908123456",
    address: "22 Lê Lợi, Q.1, TP.HCM",
    items: [
      {
        productId: "p1",
        slug: "ao-linen-co-v",
        name: "Áo linen cổ V",
        image: products[0].images[0],
        price: 490_000,
        quantity: 1,
        variantLabel: "M / Olive",
      },
    ],
    subtotal: 490_000,
    shippingFee: 0,
    discount: 0,
    total: 490_000,
    paymentMethod: "cod",
    status: "shipping",
    createdAt: "2026-09-18",
  },
  {
    id: "o2",
    code: "ATL-24088",
    customer: "Trần Khoa",
    email: "khoa@email.com",
    phone: "0912333444",
    address: "8 Trần Phú, Hải Châu, Đà Nẵng",
    items: [
      {
        productId: "p9",
        slug: "set-qua-chao-buoi-sang",
        name: "Set quà chào buổi sáng",
        image: products[8].images[0],
        price: 450_000,
        quantity: 2,
      },
    ],
    subtotal: 900_000,
    shippingFee: 0,
    discount: 50_000,
    total: 850_000,
    paymentMethod: "bankTransfer",
    status: "completed",
    createdAt: "2026-09-16",
  },
  {
    id: "o3",
    code: "ATL-24085",
    customer: "Phạm Hà",
    email: "ha@email.com",
    phone: "0987666555",
    address: "15 Hoàng Diệu, Ba Đình, Hà Nội",
    items: [
      {
        productId: "p6",
        slug: "nen-thom-go-dan-huong",
        name: "Nến thơm gỗ đàn hương",
        image: products[5].images[0],
        price: 240_000,
        quantity: 1,
      },
    ],
    subtotal: 240_000,
    shippingFee: 30_000,
    discount: 0,
    total: 270_000,
    paymentMethod: "cod",
    status: "pending",
    createdAt: "2026-09-19",
  },
];

export const coupons = [
  { code: "WELCOME10", type: "percent" as const, value: 10, minOrder: 300_000 },
  { code: "FREESHIP", type: "shipping" as const, value: 0, minOrder: 0 },
  { code: "GIAM50K", type: "fixed" as const, value: 50_000, minOrder: 500_000 },
];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(slug: string) {
  return products.filter((p) => p.category === slug);
}

export function searchProducts(q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return products;
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(s) ||
      p.tags.some((t) => t.toLowerCase().includes(s)) ||
      p.description.toLowerCase().includes(s),
  );
}

export function relatedProducts(product: Product, limit = 4) {
  return products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, limit);
}
