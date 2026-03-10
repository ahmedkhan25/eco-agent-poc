import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  HUMANIZE_SYSTEM_PROMPT,
  buildHumanizePrompt,
} from "@/lib/systems-modeler/prompts";
import type { SystemModel, NarrativeResult } from "@/lib/systems-modeler/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { model } = (await req.json()) as { model: SystemModel };

    if (!model) {
      return NextResponse.json(
        { error: "model is required" },
        { status: 400 }
      );
    }

    const modelJson = JSON.stringify(model, null, 2);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: HUMANIZE_SYSTEM_PROMPT },
        { role: "user", content: buildHumanizePrompt(modelJson) },
      ],
    });

    const raw = completion.choices[0].message.content;
    if (!raw) {
      return NextResponse.json(
        { error: "No response from model" },
        { status: 500 }
      );
    }

    const result: NarrativeResult = JSON.parse(raw);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[systems-modeler/humanize]", error);
    return NextResponse.json(
      { error: "Failed to humanize system model" },
      { status: 500 }
    );
  }
}
