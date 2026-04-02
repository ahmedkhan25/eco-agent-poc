import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  MC_SYSTEM_PROMPT,
  buildMCUserPrompt,
} from "@/lib/systems-modeler/prompts";
import type { SystemModel } from "@/lib/systems-modeler/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
        const compressRes = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "Compress this document into key facts, relationships, dynamics, and stakeholders relevant to systems modeling. Preserve specifics: names, numbers, dates, causal relationships, policies, and organizational structures. Max 6000 tokens.",
            },
            {
              role: "user",
              content: `Topic: "${topic}"\n\nDocument:\n${ragContext.slice(0, 50000)}`,
            },
          ],
          max_tokens: 6500,
          temperature: 0.1,
        });
        ragContext =
          compressRes.choices[0]?.message?.content ||
          ragContext.slice(0, 24000);
      } catch {
        ragContext = ragContext.slice(0, 24000);
      }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: MC_SYSTEM_PROMPT },
        { role: "user", content: buildMCUserPrompt(topic, ragContext) },
      ],
    });

    const raw = completion.choices[0].message.content;
    if (!raw) {
      return NextResponse.json(
        { error: "No response from model" },
        { status: 500 }
      );
    }

    const model: SystemModel = JSON.parse(raw);
    return NextResponse.json(model);
  } catch (error) {
    console.error("[systems-modeler/generate]", error);
    return NextResponse.json(
      { error: "Failed to generate system model" },
      { status: 500 }
    );
  }
}
