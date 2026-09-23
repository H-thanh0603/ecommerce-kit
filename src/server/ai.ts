import OpenAI from "openai";
import { siteConfig } from "@/config/site";
import { getOrderByCode, getProductById, listOrders, listProducts } from "@/server/commerce";

const MODEL = "grok-4.6";

export function aiConfigured() {
  return Boolean(process.env.XAI_API_KEY);
}

function client() {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error("Chưa có XAI_API_KEY. Tạo key tại https://console.x.ai rồi thêm vào .env");
  return new OpenAI({ apiKey: key, baseURL: "https://api.x.ai/v1", timeout: 30_000, maxRetries: 1 });
}

type ChatMsg = { role: "user" | "assistant"; content: string };

const MAX_MSGS = 20;
const MAX_CONTENT = 4_000;
const MAX_TOKENS = 600;

/** Chuẩn hóa messages từ client: chỉ role hợp lệ, cắt số lượng + độ dài. */
export function sanitizeChatMessages(raw: unknown): ChatMsg[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-MAX_MSGS)
    .map((m) => {
      const role = m && typeof m === "object" ? String((m as { role?: unknown }).role || "") : "";
      const content = m && typeof m === "object" ? String((m as { content?: unknown }).content || "") : "";
      if (role !== "user" && role !== "assistant") return null;
      if (!content.trim()) return null;
      return { role, content: content.slice(0, MAX_CONTENT) } satisfies ChatMsg;
    })
    .filter((m): m is ChatMsg => m !== null);
}

export async function shopChat(messages: ChatMsg[]) {
  const clean = sanitizeChatMessages(messages);
  if (!clean.length) return "Bạn chưa gửi câu hỏi — thử hỏi size, giá hoặc còn hàng nhé.";
  const products = (await listProducts({ pageSize: 20 })).items;
  const catalog = products
    .map((p) => `- ${p.name} (${p.slug}): ${p.price}đ, còn ${p.stock}`)
    .join("\n");

  const openai = client();
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role: "system",
        content:
          `Bạn là trợ lý bán hàng của ${siteConfig.brand.name}. Trả lời tiếng Việt, ngắn, lịch sự. ` +
          `Chỉ tư vấn sản phẩm trong catalog. Không bịa giá. Gợi ý liên hệ ${siteConfig.brand.hotline} khi cần người thật.\n\n` +
          `Catalog:\n${catalog || "(trống)"}`,
      },
      ...clean,
    ],
  });
  return response.choices[0]?.message?.content?.trim() || "Xin lỗi, mình chưa trả lời được.";
}

const agentTools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_products",
      description: "Liệt kê sản phẩm đang bán",
      parameters: { type: "object", properties: { q: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order",
      description: "Xem đơn theo mã (ATL-xxxxx)",
      parameters: { type: "object", properties: { code: { type: "string" } }, required: ["code"] },
    },
  },
  {
    type: "function",
    function: {
      name: "recent_orders",
      description: "Đơn mới nhất",
      parameters: { type: "object", properties: { limit: { type: "number" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_product_copy",
      description: "Viết mô tả bán hàng cho sản phẩm theo id, chưa lưu DB",
      parameters: { type: "object", properties: { productId: { type: "string" } }, required: ["productId"] },
    },
  },
];

async function runTool(name: string, argsJson: string) {
  const args = argsJson ? JSON.parse(argsJson) : {};
  if (name === "list_products") {
    const list = (await listProducts({ q: args.q, pageSize: 15 })).items;
    return JSON.stringify(
      list.map((p) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock, slug: p.slug })),
    );
  }
  if (name === "get_order") {
    const order = await getOrderByCode(String(args.code || ""));
    return order ? JSON.stringify(order) : "Không tìm thấy đơn";
  }
  if (name === "recent_orders") {
    const orders = await listOrders();
    return JSON.stringify(orders.slice(0, Number(args.limit) || 8));
  }
  if (name === "draft_product_copy") {
    const p = await getProductById(String(args.productId));
    if (!p) return "Không tìm thấy sản phẩm";
    const openai = client();
    const drafted = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Viết mô tả bán hàng tiếng Việt (80-120 từ) cho: ${p.name}. Phụ đề: ${p.subtitle || ""}. Mô tả cũ: ${p.description.slice(0, 1000)}`,
        },
      ],
    });
    return drafted.choices[0]?.message?.content || "";
  }
  return "Công cụ không hỗ trợ — ghi mô tả phải bấm xác nhận trên UI, không tự lưu.";
}

export async function runStoreAgent(messages: ChatMsg[]) {
  const clean = sanitizeChatMessages(messages);
  if (!clean.length) return "Chưa có đầu vào — hãy mô tả tác vụ.";
  const openai = client();
  const chat: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        `Bạn là AI Agent vận hành cửa hàng ${siteConfig.brand.name}. Tiếng Việt. ` +
        `Dùng tool khi cần dữ liệu thật. Không bịa mã đơn hay tồn kho. ` +
        `Không tự ghi DB. Nếu soạn mô tả, trả về text để người quản trị bấm lưu.`,
    },
    ...clean,
  ];

  for (let i = 0; i < 6; i++) {
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: chat,
      tools: agentTools,
    });
    const msg = response.choices[0]?.message;
    if (!msg) return "Không có phản hồi.";
    if (!msg.tool_calls?.length) return msg.content?.trim() || "Đã xong.";
    chat.push(msg);
    for (const call of msg.tool_calls) {
      if (call.type !== "function") continue;
      chat.push({
        role: "tool",
        tool_call_id: call.id,
        content: await runTool(call.function.name, call.function.arguments),
      });
    }
  }
  return "Tác vụ quá nhiều bước — thử thu hẹp câu hỏi.";
}
