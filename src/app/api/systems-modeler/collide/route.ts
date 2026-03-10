import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  AHA_PARADOX_SYSTEM_PROMPT,
  buildAhaParadoxPrompt,
} from "@/lib/systems-modeler/prompts";
import type { SystemModel } from "@/lib/systems-modeler/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: AHA_PARADOX_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildAhaParadoxPrompt(modelJson, collisionConcept),
        },
      ],
    });

    const raw = completion.choices[0].message.content;
    if (!raw) {
      return NextResponse.json(
        { error: "No response from model" },
        { status: 500 }
      );
    }

    // Extract the JSON code block from the response
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse updated model from response" },
        { status: 500 }
      );
    }

    // Narrative is everything before the code block
    const codeBlockStart = raw.indexOf("```json");
    const narrative = raw.slice(0, codeBlockStart).trim();

    const updatedModel: SystemModel = JSON.parse(jsonMatch[1]);

    return NextResponse.json({ narrative, updatedModel });
  } catch (error) {
    console.error("[systems-modeler/collide]", error);
    return NextResponse.json(
      { error: "Failed to perform concept collision" },
      { status: 500 }
    );
  }
}
