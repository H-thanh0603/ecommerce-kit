"use client";

import { useState } from "react";
import Link from "next/link";
import { isEnabled } from "@/config/site";

type Msg = { role: "user" | "assistant"; content: string };

export default function AdminAgentPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  if (!isEnabled("aiAgent")) {
    return <p className="px-4 py-20 text-center">Module AI Agent đang tắt.</p>;
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setPending(true);
    const res = await fetch("/api/ai/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next }),
    });
    const data = await res.json();
    setMessages([...next, { role: "assistant", content: data.reply || data.message || "Lỗi" }]);
    setPending(false);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-primary">AI Agent cửa hàng</h1>
        <Link href="/admin" className="text-sm text-muted">
          ← Tổng quan
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted">
        Hỏi tồn kho, đơn hàng, nhờ viết mô tả sản phẩm. Cần XAI_API_KEY. Model: grok-4.6 (SpaceXAI).
      </p>
      <div className="mt-6 min-h-72 space-y-3 rounded-2xl border border-line bg-white p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted">Ví dụ: “Đơn mới nhất”, “Viết lại mô tả cho p1 rồi lưu”.</p>
        )}
        {messages.map((m, i) => (
          <p key={i} className={`text-sm ${m.role === "user" ? "font-medium" : "text-muted"}`}>
            {m.role === "user" ? "Bạn: " : "Agent: "}
            {m.content}
          </p>
        ))}
        {pending && <p className="text-sm text-muted">Đang xử lý…</p>}
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập lệnh…"
          className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm"
        />
        <button className="rounded-full bg-primary px-5 py-2.5 text-sm text-white">Gửi</button>
      </form>
    </div>
  );
}
