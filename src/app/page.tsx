"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ModelKey = "openai" | "anthropic" | "google" | "cohere";

type NdjsonEvent = {
  model: ModelKey;
  type: "start" | "delta" | "end" | "error";
  text?: string;
  error?: string;
};

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Record<ModelKey, string>>({
    openai: "",
    anthropic: "",
    google: "",
    cohere: "",
  });
  const [errors, setErrors] = useState<Record<ModelKey, string | null>>({
    openai: null,
    anthropic: null,
    google: null,
    cohere: null,
  });

  const controllerRef = useRef<AbortController | null>(null);
  const models: { key: ModelKey; label: string }[] = useMemo(
    () => [
      { key: "openai", label: "GPT-5 (OpenAI)" },
      { key: "anthropic", label: "Claude 4 Sonnet" },
      { key: "google", label: "Gemini 2.5 Pro" },
      { key: "cohere", label: "Command A (03-2025)" },
    ],
    []
  );

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsLoading(true);
    setMessages({ openai: "", anthropic: "", google: "", cohere: "" });
    setErrors({ openai: null, anthropic: null, google: null, cohere: null });

    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const res = await fetch("/api/cross-ref", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;
          try {
            const evt = JSON.parse(line) as NdjsonEvent;
            if (evt.type === "delta" && evt.text && evt.model) {
              setMessages((m) => ({ ...m, [evt.model]: m[evt.model] + evt.text }));
            } else if (evt.type === "error" && evt.error && evt.model) {
              setErrors((err) => ({ ...err, [evt.model]: evt.error! }));
            }
          } catch {
            // ignore bad lines
          }
        }
      }
    } catch (err) {
      // request aborted or failed
    } finally {
      setIsLoading(false);
      controllerRef.current = null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center">
      <main className="w-full max-w-6xl px-4 sm:px-6 md:px-8 py-10 flex-1 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="retro-heading text-3xl sm:text-4xl font-medium">
              Cross Referencer
            </h1>
            <p className="text-sm text-ink-muted/80 mt-1">
              Compare answers from multiple LLMs in real time
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="sticky top-0 z-10">
          <div className="glass rounded-2xl p-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask anything..."
              className="chat-textarea w-full resize-none bg-transparent outline-none placeholder:text-ink-muted/60 text-base leading-relaxed"
              rows={3}
            />
            <div className="flex items-center justify-end gap-3 px-2">
              <button
                type="button"
                onClick={() => {
                  controllerRef.current?.abort();
                }}
                className="px-4 py-2 rounded-lg border border-[color:var(--color-card-border)] text-[color:var(--color-ink)]/80 hover:bg-black/5 text-sm"
                disabled={!isLoading}
              >
                Stop
              </button>
              <button
                type="submit"
                className="neo-btn text-sm font-medium"
                disabled={isLoading}
              >
                <span className="neo-btn-icon" />
                {isLoading ? "Generating" : "Send"}
              </button>
            </div>
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {models.map(({ key, label }, index) => (
            <motion.div
              key={key}
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 25,
                delay: index * 0.1
              }}
              className="flex flex-col"
            >
              <div className="glass rounded-2xl p-4 min-h-[200px] flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-[color:var(--color-ink)]/90">
                    {label}
                  </div>
                  <AnimatePresence>
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ 
                          opacity: 1, 
                          scale: 1,
                          rotate: 360
                        }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{ 
                          rotate: { 
                            duration: 2, 
                            repeat: Infinity, 
                            ease: "linear" 
                          },
                          scale: { type: "spring", stiffness: 400, damping: 15 }
                        }}
                        className="h-2.5 w-2.5 rounded-full bg-[#111] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]"
                      />
                    )}
                  </AnimatePresence>
                </div>
                <motion.div 
                  className="whitespace-pre-wrap text-sm/6 text-[color:var(--color-ink)]/90 flex-1"
                  key={`${key}-content-${messages[key].length}`}
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {messages[key] || (!isLoading && "")}
                  {errors[key] && (
                    <motion.div 
                      className="mt-2 text-red-600/80"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      {errors[key]}
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
      <footer className="w-full max-w-6xl px-4 sm:px-6 md:px-8 py-6 text-xs text-[color:var(--color-ink-muted)]/80">
        Powered by OpenAI, Anthropic, Google Gemini, and Cohere
      </footer>
    </div>
  );
}
