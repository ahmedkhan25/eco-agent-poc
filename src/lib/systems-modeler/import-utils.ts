/**
 * Import utilities for the Systems Modeler.
 *
 * Handles three source formats:
 *  1. Our exported JSON  (SystemModel with nodes/links/loops/archetypes)
 *  2. Gene Bellinger's JSON (vis.js format: edges, from/to, nodeIds, etc.)
 *  3. Gene Bellinger's HTML (same vis.js data embedded between START/END_DATA_BLOCK markers)
 *
 * When deterministic parsing fails, returns extracted content for an AI fallback.
 */

import type {
  SystemModel,
  SystemModelNode,
  SystemModelLink,
  SystemModelLoop,
  SystemModelArchetype,
  NodeCategory,
} from "./types";

// ── Public result type ──────────────────────────────────────────────────────

export type ImportResult =
  | { ok: true; model: SystemModel }
  | { ok: false; fallbackTopic: string; fallbackContent: string };

// ── Main entry ──────────────────────────────────────────────────────────────

export function parseImportedFile(
  fileContent: string,
  fileName: string
): ImportResult {
  try {
    const ext = fileName.split(".").pop()?.toLowerCase();

    if (ext === "json") {
      return parseJSON(fileContent, fileName);
    }

    if (ext === "html" || ext === "htm") {
      return parseHTML(fileContent, fileName);
    }

    // Unknown extension — try JSON first, then AI fallback
    try {
      return parseJSON(fileContent, fileName);
    } catch {
      return buildFallback(fileContent, fileName);
    }
  } catch {
    return buildFallback(fileContent, fileName);
  }
}

// ── JSON parsing ────────────────────────────────────────────────────────────

function parseJSON(raw: string, fileName: string): ImportResult {
  const data = JSON.parse(raw);

  // Detect our format: has `links` array
  if (Array.isArray(data.links) && Array.isArray(data.nodes)) {
    return { ok: true, model: normalizeOurJSON(data) };
  }

  // Detect Gene's format: has `edges` array
  if (Array.isArray(data.edges) && Array.isArray(data.nodes)) {
    return { ok: true, model: normalizeGeneJSON(data, fileName) };
  }

  // Has nodes but neither links nor edges — partial format, try best effort
  if (Array.isArray(data.nodes)) {
    return { ok: true, model: normalizeOurJSON(data) };
  }

  // Unrecognised structure — AI fallback
  return buildFallback(raw, fileName);
}

// ── HTML parsing ────────────────────────────────────────────────────────────

function parseHTML(raw: string, fileName: string): ImportResult {
  // Try to extract data block between markers
  const blockMatch = raw.match(
    /\/\/\s*START_DATA_BLOCK([\s\S]*?)\/\/\s*END_DATA_BLOCK/
  );

  if (blockMatch) {
    try {
      const block = blockMatch[1];
      const nodes = extractJSArray(block, "nodesArray");
      const edges = extractJSArray(block, "edgesData");
      const loops = extractJSArray(block, "savedFeedbackLoops");
      const archetypes = extractJSArray(block, "systemArchetypes");

      // Extract title from <title> tag
      const titleMatch = raw.match(/<title>([\s\S]*?)<\/title>/i);
      const title = titleMatch
        ? titleMatch[1].replace(/\s*[—–-]\s*.+$/, "").trim()
        : fileNameToTitle(fileName);

      const geneData = {
        metadata: { topic: title },
        nodes,
        edges,
        loops,
        archetypes,
      };

      return { ok: true, model: normalizeGeneJSON(geneData, fileName) };
    } catch {
      // Data block extraction failed — try AI fallback with extracted content
      return buildFallback(extractHTMLContent(raw), fileName);
    }
  }

  // No data block markers — check if it's our exported interactive HTML
  const ourModelMatch = raw.match(/const\s+model\s*=\s*(\{[\s\S]*?\});\s*\n/);
  if (ourModelMatch) {
    try {
      const model = JSON.parse(ourModelMatch[1]);
      return { ok: true, model: normalizeOurJSON(model) };
    } catch {
      // fall through
    }
  }

  // No recognisable data — AI fallback
  return buildFallback(extractHTMLContent(raw), fileName);
}

// ── Normalise our format ────────────────────────────────────────────────────

