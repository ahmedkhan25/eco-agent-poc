/**
 * Concept Collision returns a diff against the current model instead of the
 * whole model, so the response stays small (and fast). The schema below is
 * sent as a structured-output format; mergeCollisionDiff applies it and drops
 * anything that references variables or loops that don't exist.
 */
import type {
  NodeCategory,
  SystemModel,
  SystemModelArchetype,
  SystemModelLink,
  SystemModelLoop,
  SystemModelNode,
} from "./types";

const CATEGORIES: NodeCategory[] = [
  "pressure",
  "population",
  "social",
  "solution",
  "environment",
  "resource",
  "policy",
  "economic",
  "default",
];

const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const str = { type: "string" };
const strArray = { type: "array", items: str };

const nodeSchema = obj({
  id: str,
  label: str,
  desc: str,
  example: str,
  category: { type: "string", enum: CATEGORIES },
  key: { type: "boolean" },
});
const linkSchema = obj({
  source: str,
  target: str,
  type: { type: "string", enum: ["reinforcing", "balancing"] },
  label: { type: "string", enum: ["+", "-"] },
  lag: str,
});
const loopSchema = obj({
  id: str,
  type: { type: "string", enum: ["R", "B"] },
  name: str,
  desc: str,
  nodes: strArray,
});

export const COLLISION_DIFF_SCHEMA = obj({
  narrative: str,
  addNodes: { type: "array", items: nodeSchema },
  updateNodes: { type: "array", items: nodeSchema },
  removeNodeIds: strArray,
  addLinks: { type: "array", items: linkSchema },
  removeLinks: { type: "array", items: obj({ source: str, target: str }) },
  addLoops: { type: "array", items: loopSchema },
  updateLoops: { type: "array", items: loopSchema },
  removeLoopIds: strArray,
  addArchetypes: {
    type: "array",
    items: obj({ id: str, name: str, description: str, relatedLoops: strArray }),
  },
});


const archetypeSchema = obj({ id: str, name: str, description: str, relatedLoops: strArray });

/** Full SystemModel as a structured-output schema (used by Generate). */
export const SYSTEM_MODEL_SCHEMA = obj({
  name: str,
  description: str,
  nodes: { type: "array", items: nodeSchema },
  links: { type: "array", items: linkSchema },
  loops: { type: "array", items: loopSchema },
  archetypes: { type: "array", items: archetypeSchema },
});

export interface CollisionDiff {
  narrative: string;
  addNodes: SystemModelNode[];
  updateNodes: SystemModelNode[];
  removeNodeIds: string[];
  addLinks: SystemModelLink[];
  removeLinks: { source: string; target: string }[];
  addLoops: SystemModelLoop[];
  updateLoops: SystemModelLoop[];
  removeLoopIds: string[];
  addArchetypes: SystemModelArchetype[];
}

const linkKey = (l: { source: string; target: string }) => `${l.source}->${l.target}`;

/** Apply a collision diff and return the merged model plus any dropped references. */
export function mergeCollisionDiff(
  model: SystemModel,
  diff: CollisionDiff
): { model: SystemModel; warnings: string[] } {
  const warnings: string[] = [];

  // Nodes: remove, update in place, then append new ids.
  const removeNodes = new Set(diff.removeNodeIds ?? []);
  const updates = new Map((diff.updateNodes ?? []).map((n) => [n.id, n]));
  const nodes: SystemModelNode[] = model.nodes
    .filter((n) => !removeNodes.has(n.id))
    .map((n) => {
      const u = updates.get(n.id);
      if (!u) return n;
      const { x, y, fx, fy } = n;
      return { ...u, x, y, fx, fy };
    });
  for (const id of updates.keys()) {
    if (!model.nodes.some((n) => n.id === id)) warnings.push(`updateNodes: unknown variable "${id}" ignored`);
  }
  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const n of diff.addNodes ?? []) {
    if (nodeIds.has(n.id)) {
      warnings.push(`addNodes: "${n.id}" already exists, ignored`);
      continue;
    }
    nodes.push(n);
    nodeIds.add(n.id);
  }

  // Links: drop removed and any touching a removed/unknown node.
  const removeLinks = new Set((diff.removeLinks ?? []).map(linkKey));
  const links: SystemModelLink[] = [];
  const seen = new Set<string>();
  for (const l of [...model.links, ...(diff.addLinks ?? [])]) {
    const key = linkKey(l);
    if (removeLinks.has(key) || seen.has(key)) continue;
    if (!nodeIds.has(l.source) || !nodeIds.has(l.target)) {
      if (diff.addLinks?.includes(l)) warnings.push(`addLinks: ${key} references a missing variable, dropped`);
      continue;
    }
    seen.add(key);
    links.push(l);
  }

  // Loops: remove, update, add; keep only member nodes that exist.
  const removeLoops = new Set(diff.removeLoopIds ?? []);
  const loopUpdates = new Map((diff.updateLoops ?? []).map((l) => [l.id, l]));
  const loopIds = new Set<string>();
  const loops: SystemModelLoop[] = [];
  const pushLoop = (l: SystemModelLoop, source: string) => {
    if (loopIds.has(l.id)) {
      warnings.push(`${source}: loop "${l.id}" already exists, ignored`);
      return;
    }
    const members = l.nodes.filter((id) => nodeIds.has(id));
    if (members.length < 2) {
      warnings.push(`${source}: loop "${l.id}" has fewer than 2 existing variables, dropped`);
      return;
    }
    loopIds.add(l.id);
    loops.push({ ...l, nodes: members });
  };
  for (const l of model.loops) {
    if (removeLoops.has(l.id)) continue;
    pushLoop(loopUpdates.get(l.id) ?? l, "loops");
  }
  for (const l of diff.addLoops ?? []) pushLoop(l, "addLoops");

  // Archetypes: append new, keep only references to existing loops.
  const archetypes: SystemModelArchetype[] = [...(model.archetypes ?? [])];
  const archetypeIds = new Set(archetypes.map((a) => a.id));
  for (const a of diff.addArchetypes ?? []) {
    if (archetypeIds.has(a.id)) continue;
    archetypes.push({ ...a, relatedLoops: a.relatedLoops.filter((id) => loopIds.has(id)) });
    archetypeIds.add(a.id);
  }
  const cleanedArchetypes = archetypes.map((a) => ({
    ...a,
    relatedLoops: a.relatedLoops.filter((id) => loopIds.has(id)),
  }));

  return {
    model: { ...model, nodes, links, loops, archetypes: cleanedArchetypes },
    warnings,
  };
}

/** Drop links and loop members that reference variables that don't exist. */
export function validateModel(model: SystemModel): { model: SystemModel; warnings: string[] } {
  return mergeCollisionDiff(model, {
    narrative: "",
    addNodes: [],
    updateNodes: [],
    removeNodeIds: [],
    addLinks: [],
    removeLinks: [],
    addLoops: [],
    updateLoops: [],
    removeLoopIds: [],
    addArchetypes: [],
  });
}
