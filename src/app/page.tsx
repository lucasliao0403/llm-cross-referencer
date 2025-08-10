"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { IoInformationCircle, IoSettings, IoStar } from "react-icons/io5";
import { FaGithub } from "react-icons/fa";
import { useApiKeys } from "../contexts/ApiKeysContext";
import ApiKeysModal from "../components/ApiKeysModal";

// Removed fallback math notation converter

type ModelKey = "openai" | "anthropic" | "google" | "cohere";

type NdjsonEvent = {
  model: ModelKey;
  type: "start" | "delta" | "end" | "error";
  text?: string;
  error?: string;
};

export default function Home() {
  const { apiKeys, hasAnyKeys } = useApiKeys();
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
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
  const [evaluatorResult, setEvaluatorResult] = useState<string>("");
  const [evaluatorLoading, setEvaluatorLoading] = useState(false);
  const [evaluatorRan, setEvaluatorRan] = useState(false);
  const [modelStatus, setModelStatus] = useState<Record<ModelKey, 'pending' | 'streaming' | 'finished' | 'error'>>({
    openai: 'pending',
    anthropic: 'pending',
    google: 'pending',
    cohere: 'pending',
  });

  const controllerRef = useRef<AbortController | null>(null);
  const allModels: { key: ModelKey; label: string }[] = useMemo(
    () => [
      { key: "openai", label: "GPT-5" },
      { key: "anthropic", label: "Claude 4 Sonnet" },
      { key: "google", label: "Gemini 2.5 Pro" },
      { key: "cohere", label: "Command A (03-2025)" },
    ],
    []
  );

  // Only show models that have API keys
  const availableModels = useMemo(() => {
    return allModels.filter(model => apiKeys[model.key]?.trim());
  }, [apiKeys, allModels]);

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  // Use useEffect to watch for when all ACTIVE models are done and trigger evaluator
  useEffect(() => {
    const activeModelKeys = availableModels.map(model => model.key);
    const activeModelStatuses = activeModelKeys.map(key => modelStatus[key]);
    
    if (activeModelKeys.length === 0) return; // No active models
    
    const allFinished = activeModelStatuses.every(status => status === 'finished' || status === 'error');
    const hasAtLeastOneSuccess = activeModelStatuses.some(status => status === 'finished');
    
    console.log('🔍 Checking evaluator conditions (useEffect):', {
      activeModelKeys,
      activeModelStatuses,
      allFinished,
      hasAtLeastOneSuccess,
      evaluatorRan,
      evaluatorLoading
    });
    
    if (allFinished && hasAtLeastOneSuccess && !evaluatorRan && !evaluatorLoading) {
      console.log('🎯 Running evaluator from useEffect...');
      setEvaluatorRan(true);
      evaluateResults();
    }
  }, [modelStatus, evaluatorRan, evaluatorLoading, availableModels]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsLoading(true);
    setMessages({ openai: "", anthropic: "", google: "", cohere: "" });
    setErrors({ openai: null, anthropic: null, google: null, cohere: null });
    setEvaluatorResult("");
    setEvaluatorLoading(false);
    setEvaluatorRan(false);
    
    // Only set status for active models (those with API keys)
    const newModelStatus: Record<ModelKey, 'pending' | 'streaming' | 'finished' | 'error'> = {
      openai: 'pending',
      anthropic: 'pending',
      google: 'pending',
      cohere: 'pending',
    };
    
    // Set inactive models to 'finished' so they don't block the evaluator
    allModels.forEach(model => {
      if (!apiKeys[model.key]?.trim()) {
        newModelStatus[model.key] = 'finished';
      }
    });
    
    setModelStatus(newModelStatus);

    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const res = await fetch("/api/cross-ref", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, apiKeys }),
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
             if (evt.type === "start" && evt.model) {
               console.log(`🚀 ${evt.model} started streaming`);
               setModelStatus((s) => ({ ...s, [evt.model]: 'streaming' }));
             } else if (evt.type === "delta" && evt.text && evt.model) {
               setMessages((m) => ({ ...m, [evt.model]: m[evt.model] + evt.text }));
             } else if (evt.type === "end" && evt.model) {
               console.log(`✅ ${evt.model} finished successfully`);
               setModelStatus((s) => ({ ...s, [evt.model]: 'finished' }));
             } else if (evt.type === "error" && evt.error && evt.model) {
               console.log(`❌ ${evt.model} error:`, evt.error);
               setErrors((err) => ({ ...err, [evt.model]: evt.error! }));
               setModelStatus((s) => ({ ...s, [evt.model]: 'error' }));
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

  const evaluateResults = async () => {
    const validResponses = availableModels
      .map(({ key, label }) => ({ key, label, response: messages[key] }))
      .filter(({ key, response }) => !errors[key] && response.trim().length > 0);

    if (validResponses.length === 0) return;

    setEvaluatorLoading(true);
    
    try {
      // Use the first available model to evaluate
      const evaluatorModel = validResponses[0].key;
      const responsesText = validResponses
        .map(({ label, response }) => `**${label}:**\n${response}`)
        .join('\n\n---\n\n');

      const evaluationPrompt = `[no prose] You are a neutral summarizer. Below are responses from multiple AI models to the same question. Your task is to provide a concise summary that:

1. Summarize what each source said without judging correctness
2. If multiple models give similar responses, group them together
3. If models give different responses, present each perspective clearly
4. Note any key differences or variations in approach
5. Keep your summary objective and comprehensive
6. Use markdown formatting for clarity

Do not restate the prompt in your response.
State your response in this format.
1. 1-2 sentences summarizing the majority responses. e.g. "The majority of models agree that..."
2. 1-2 sentences summarizing the minority responses. e.g. "However, some models differ in their responses..."
3. Two line breaks, then a bolded header saying "Detailed Breakdown:"
4. 1-3 sentences summarizing the key differences between the majority and minority responses. e.g. "The key differences between the majority and minority responses are..."
5. OPTIONAL: 1-3 sentences summarizing the key similarities between the majority and minority responses. e.g. "The key similarities between the majority and minority responses are..."

Original question: "${prompt}"

Responses:
${responsesText}

Provide a neutral summary of what each source said:`;

      const res = await fetch("/api/cross-ref", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: evaluationPrompt, apiKeys }),
      });

      if (!res.ok || !res.body) throw new Error("Evaluation failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let evaluationText = "";

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
            if (evt.type === "delta" && evt.text && evt.model === evaluatorModel) {
              evaluationText += evt.text;
              setEvaluatorResult(evaluationText);
            }
          } catch {
            // ignore bad lines
          }
        }
      }
    } catch (err) {
      setEvaluatorResult("⚠️ Evaluation unavailable");
    } finally {
      setEvaluatorLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center relative">
      <main className="w-full max-w-6xl px-4 sm:px-6 md:px-8 py-10 flex-1 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="retro-heading text-3xl sm:text-4xl font-medium">
              LLM Cross Referencer
            </h1>
            <p className="text-sm text-ink-muted/80 mt-1">
              Compare answers from multiple LLMs in real time.
            </p>
            <div className="bg-blue-50/60 border border-blue-200/60 rounded-xl p-3 mt-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="text-white">
                    <path d="M6 8.5V6M6 3.5H6.005M10.5 6C10.5 8.485 8.485 10.5 6 10.5C3.515 10.5 1.5 8.485 1.5 6C1.5 3.515 3.515 1.5 6 1.5C8.485 1.5 10.5 3.515 10.5 6Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </div>  
                <p className="text-xs text-blue-800/80 whitespace-nowrap">
                  <span className="font-medium text-blue-900">No data is stored.</span> Your API keys are stored locally and sent directly to AI providers.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {hasAnyKeys && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-50/60 border border-emerald-200/60">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-xs font-medium text-emerald-700">Using custom keys</span>
              </div>
            )}
            
            <button
              onClick={() => setShowApiModal(true)}
              className="relative p-3 rounded-full border border-card-border bg-card-bg/72 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(0,0,0,0.06)] transition-all duration-200 cursor-pointer overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.14)] hover:text-white active:translate-y-0 before:content-[\'\'] before:absolute before:bottom-0 before:left-0 before:right-0 before:h-0 before:bg-ink before:transition-all before:duration-300 before:-z-10 hover:before:h-full flex items-center justify-center"
              title="API Settings"
            >
              <IoSettings className="relative z-10 text-ink/80 transition-colors text-base" />
            </button>
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
                disabled={isLoading || availableModels.length === 0}
                title={availableModels.length === 0 ? "Please add API keys first" : undefined}
              >
                {isLoading ? "Generating" : "Send"}
              </button>
            </div>
          </div>
                 </form>

         {(evaluatorResult || evaluatorLoading) && (
           <motion.div
             initial={{ y: 20, opacity: 0, scale: 0.95 }}
             animate={{ y: 0, opacity: 1, scale: 1 }}
             transition={{ type: "spring", stiffness: 300, damping: 25 }}
             className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200/60 rounded-2xl p-5 shadow-[0_8px_32px_rgba(251,191,36,0.12)]"
           >
             <div className="flex items-end justify-between mb-3">
               <div className="flex items-center gap-3">
                 <div className="flex items-center justify-center w-8 h-8 bg-amber-500 rounded-full">
                   <IoStar className="text-white text-base" />
                 </div>
                 <div>
                   <h3 className="font-serif font-semibold text-2xl text-amber-900">Response Summary</h3>
                 </div>
               </div>
               {evaluatorLoading && (
                 <motion.div
                   initial={{ opacity: 0, scale: 0 }}
                   animate={{ opacity: 1, scale: 1, rotate: 360 }}
                   transition={{ 
                     rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                     scale: { type: "spring", stiffness: 400, damping: 15 }
                   }}
                   className="h-4 w-4 rounded-full bg-amber-500 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]"
                 />
               )}
             </div>
             <div className="prose prose-sm max-w-none prose-amber prose-headings:text-amber-900 prose-p:text-amber-800/90 prose-strong:text-amber-900 prose-code:text-amber-900/95 prose-code:bg-amber-100/60 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-amber-100/60 prose-pre:border prose-pre:border-amber-200/60">
               {evaluatorResult ? (
                 <ReactMarkdown
                   remarkPlugins={[remarkMath]}
                   rehypePlugins={[rehypeKatex]}
                 >
                   {evaluatorResult}
                 </ReactMarkdown>
               ) : (
                 <div className="text-amber-700/60 italic">Analyzing responses...</div>
               )}
        </div>
           </motion.div>
         )}

         {availableModels.length === 0 ? (
           <motion.div
             initial={{ y: 20, opacity: 0, scale: 0.95 }}
             animate={{ y: 0, opacity: 1, scale: 1 }}
             transition={{ type: "spring", stiffness: 300, damping: 25 }}
             className="text-center py-12"
           >
             <div className="glass rounded-3xl p-8 max-w-md mx-auto">
               <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-amber-200/60 mx-auto mb-4 flex items-center justify-center">
                 <IoInformationCircle className="text-amber-600 text-3xl" />
               </div>
               <h3 className="retro-heading text-xl font-medium mb-2">No API Keys Set</h3>
               <p className="text-sm text-ink-muted/80 mb-4">
                 To get started, please add your API keys in the settings menu.
               </p>
               <button
                 onClick={() => setShowApiModal(true)}
                 className="neo-btn text-sm font-medium"
               >
                 Add API Keys
               </button>
             </div>
           </motion.div>
         ) : (
         <div className={`grid gap-5 ${
           availableModels.length === 1 ? 'grid-cols-1' :
           availableModels.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
           availableModels.length === 3 ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' :
           'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
         }`}>
          {availableModels.map(({ key, label }, index) => (
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
                        {messages[key]}
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
         )}
      </main>
                   <footer className="w-full max-w-6xl px-4 sm:px-6 md:px-8 py-6 text-sm text-ink-muted/80 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center gap-1">
            <span>Made by</span>
            <a href="https://x.com/liao_lucas" target="_blank" rel="noopener noreferrer" className="text-ink/80 hover:text-ink transition-colors underline">
              Lucas Liao
            </a>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <span>Open source on</span>
            <a href="https://github.com/lucasliao0403/llm-cross-referencer" target="_blank" rel="noopener noreferrer" className="text-ink/80 hover:text-ink transition-colors underline inline-flex items-center gap-1">
              <FaGithub className="text-sm" />
              GitHub
            </a>
          </div>
          <span>•</span>
          <span>No data stored</span>
          <span>•</span>
          <span>2025</span>
        </div>
      </footer>
      
      <ApiKeysModal 
        isOpen={showApiModal} 
        onClose={() => setShowApiModal(false)} 
      />
    </div>
  );
}
