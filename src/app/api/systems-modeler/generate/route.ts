import { NextRequest, NextResponse } from "next/server";
import { completeText, parseJsonObject, type Effort } from "@/lib/llm";

export const maxDuration = 300;
import {
  MC_SYSTEM_PROMPT,
  buildMCUserPrompt,
} from "@/lib/systems-modeler/prompts";
import type { SystemModel } from "@/lib/systems-modeler/types";
import { SYSTEM_MODEL_SCHEMA, validateModel } from "@/lib/systems-modeler/collision-diff";

const GENERATE_EFFORT: Effort =
  (process.env.GENERATE_EFFORT as Effort) || "high";

export async function POST(req: NextRequest) {
  try {
    const { topic, useRag, content } = (await req.json()) as {
      topic: string;
      useRag?: boolean;
      content?: string;
    };

    if (!topic) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }

    let ragContext: string | undefined;

    if (useRag) {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const ragRes = await fetch(`${baseUrl}/api/eco-rag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: topic, topK: 8 }),
      });

      if (ragRes.ok) {
        const ragData = await ragRes.json();
        ragContext = ragData.compressed_summary;
      }
    }

    // If raw content was provided, append it to the RAG context
    if (content) {
      ragContext = ragContext ? `${ragContext}\n\n${content}` : content;
    }

    // Compress very large content to fit within prompt limits
    if (ragContext && ragContext.length > 30000) {
      try {
        const compressRes = await completeText({
          system:
            "Compress this document into key facts, relationships, dynamics, and stakeholders relevant to systems modeling. Preserve specifics: names, numbers, dates, causal relationships, policies, and organizational structures. Max 6000 tokens.",
          prompt: `Topic: "${topic}"\n\nDocument:\n${ragContext.slice(0, 50000)}`,
          effort: "medium",
          maxTokens: 16000,
          fallback: "compress",
        });
        ragContext = compressRes.text || ragContext.slice(0, 24000);
      } catch {
        ragContext = ragContext.slice(0, 24000);
      }
    }

    const { text: raw } = await completeText({
      system: MC_SYSTEM_PROMPT,
      prompt: buildMCUserPrompt(topic, ragContext),
      effort: GENERATE_EFFORT,
      jsonSchema: { name: "system_model", schema: SYSTEM_MODEL_SCHEMA },
    });
    if (!raw) {
      return NextResponse.json(
        { error: "No response from model" },
        { status: 500 }
      );
    }

    const { model, warnings } = validateModel(parseJsonObject<SystemModel>(raw));
    if (warnings.length) console.warn("[systems-modeler/generate] dropped:", warnings);
    return NextResponse.json(model);
  } catch (error) {
    console.error("[systems-modeler/generate]", error);
    return NextResponse.json(
      { error: "Failed to generate system model" },
      { status: 500 }
    );
  }
}
