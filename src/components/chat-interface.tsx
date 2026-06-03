"use client";

import { useRef, useEffect, useState, useCallback, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { MessageRenderer } from "./message-renderer";

const EXAMPLE_URLS = [
  "https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580",
  "https://apps.apple.com/us/app/duolingo-language-lessons/id570060128",
  "https://apps.apple.com/us/app/notion-notes-docs-tasks/id1232780281",
];

export function ChatInterface() {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadingStartRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Elapsed timer — starts when loading begins, resets when it stops
  useEffect(() => {
    if (isLoading) {
      if (loadingStartRef.current === null) {
        loadingStartRef.current = Date.now();
        setElapsedSeconds(0);
      }
      const id = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - loadingStartRef.current!) / 1000));
      }, 1000);
      return () => clearInterval(id);
    } else {
      loadingStartRef.current = null;
      setElapsedSeconds(0);
    }
  }, [isLoading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isLoading) return;
      sendMessage({ text });
    },
    [isLoading, sendMessage]
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    handleSendMessage(text);
  }

  function handleExample(url: string) {
    setInput(url);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full px-4">
      {/* Header */}
      <header className="flex items-center gap-2 py-4 border-b border-zinc-800 flex-shrink-0">
        <Sparkles className="w-5 h-5 text-brand-400" />
        <span className="font-semibold text-zinc-100">ASO Audit Agent</span>
        <span className="text-xs text-zinc-600 ml-auto">
          Powered by GPT-4o + Firecrawl
        </span>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4 min-h-0">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                App Store Optimizer
              </h1>
              <p className="text-zinc-400 text-sm max-w-sm">
                Paste an Apple App Store URL to get a comprehensive ASO audit
                with scores, quick wins, and strategic recommendations.
              </p>
            </div>

            <div className="w-full max-w-sm space-y-2">
              <p className="text-xs text-zinc-600 text-left">Try an example:</p>
              {EXAMPLE_URLS.map((url) => (
                <button
                  key={url}
                  onClick={() => handleExample(url)}
                  className="w-full text-left text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-3 py-2 rounded-lg transition-colors truncate"
                >
                  {url}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, idx) => (
            <MessageRenderer
              key={message.id}
              message={message}
              isLast={idx === messages.length - 1}
              onSendMessage={handleSendMessage}
            />
          ))
        )}

        {/* Typing indicator — only when waiting for first assistant response token */}
        {isLoading &&
          (messages.length === 0 ||
            messages[messages.length - 1].role === "user") && (
            <div className="flex items-center gap-1.5 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl rounded-bl-sm w-fit">
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]" />
              {elapsedSeconds >= 3 && (
                <span className="text-xs text-zinc-600 tabular-nums ml-1">
                  {elapsedSeconds}s
                </span>
              )}
            </div>
          )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="py-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste an App Store URL or type a message…"
            disabled={isLoading}
            className={clsx(
              "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 pr-12",
              "text-sm text-zinc-100 placeholder:text-zinc-600",
              "focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/20",
              "disabled:opacity-50 transition-colors"
            )}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={clsx(
              "absolute right-2 top-1/2 -translate-y-1/2",
              "w-8 h-8 flex items-center justify-center rounded-lg",
              "transition-colors",
              input.trim() && !isLoading
                ? "bg-brand-600 hover:bg-brand-500 text-white"
                : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <p className="text-center text-xs text-zinc-700 mt-2">
          Audits consume Firecrawl credits. Each run makes ~5 scrape requests.
        </p>
      </div>
    </div>
  );
}
