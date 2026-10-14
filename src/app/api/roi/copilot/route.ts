import Anthropic from "@anthropic-ai/sdk";
import {
  AnthropicAdapter,
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { CLAUDE_MODEL, hasAnthropicKey } from "@/lib/llm";

// ROI Advisor chat. Gated by src/middleware.ts (same cookie as /roi).
// Runs on Claude; falls back to OpenAI only when no Anthropic key is set.

export const maxDuration = 60;

// CopilotKit turns Claude's thinking into an empty "reasoning" message, and its
// chat then drops the tool call that follows (no scenario card, no reply).
// Opus can't switch thinking off, so this strips thinking blocks from the
// response stream. The runtime builds its model from this client's fetch.
const THINKING = new Set(["thinking", "redacted_thinking"]);

function dropThinking(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const skip = new Set<number>();
  let buffer = "";
  const keep = (event: string) => {
    const data = event.split("\n").find((l) => l.startsWith("data: "));
    if (!data) return true;
    try {
      const json = JSON.parse(data.slice(6));
      if (json.type === "content_block_start" && THINKING.has(json.content_block?.type)) skip.add(json.index);
      return !(typeof json.index === "number" && skip.has(json.index));
    } catch {
      return true;
    }
  };
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        const out = events.filter(keep);
        if (out.length) controller.enqueue(encoder.encode(out.join("\n\n") + "\n\n"));
      },
      flush(controller) {
        if (buffer && keep(buffer)) controller.enqueue(encoder.encode(buffer));
      },
    })
  );
}

const withoutThinking: typeof fetch = async (input, init) => {
  const res = await fetch(input, init);
  const isStream = res.headers.get("content-type")?.includes("text/event-stream");
  if (!isStream || !res.body) return res;
  return new Response(dropThinking(res.body), { status: res.status, statusText: res.statusText, headers: res.headers });
};

export const POST = async (req: Request) => {
  const runtime = new CopilotRuntime();
  const serviceAdapter = hasAnthropicKey()
    ? new AnthropicAdapter({ anthropic: new Anthropic({ fetch: withoutThinking }), model: CLAUDE_MODEL })
    : new OpenAIAdapter({ model: "gpt-4o" });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/roi/copilot",
  });

  return handleRequest(req);
};