function normalizeOurJSON(data: Record<string, unknown>): SystemModel {
  return {
    name: (data.name as string) || "Imported Model",
    description: (data.description as string) || undefined,
    nodes: ((data.nodes as Record<string, unknown>[]) || []).map(
      (n) =>
        ({
          id: n.id as string,
          label: n.label as string,
          desc: (n.desc as string) || (n.description as string) || "",
          example: n.example as string | undefined,
          category: (n.category as NodeCategory) || "default",
          key: (n.key as boolean) || false,
        }) satisfies SystemModelNode
    ),
    links: ((data.links as Record<string, unknown>[]) || []).map(
      (l) =>
        ({
          source: l.source as string,
          target: l.target as string,
          type: l.type as "reinforcing" | "balancing",
          label: l.label as "+" | "-",
          lag: (l.lag as string) || "",
        }) satisfies SystemModelLink
    ),
    loops: ((data.loops as Record<string, unknown>[]) || []).map(
      (l) =>
        ({
          id: l.id as string,
          type: l.type as "R" | "B",
          name: l.name as string,
          desc: (l.desc as string) || (l.description as string) || "",
          nodes: (l.nodes as string[]) || (l.nodeIds as string[]) || [],
        }) satisfies SystemModelLoop
    ),
    archetypes: ((data.archetypes as Record<string, unknown>[]) || []).map(
      (a) =>
        ({
          id: a.id as string,
          name: a.name as string,
          description: a.description as string,
          relatedLoops:
            (a.relatedLoops as string[]) ||
            mapNodeIdsToLoopIds(
              (a.nodeIds as string[]) || [],
              (data.loops as Record<string, unknown>[]) || []
            ),
        }) satisfies SystemModelArchetype
    ),
  };
}

// ── Normalise Gene's vis.js format ──────────────────────────────────────────

function normalizeGeneJSON(
  data: Record<string, unknown>,
  fileName: string
): SystemModel {
  const meta = data.metadata as Record<string, string> | undefined;
  const name =
    meta?.topic || (data.name as string) || fileNameToTitle(fileName);

  // Nodes
  const rawNodes = (data.nodes as Record<string, unknown>[]) || [];
  const nodes: SystemModelNode[] = rawNodes.map((n) => ({
    id: n.id as string,
    label: stripBracketSuffix(
      ((n.label as string) || "").replace(/\n/g, "\n")
    ),
    desc: stripBracketSuffix(
      (n.description as string) || (n.desc as string) || ""
    ),
    example: n.example as string | undefined,
    category: (n.category as NodeCategory) || "default",
    key: (n.borderWidth as number) > 2 || (n.key as boolean) || false,
  }));

  // Edges → Links
  const rawEdges = (data.edges as Record<string, unknown>[]) || [];
  const links: SystemModelLink[] = rawEdges.map((e) => {
    const parsed = parseGeneEdgeLabel((e.label as string) || "");
    return {
      source: (e.from as string) || (e.source as string) || "",
      target: (e.to as string) || (e.target as string) || "",
      type: parsed.type,
      label: parsed.polarity,
      lag: parsed.lag,
    };
  });

  // Loops
  const rawLoops = (data.loops as Record<string, unknown>[]) || [];
  const loops: SystemModelLoop[] = rawLoops.map((l) => ({
    id: l.id as string,
    type: l.type as "R" | "B",
    name: stripLoopPrefix(
      stripBracketSuffix((l.name as string) || "")
    ),
    desc: stripBracketSuffix(
      (l.description as string) || (l.desc as string) || ""
    ),
    nodes: (l.nodeIds as string[]) || (l.nodes as string[]) || [],
  }));

  // Archetypes
  const rawArchetypes = (data.archetypes as Record<string, unknown>[]) || [];
  const archetypes: SystemModelArchetype[] = rawArchetypes.map((a) => ({
    id: a.id as string,
    name: a.name as string,
    description: stripBracketSuffix((a.description as string) || ""),
    relatedLoops:
      (a.relatedLoops as string[]) ||
      mapNodeIdsToLoopIds(
        (a.nodeIds as string[]) || [],
        rawLoops
      ),
  }));

  return { name, description: undefined, nodes, links, loops, archetypes };
}

// ── Edge label parser ───────────────────────────────────────────────────────
// Gene's edge labels look like: "Utility Drive\n+\nLag: Immediate [e1]"

