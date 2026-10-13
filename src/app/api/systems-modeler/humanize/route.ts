import { NextRequest, NextResponse } from "next/server";
import { completeText, parseJsonObject } from "@/lib/llm";

export const maxDuration = 300;
import {
  HUMANIZE_SYSTEM_PROMPT,
  buildHumanizePrompt,
  PROFESSIONAL_HUMANIZE_SYSTEM_PROMPT,
  buildProfessionalHumanizePrompt,
} from "@/lib/systems-modeler/prompts";
import type { SystemModel, NarrativeResult, NarrativeMode } from "@/lib/systems-modeler/types";

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

    const { text: raw } = await completeText({
      system: systemPrompt,
      prompt: userPrompt,
      effort: "medium",
      json: true,
    });
    if (!raw) {
      return NextResponse.json(
        { error: "No response from model" },
        { status: 500 }
      );
    }

    const result = parseJsonObject<NarrativeResult>(raw);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[systems-modeler/humanize]", error);
    return NextResponse.json(
      { error: "Failed to humanize system model" },
      { status: 500 }
    );
  }
}
