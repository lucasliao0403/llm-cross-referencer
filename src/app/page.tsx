"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// Function to convert bracket notation to proper LaTeX
const convertMathNotation = (text: string): string => {
  // Convert [ ... ] to $$ ... $$
  return text.replace(/\[\s*([^[\]]+)\s*\]/g, '$$$$1$$');
};

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
                 className={`relative p-2 rounded-lg border transition-all duration-200 cursor-pointer overflow-hidden hover:-translate-y-0.5 ${
                   isLoading 
                     ? 'border-red-400 bg-red-400 hover:bg-red-500 text-white shadow-[0_10px_24px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_32px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.14)]' 
                     : 'border-card-border hover:text-white shadow-[0_10px_24px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_32px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.14)] before:content-[\'\'] before:absolute before:bottom-0 before:left-0 before:right-0 before:h-0 before:bg-red-400 before:transition-all before:duration-300 before:-z-10 hover:before:h-full'
                 }`}
                 disabled={!isLoading}
               >
                 <svg
                   width="16"
                   height="16"
                   viewBox="0 0 16 16"
                   fill="none"
                   className={`relative z-10 transition-colors ${
                     isLoading ? 'text-white' : 'text-ink/80'
                   }`}
                 >
                   <rect
                     x="4"
                     y="4"
                     width="8"
                     height="8"
                     rx="1"
                     fill="currentColor"
                   />
                 </svg>
               </button>
              <button
                type="submit"
                className="neo-btn text-sm font-medium"
                disabled={isLoading}
              >
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
                             <div className="bg-card-bg/72 backdrop-blur-[16px] border border-card-border shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(0,0,0,0.06)] rounded-2xl p-4 h-[400px] flex flex-col">
                 <div className="flex items-center justify-between mb-2">
                   <div className="text-sm font-medium text-ink/90">
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
                   className="whitespace-pre-wrap text-sm/6 text-ink/90 flex-1 overflow-y-auto"
                   key={`${key}-content-${messages[key].length}`}
                   initial={{ opacity: 0.8 }}
                   animate={{ opacity: 1 }}
                   transition={{ duration: 0.2 }}
                 >
                  {messages[key] ? (
                    <div className="prose prose-sm max-w-none prose-gray prose-headings:text-ink prose-p:text-ink/90 prose-strong:text-ink prose-code:text-ink/95 prose-code:bg-black/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-black/5 prose-pre:border prose-pre:border-black/10">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {convertMathNotation(messages[key])}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    !isLoading && ""
                  )}
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
             <footer className="w-full max-w-6xl px-4 sm:px-6 md:px-8 py-6 text-xs text-ink-muted/80">
        Powered by OpenAI, Anthropic, Google Gemini, and Cohere
      </footer>
    </div>
  );
}
