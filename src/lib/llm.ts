/**
 * Shared LLM configuration.
 *
 * Text generation runs on Claude (default `claude-opus-5-5`, override with
 * CHAT_MODEL). If ANTHROPIC_API_KEY is not set, every caller falls back to the
 * previous OpenAI models so a deploy without the key keeps working.
 *
 * OpenAI stays in use for embeddings (text-embedding-3-small, the RAG index
 * depends on it) and gpt-image-1 image generation; those call sites do not use
 * this module.
 */
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { SharedV2ProviderOptions } from "@ai-sdk/provider";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export const CLAUDE_MODEL = process.env.CHAT_MODEL || "claude-opus-5-5";

const EFFORTS: Effort[] = ["low", "medium", "high", "xhigh", "max"];

/** Effort for the main chat agent. Override with CHAT_EFFORT. */
export const CHAT_EFFORT: Effort = EFFORTS.includes(process.env.CHAT_EFFORT as Effort)
  ? (process.env.CHAT_EFFORT as Effort)
  : "medium";

// Used only when ANTHROPIC_API_KEY is missing.
export const OPENAI_FALLBACK_MODELS = {
  chat: "gpt-5.1",
  title: "gpt-5-nano",
  compress: "gpt-4o",
  reasoning: "gpt-5.4",
} as const;

export function hasAnthropicKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/** Human-readable label for logs. */
export function activeModelLabel(fallback: keyof typeof OPENAI_FALLBACK_MODELS = "chat"): string {
  return hasAnthropicKey()
    ? `Anthropic (${CLAUDE_MODEL})`
    : `OpenAI (${OPENAI_FALLBACK_MODELS[fallback]}) - ANTHROPIC_API_KEY not set`;
}

/**
 * Vercel AI SDK model for streamText/generateText callers.
 * Pair with `aiSdkProviderOptions()` so effort is set explicitly
 * (Opus 5.5 defaults to medium).
 */
export function getAiSdkModel(fallback: keyof typeof OPENAI_FALLBACK_MODELS = "chat") {
  return hasAnthropicKey()
    ? anthropic(CLAUDE_MODEL)
    : openai(OPENAI_FALLBACK_MODELS[fallback]);
}

export function aiSdkProviderOptions(effort: Effort): SharedV2ProviderOptions {
  if (hasAnthropicKey()) {
    // Opus 5.5 always uses adaptive thinking; effort is the only depth control.
    return {
      anthropic: {
        thinking: { type: "adaptive" },
        effort,
      },
    };
  }
  return {};
}

let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;

function getAnthropic(): Anthropic {
  if (!anthropicClient) anthropicClient = new Anthropic();
  return anthropicClient;
}

function getOpenAI(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

export class ModelRefusalError extends Error {
  constructor(public category: string | null | undefined) {
    super(`Model declined the request${category ? ` (${category})` : ""}`);
    this.name = "ModelRefusalError";
  }
}

interface CompleteOptions {
  system: string;
  prompt: string;
  effort?: Effort;
  maxTokens?: number;
  /** Ask for a single JSON object. On OpenAI this sets response_format. */
  json?: boolean;
  fallback?: keyof typeof OPENAI_FALLBACK_MODELS;
}

/**
 * One-shot text completion for server routes (systems modeler, RAG
 * compression, demo agents). Streams under the hood so long outputs don't
 * hit HTTP timeouts.
 */
export async function completeText({
  system,
  prompt,
  effort = "high",
  maxTokens = 32000,
  json = false,
  fallback = "reasoning",
}: CompleteOptions): Promise<{ text: string; outputTokens: number }> {
  if (hasAnthropicKey()) {
    const stream = getAnthropic().beta.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system: json
        ? `${system}\n\nRespond with a single JSON object only. No prose before or after it, no code fences.`
        : system,
      messages: [{ role: "user", content: prompt }],
      thinking: { type: "adaptive" },
      output_config: { effort },
      // On a policy decline, the API retries on a fallback model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") {
      throw new ModelRefusalError(message.stop_details?.category);
    }
    if (message.stop_reason === "max_tokens") {
      console.warn(`[llm] ${CLAUDE_MODEL} hit max_tokens (${maxTokens})`);
    }
    const text = message.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return { text, outputTokens: message.usage.output_tokens };
  }

  const completion = await getOpenAI().chat.completions.create({
    model: OPENAI_FALLBACK_MODELS[fallback],
    ...(json ? { response_format: { type: "json_object" as const } } : {}),
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });
  return {
    text: completion.choices[0]?.message?.content || "",
    outputTokens: completion.usage?.completion_tokens || 0,
  };
}

/**
 * Parse a JSON object out of model text: accepts bare JSON, a ```json fence,
 * or JSON surrounded by stray prose.
 */
export function parseJsonObject<T>(raw: string): T {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : trimmed;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("No JSON object in model response");
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  }
}