function parseGeneEdgeLabel(label: string): {
  type: "reinforcing" | "balancing";
  polarity: "+" | "-";
  lag: string;
} {
  const clean = stripBracketSuffix(label);
  const lines = clean.split("\n").map((l) => l.trim());

  let polarity: "+" | "-" = "+";
  let lag = "";

  for (const line of lines) {
    if (line === "+" || line === "-") {
      polarity = line;
    } else if (/^lag:\s*/i.test(line)) {
      lag = line.replace(/^lag:\s*/i, "").trim();
    }
  }

  return {
    type: polarity === "+" ? "reinforcing" : "balancing",
    polarity,
    lag: lag || "Unknown",
  };
}

// ── AI fallback builder ─────────────────────────────────────────────────────

function buildFallback(content: string, fileName: string): ImportResult {
  const topic = fileNameToTitle(fileName);

  // Truncate to ~12K chars to fit AI context
  const truncated =
    content.length > 12000 ? content.slice(0, 12000) + "\n\n[...truncated]" : content;

  return { ok: false, fallbackTopic: topic, fallbackContent: truncated };
}

// ── HTML content extractor ──────────────────────────────────────────────────
// Strips CSS, scripts (except data blocks), and HTML tags to extract useful text

function extractHTMLContent(html: string): string {
  let result = html;

  // Keep any JSON-like structures in scripts
  const jsonBlocks: string[] = [];
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    const scriptContent = match[1];
    // Check if it contains data structures
    if (
      /\bconst\s+\w+\s*=\s*\[[\s\S]*/.test(scriptContent) ||
      /\{[\s\S]*"nodes"[\s\S]*\}/.test(scriptContent)
    ) {
      jsonBlocks.push(scriptContent.slice(0, 4000));
    }
  }

  // Strip style tags
  result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  // Strip script tags
  result = result.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  // Strip HTML tags
  result = result.replace(/<[^>]+>/g, " ");
  // Collapse whitespace
  result = result.replace(/\s+/g, " ").trim();

  // Prepend any extracted data blocks
  if (jsonBlocks.length > 0) {
    result = "EMBEDDED DATA:\n" + jsonBlocks.join("\n\n") + "\n\nPAGE TEXT:\n" + result;
  }

  return result;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Extract a JS array assigned to `varName` from a script block */
function extractJSArray(block: string, varName: string): unknown[] {
  // Match: const varName = [ ... ];  or  const varName = [ ... ].map(...)
  const regex = new RegExp(
    `(?:const|let|var)\\s+${varName}\\s*=\\s*(\\[[\\s\\S]*?\\])\\s*(?:\\.map\\([^)]*\\)\\s*)?;`,
    "m"
  );
  const match = block.match(regex);
  if (!match) return [];

  try {
    return JSON.parse(match[1]);
  } catch {
    // Sometimes the JSON has trailing commas or JS-specific syntax
    // Try cleaning it up
    const cleaned = match[1]
      .replace(/,\s*([}\]])/g, "$1") // Remove trailing commas
      .replace(/undefined/g, "null");
    return JSON.parse(cleaned);
  }
}

/** Strip "[n1]" or "[e5]" suffixes from labels/descriptions */
function stripBracketSuffix(s: string): string {
  return s.replace(/\s*\[[a-zA-Z]\d+\]\s*$/g, "").trim();
}

/** Strip loop ID prefix like "B1: " or "R2: " from loop names */
function stripLoopPrefix(name: string): string {
  return name.replace(/^[RB]\d+:\s*/i, "").trim();
}

/** Convert filename to a readable title */
function fileNameToTitle(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")  // Remove extension
    .replace(/[-_]/g, " ")    // Replace separators
    .replace(/\s+/g, " ")     // Collapse whitespace
    .trim();
}

/** Map archetype nodeIds back to loop IDs based on overlap */
function mapNodeIdsToLoopIds(
  archetypeNodeIds: string[],
  loops: Record<string, unknown>[]
): string[] {
  if (!archetypeNodeIds.length || !loops.length) return [];

  const arcNodeSet = new Set(archetypeNodeIds);
  const matched: string[] = [];

  for (const loop of loops) {
    const loopNodes =
      (loop.nodeIds as string[]) || (loop.nodes as string[]) || [];
    const overlap = loopNodes.filter((n) => arcNodeSet.has(n));
    if (overlap.length > 0) {
      matched.push(loop.id as string);
    }
  }

  return matched;
}
