import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

type NdjsonEvent = {
  model: "anthropic" | "openai" | "google";
  type: "start" | "delta" | "end" | "error";
  text?: string;
  error?: string;
};

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const { prompt, apiKeys, selectedModels } = req.body as { 
    prompt?: string; 
    apiKeys?: {
      anthropic?: string;
      openai?: string;
      google?: string;
    };
    selectedModels?: {
      anthropic?: string;
      openai?: string;
      google?: string;
    };
  };
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing prompt" });
  }

  // LaTeX instruction as system message
  const latexInstruction = "IMPORTANT: When writing mathematical expressions, you must use proper LaTeX formatting:\n- For inline math: $expression$ (example: $\\sin x$, $\\frac{d}{dx}$)\n- For display math: $$expression$$ (example: $$\\frac{d}{dx}(\\sin x) = \\cos x$$)\n- Never use brackets [ ] or parentheses ( ) around math expressions\n- Always wrap math symbols and equations in dollar signs";

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Transfer-Encoding": "chunked",
  });

  const write = (event: NdjsonEvent) => {
    res.write(JSON.stringify(event) + "\n");
  };

  // Use selected models from the request, fallback to env, then defaults
  const anthropicModel = selectedModels?.anthropic || process.env.ANTHROPIC_MODEL || "claude-opus-4-1-20250805";
  const openaiModel = selectedModels?.openai || process.env.OPENAI_MODEL || "gpt-5";
  const googleModel = selectedModels?.google || process.env.GOOGLE_MODEL || "gemini-2.5-pro";

  // Only use user-provided API keys
  const anthropicApiKey = apiKeys?.anthropic?.trim();
  const openaiApiKey = apiKeys?.openai?.trim();
  const googleApiKey = apiKeys?.google?.trim();

  const tasks: Array<Promise<void>> = [];

  if (anthropicApiKey) {
    tasks.push(
      (async () => {
        write({ model: "anthropic", type: "start" });
        try {
          const anthropic = new Anthropic({ apiKey: anthropicApiKey });
          const stream = await anthropic.messages.create({
            model: anthropicModel,
            max_tokens: 4096,
            system: latexInstruction,
            messages: [{ role: "user", content: prompt }],
            stream: true,
          });

          for await (const event of stream) {
            if (event.type === "content_block_delta") {
              const anyEvent = event as any;
              if (anyEvent?.delta?.type === "text_delta") {
                const t: string | undefined = anyEvent.delta.text;
                if (t) write({ model: "anthropic", type: "delta", text: t });
              }
            }
          }
          write({ model: "anthropic", type: "end" });
        } catch (err: any) {
          write({
            model: "anthropic",
            type: "error",
            error: err?.message || "Anthropic error",
          });
        }
      })()
    );
  }
  // Don't show error for missing Anthropic key - just skip the model

  if (openaiApiKey) {
    tasks.push(
      (async () => {
        write({ model: "openai", type: "start" });
        try {
          const openai = new OpenAI({ apiKey: openaiApiKey });
                  const stream = await openai.chat.completions.create({
          model: openaiModel,
          messages: [
            { role: "system", content: latexInstruction },
            { role: "user", content: prompt }
          ],
          stream: true,
        });
          for await (const part of stream) {
            const delta = part.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta.length > 0) {
              write({ model: "openai", type: "delta", text: delta });
            }
          }
          write({ model: "openai", type: "end" });
        } catch (err: any) {
          const quotaMsg =
            err?.status === 429 || err?.statusCode === 429
              ? "OpenAI: quota exceeded (429). Check plan/billing or use a smaller model like gpt-4o-mini."
              : undefined;
          write({
            model: "openai",
            type: "error",
            error: quotaMsg || err?.message || "OpenAI error",
          });
        }
      })()
    );
  }
  // Don't show error for missing OpenAI key - just skip the model

  if (googleApiKey) {
    tasks.push(
      (async () => {
        write({ model: "google", type: "start" });
        try {
          const genAI = new GoogleGenerativeAI(googleApiKey);
          const model = genAI.getGenerativeModel({ 
            model: googleModel,
            systemInstruction: latexInstruction
          });
          const result = await model.generateContentStream(prompt);
          for await (const chunk of result.stream) {
            const t = chunk.text();
            if (t) write({ model: "google", type: "delta", text: t });
          }
          write({ model: "google", type: "end" });
        } catch (err: any) {
          write({
            model: "google",
            type: "error",
            error: err?.message || "Google error",
          });
        }
      })()
    );
  }
  // Don't show error for missing Google key - just skip the model



  try {
    await Promise.all(tasks);
  } finally {
    res.end();
  }
}


