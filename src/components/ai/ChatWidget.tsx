"use client";

import { useState } from "react";
import { isEnabled, siteConfig } from "@/config/site";
import { IconClose } from "@/components/icons";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  if (!isEnabled("aiChatbot")) return null;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setPending(true);
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next }),
    });
    const data = await res.json();
    setMessages([...next, { role: "assistant", content: data.reply || data.message || "Lỗi" }]);
    setPending(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-3 flex h-[28rem] w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
            <p className="text-sm font-medium">Hỏi {siteConfig.brand.name}</p>
            <button onClick={() => setOpen(false)} aria-label="Đóng">
              <IconClose className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {messages.length === 0 && (
              <p className="text-muted">Hỏi size, giá, còn hàng… Cần XAI_API_KEY để trả lời.</p>
            )}
            {messages.map((m, i) => (
              <p key={i} className={m.role === "user" ? "text-right font-medium" : "text-muted"}>
                {m.content}
              </p>
            ))}
            {pending && <p className="text-muted">Đang soạn…</p>}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-line p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhắn tin…"
              className="flex-1 rounded-full border border-line px-3 py-2 text-sm"
            />
            <button className="rounded-full bg-primary px-3 py-2 text-xs text-white">Gửi</button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-primary px-4 py-3 text-sm text-white shadow-lg"
      >
        Chat AI
      </button>
    </div>
  );
}
