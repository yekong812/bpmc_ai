"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CATEGORY_LABELS, type DocumentCategory } from "@/types/document";

interface ChatSource {
  documentId: number;
  title: string;
  category: DocumentCategory;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  error?: boolean;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "안녕하세요. 주보·수련회·청년부·행사 정보를 안내해 드립니다. 궁금한 점을 물어보세요.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!question || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: question,
    };
    const assistantId = createId();

    setInput("");
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: "assistant", content: "", sources: [] },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, stream: true }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "답변 생성에 실패했습니다.");
      }

      if (!response.body) {
        throw new Error("응답 스트림을 받지 못했습니다.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part
            .split("\n")
            .map((item) => item.trim())
            .find((item) => item.startsWith("data:"));
          if (!line) {
            continue;
          }

          const jsonText = line.replace(/^data:\s*/, "");
          const event = JSON.parse(jsonText) as
            | { type: "sources"; sources: ChatSource[] }
            | { type: "token"; text: string }
            | { type: "done" };

          if (event.type === "sources") {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? { ...message, sources: event.sources }
                  : message,
              ),
            );
          }

          if (event.type === "token") {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? { ...message, content: `${message.content}${event.text}` }
                  : message,
              ),
            );
          }
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "일시적인 오류가 발생했습니다.";
      setMessages((prev) =>
        prev.map((item) =>
          item.id === assistantId
            ? { ...item, content: message, error: true, sources: [] }
            : item,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              부평감리교회
            </p>
            <h1 className="text-lg font-semibold text-slate-900">AI 안내</h1>
          </div>
          <a
            href="/admin"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            관리자
          </a>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-slate-900 text-white"
                    : message.error
                      ? "bg-red-50 text-red-700"
                      : "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
                }`}
              >
                <p className="whitespace-pre-wrap">
                  {message.content || (loading ? "답변 준비 중..." : "")}
                </p>
                {message.sources && message.sources.length > 0 ? (
                  <div className="mt-3 border-t border-slate-100 pt-2">
                    <p className="text-xs font-medium text-slate-500">근거 문서</p>
                    <ul className="mt-1 space-y-1">
                      {message.sources.map((source) => (
                        <li key={source.documentId} className="text-xs text-slate-600">
                          {source.title}
                          <span className="text-slate-400">
                            {" "}
                            · {CATEGORY_LABELS[source.category]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-slate-200 bg-white px-4 py-3"
        >
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="예: 올해 하계수련회 준비물이 뭐야?"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "..." : "전송"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
