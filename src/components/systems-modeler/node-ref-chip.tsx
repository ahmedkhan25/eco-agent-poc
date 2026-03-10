"use client";

import React from "react";
import { useSystemModelerStore } from "@/lib/systems-modeler/store";
import { CATEGORY_COLORS, LINK_COLORS } from "@/lib/systems-modeler/constants";

interface NodeRefChipProps {
  nodeId: string;
  label: string;
  removed?: boolean;
}

export function NodeRefChip({ nodeId, label, removed }: NodeRefChipProps) {
  const store = useSystemModelerStore();
  const node = store.model?.nodes.find((n) => n.id === nodeId);
  const color = node
    ? CATEGORY_COLORS[node.category] || CATEGORY_COLORS.default
    : CATEGORY_COLORS.default;

  const handleClick = () => {
    if (removed || !node) return;
    store.flashHighlight([nodeId]);
  };

  return (
    <button
      onClick={handleClick}
      disabled={removed || !node}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-all hover:brightness-125 disabled:opacity-40 disabled:cursor-default"
      style={{
        background: `${color}20`,
        color,
        border: `1px solid ${color}40`,
        textDecoration: removed ? "line-through" : undefined,
      }}
      title={removed ? `${label} (removed)` : `Click to highlight "${label}" in diagram`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: color }}
      />
      {label.replace(/\n/g, " ")}
    </button>
  );
}

interface LinkRefChipProps {
  sourceId: string;
  targetId: string;
  type: "reinforcing" | "balancing";
}

export function LinkRefChip({ sourceId, targetId, type }: LinkRefChipProps) {
  const store = useSystemModelerStore();
  const sourceNode = store.model?.nodes.find((n) => n.id === sourceId);
  const targetNode = store.model?.nodes.find((n) => n.id === targetId);
  const color = LINK_COLORS[type];

  const handleClick = () => {
    if (!store.model) return;
    const linkIdx = store.model.links.findIndex(
      (l) => l.source === sourceId && l.target === targetId
    );
    const nodeIds = [sourceId, targetId].filter((id) =>
      store.model!.nodes.some((n) => n.id === id)
    );
    store.flashHighlight(nodeIds, linkIdx >= 0 ? [linkIdx] : []);
  };

  const srcLabel = sourceNode
    ? sourceNode.label.replace(/\n/g, " ")
    : sourceId;
  const tgtLabel = targetNode
    ? targetNode.label.replace(/\n/g, " ")
    : targetId;

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-all hover:brightness-125"
      style={{
        background: `${color}20`,
        color,
        border: `1px solid ${color}40`,
      }}
      title={`Click to highlight this ${type} link in diagram`}
    >
      {srcLabel}
      <span className="opacity-60">&rarr;</span>
      {tgtLabel}
    </button>
  );
}

// Reusable message component rendered inline in CopilotKit chat for action results
interface ActionResultProps {
  message: string;
  nodeRefs?: { id: string; label: string; removed?: boolean }[];
  linkRefs?: { source: string; target: string; type: "reinforcing" | "balancing" }[];
}

export function ActionResult({ message, nodeRefs, linkRefs }: ActionResultProps) {
  return (
    <div className="text-xs text-[#9ab8a2] space-y-1.5 py-1">
      <p>{message}</p>
      {((nodeRefs && nodeRefs.length > 0) || (linkRefs && linkRefs.length > 0)) && (
        <div className="flex flex-wrap gap-1">
          {nodeRefs?.map((ref) => (
            <NodeRefChip
              key={ref.id}
              nodeId={ref.id}
              label={ref.label}
              removed={ref.removed}
            />
          ))}
          {linkRefs?.map((ref) => (
            <LinkRefChip
              key={`${ref.source}-${ref.target}`}
              sourceId={ref.source}
              targetId={ref.target}
              type={ref.type}
            />
          ))}
        </div>
      )}
    </div>
  );
}
