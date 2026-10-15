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
//
// The AI SDK also names each text message after its content-block index, and
// every request starts again at 0, so the replies to later questions were
// merged into an earlier reply in the chat. Each response gets its own index
// offset so every message id is unique.
const THINKING = new Set(["thinking", "redacted_thinking"]);

function dropThinking(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const skip = new Set<number>();
  const tools = new Map<number, { name: string; buf: string }>();
  const base = 1000 * (1 + Math.floor(Math.random() * 1_000_000));
  let buffer = "";
  // Returns the event to forward (re-indexed), or null to drop it.
  const rewrite = (event: string): string | null => {
    const lines = event.split("\n");
    const i = lines.findIndex((l) => l.startsWith("data: "));
    if (i < 0) return event;
    try {
      const json = JSON.parse(lines[i].slice(6));
      if (json.type === "content_block_start" && THINKING.has(json.content_block?.type)) skip.add(json.index);
      // Log which arguments each tool call carried (names only), to tell a
      // model that leaves arguments out from a stream that loses them.
      if (json.type === "content_block_start" && json.content_block?.type === "tool_use") tools.set(json.index, { name: json.content_block.name, buf: "" });
      if (json.type === "content_block_delta" && json.delta?.type === "input_json_delta") {
        const t = tools.get(json.index);
        if (t) t.buf += json.delta.partial_json ?? "";
      }
      if (json.type === "content_block_stop" && tools.has(json.index)) {
        const t = tools.get(json.index)!;
        let keys = "unparsed";
        try {
          keys = Object.keys(JSON.parse(t.buf || "{}")).join(",") || "none";
        } catch {}
        console.log(`[roi-advisor] tool ${t.name} args: ${keys}`);
        tools.delete(json.index);
      }
      if (typeof json.index !== "number") return event;
      if (skip.has(json.index)) return null;
      json.index += base;
      lines[i] = "data: " + JSON.stringify(json);
      return lines.join("\n");
    } catch {
      return event;
    }
  };
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        const out = events.map(rewrite).filter((e): e is string => e !== null);
        if (out.length) controller.enqueue(encoder.encode(out.join("\n\n") + "\n\n"));
      },
      flush(controller) {
        const last = buffer ? rewrite(buffer) : null;
        if (last) controller.enqueue(encoder.encode(last));
      },
    })
  );
}

// One tool call at a time. When Claude calls two browser-side actions at once,
// only one result comes back, the next request fails with "Tool result is
// missing for tool call", and the chat hangs on "Working...".
function oneToolAtATime(init?: RequestInit): RequestInit | undefined {
  if (!init || typeof init.body !== "string") return init;
  try {
    const body = JSON.parse(init.body);
    if (!Array.isArray(body.tools) || !body.tools.length) return init;
    if (body.tool_choice?.type === "none") return init;
    body.tool_choice = { type: "auto", ...body.tool_choice, disable_parallel_tool_use: true };
    return { ...init, body: JSON.stringify(body) };
  } catch {
    return init;
  }
}

const withoutThinking: typeof fetch = async (input, init) => {
  const res = await fetch(input, oneToolAtATime(init));
  const isStream = res.headers.get("content-type")?.includes("text/event-stream");
  if (!isStream || !res.body) return res;
  return new Response(dropThinking(res.body), { status: res.status, statusText: res.statusText, headers: res.headers });
};

// If a browser step never sent its result back (a crash, a refresh or a lost
// connection mid-step), the chat history keeps a tool call with no result, and
// every later message fails with "Tool result is missing for tool call": the
// chat is dead until a page refresh. Fill each missing result with a note so
// the conversation carries on.
type Msg = { id?: string; role?: string; toolCalls?: { id: string }[]; toolCallId?: string; content?: unknown };
function repairHistory(messages: Msg[]): Msg[] {
  const answered = new Set(messages.filter((m) => m.role === "tool" && m.toolCallId).map((m) => m.toolCallId));
  const out: Msg[] = [];
  for (const m of messages) {
    out.push(m);
    for (const call of m.role === "assistant" ? m.toolCalls ?? [] : []) {
      if (answered.has(call.id)) continue;
      console.log(`[roi-advisor] repaired missing result for ${call.id}`);
      out.push({ id: crypto.randomUUID(), role: "tool", toolCallId: call.id, content: "This step did not finish and returned no result. Do not assume it ran; check the current state and try again if needed." });
    }
  }
  return out;
}

async function withRepairedHistory(req: Request): Promise<Request> {
  try {
    const json = await req.clone().json();
    const messages = json?.body?.messages;
    if (!Array.isArray(messages)) return req;
    const fixed = repairHistory(messages);
    if (fixed.length === messages.length) return req;
    json.body.messages = fixed;
    const headers = new Headers(req.headers);
    headers.delete("content-length");
    return new Request(req.url, { method: req.method, headers, body: JSON.stringify(json) });
  } catch {
    return req;
  }
}

export const POST = async (incoming: Request) => {
  const req = await withRepairedHistory(incoming);
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
