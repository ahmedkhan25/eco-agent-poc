import { NextRequest, NextResponse } from "next/server";
import { completeText, parseJsonObject } from "@/lib/llm";

export const maxDuration = 300;
import {
  AHA_PARADOX_SYSTEM_PROMPT,
  buildAhaParadoxPrompt,
} from "@/lib/systems-modeler/prompts";
import type { SystemModel } from "@/lib/systems-modeler/types";

export async function POST(req: NextRequest) {
  try {
    const { model, collisionConcept } = (await req.json()) as {
      model: SystemModel;
      collisionConcept?: string;
    };

    if (!model) {
      return NextResponse.json(
        { error: "model is required" },
        { status: 400 }
      );
    }

    const modelJson = JSON.stringify(model, null, 2);

    const { text: raw } = await completeText({
      system: AHA_PARADOX_SYSTEM_PROMPT,
      prompt: buildAhaParadoxPrompt(modelJson, collisionConcept),
      effort: "high",
    });

    if (!raw) {
      return NextResponse.json(
        { error: "No response from model" },
        { status: 500 }
      );
    }

    // The response is narrative prose followed by a ```json block with the
    // updated model. Narrative is everything before the code block.
    const codeBlockStart = raw.search(/```(?:json)?\s*\{/);
    if (codeBlockStart === -1) {
      return NextResponse.json(
        { error: "Failed to parse updated model from response" },
        { status: 500 }
      );
    }
    const narrative = raw.slice(0, codeBlockStart).trim();
    const updatedModel = parseJsonObject<SystemModel>(raw.slice(codeBlockStart));

    return NextResponse.json({ narrative, updatedModel });
  } catch (error) {
    console.error("[systems-modeler/collide]", error);
    return NextResponse.json(
      { error: "Failed to perform concept collision" },
      { status: 500 }
    );
  }
}
