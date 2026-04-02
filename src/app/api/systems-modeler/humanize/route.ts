import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 120;
import {
  HUMANIZE_SYSTEM_PROMPT,
  buildHumanizePrompt,
  PROFESSIONAL_HUMANIZE_SYSTEM_PROMPT,
  buildProfessionalHumanizePrompt,
} from "@/lib/systems-modeler/prompts";
import type { SystemModel, NarrativeResult, NarrativeMode } from "@/lib/systems-modeler/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { model, mode = "story" } = (await req.json()) as {
      model: SystemModel;
      mode?: NarrativeMode;
    };

    if (!model) {
      return NextResponse.json(
        { error: "model is required" },
        { status: 400 }
      );
    }

    const modelJson = JSON.stringify(model, null, 2);

    const systemPrompt =
      mode === "professional"
        ? PROFESSIONAL_HUMANIZE_SYSTEM_PROMPT
        : HUMANIZE_SYSTEM_PROMPT;

    const userPrompt =
      mode === "professional"
        ? buildProfessionalHumanizePrompt(modelJson)
        : buildHumanizePrompt(modelJson);

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
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
