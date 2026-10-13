import { NextRequest, NextResponse } from "next/server";
import { completeText, parseJsonObject, type Effort } from "@/lib/llm";

export const maxDuration = 300;
import {
  AHA_PARADOX_SYSTEM_PROMPT,
  buildAhaParadoxPrompt,
} from "@/lib/systems-modeler/prompts";
import {
  COLLISION_DIFF_SCHEMA,
  mergeCollisionDiff,
  type CollisionDiff,
} from "@/lib/systems-modeler/collision-diff";
import type { SystemModel } from "@/lib/systems-modeler/types";

const COLLIDE_EFFORT: Effort =
  (process.env.COLLIDE_EFFORT as Effort) || "low";

/** Strip D3 runtime positions so the prompt carries only the model. */
function promptModel(model: SystemModel): SystemModel {
  return {
    ...model,
    nodes: model.nodes.map(({ x, y, fx, fy, ...n }) => n),
  };
}

/**
 * Streams newline-delimited JSON events:
 *   {"type":"progress","stage":"thinking"|"narrative"|"changes","chars":n}
 *   {"type":"result","narrative","updatedModel","warnings","elapsedMs"}
 *   {"type":"error","error"}
 */
export async function POST(req: NextRequest) {
  const { model, collisionConcept } = (await req.json()) as {
    model: SystemModel;
    collisionConcept?: string;
  };

  if (!model) {
    return NextResponse.json({ error: "model is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const started = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      send({ type: "progress", stage: "thinking", chars: 0 });

      let chars = 0;
      let stage = "thinking";
      let accumulated = "";
      let lastSent = 0;

      try {
        const { text } = await completeText({
          system: AHA_PARADOX_SYSTEM_PROMPT,
          prompt: buildAhaParadoxPrompt(JSON.stringify(promptModel(model)), collisionConcept),
          effort: COLLIDE_EFFORT,
          maxTokens: 32000,
          jsonSchema: { name: "collision_diff", schema: COLLISION_DIFF_SCHEMA },
          onTextDelta: (delta) => {
            chars += delta.length;
            accumulated += delta;
            const next = accumulated.includes('"addNodes"') ? "changes" : "narrative";
            // Throttle progress events to roughly every 400 characters.
            if (next !== stage || chars - lastSent > 400) {
              stage = next;
              lastSent = chars;
              send({ type: "progress", stage, chars });
            }
          },
        });

        const diff = parseJsonObject<CollisionDiff>(text);
        const { model: updatedModel, warnings } = mergeCollisionDiff(model, diff);
        if (warnings.length) console.warn("[systems-modeler/collide] dropped:", warnings);
        const elapsedMs = Date.now() - started;
        console.log(
          `[systems-modeler/collide] effort=${COLLIDE_EFFORT} ${elapsedMs}ms, ${text.length} chars, +${diff.addNodes.length} nodes +${diff.addLinks.length} links +${diff.addLoops.length} loops`
        );
        send({ type: "result", narrative: diff.narrative, updatedModel, warnings, elapsedMs });
      } catch (error) {
        console.error("[systems-modeler/collide]", error);
        send({ type: "error", error: "Failed to perform concept collision" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
