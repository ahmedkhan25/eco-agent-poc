"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  Shield,
  Home,
  Compass,
  Sparkles,
  Wand2,
  RotateCcw,
  Download,
  Network,
  AlertTriangle,
} from "lucide-react";
import {
  PATHWAY_MODELS,
  PATHWAY_NARRATIVES,
  HEALTHCARE_STAFFING_COLLISION,
} from "@/lib/demo/slr-pathways-model";
import { InsightCard } from "@/components/demo/insight-card";

// Lazy-load the heavy D3 diagram
const CausalLoopDiagram = dynamic(
  () =>
    import("@/components/systems-modeler/causal-loop-diagram").then(
      (m) => m.CausalLoopDiagram
    ),
  { ssr: false, loading: () => <div className="w-full h-full bg-[var(--hw-slate-50)]" /> }
);

type PathwayKey = keyof typeof PATHWAY_MODELS;

const PATHWAY_META: Record<PathwayKey, { label: string; icon: typeof Shield; accent: string; sub: string }> = {
  armoring: { label: "Armoring", icon: Shield, accent: "var(--hw-teal)", sub: "Seawalls + pumps + hardened infrastructure" },
  accommodation: { label: "Accommodation", icon: Home, accent: "var(--hw-coral)", sub: "Raise, floodproof, adapt parcel-by-parcel" },
  retreat: { label: "Managed Retreat", icon: Compass, accent: "#9b6dab", sub: "Voluntary buyouts + TDRs + rewilding" },
};

export function PathwaysClient() {
  const [active, setActive] = useState<PathwayKey>("armoring");
  const [collided, setCollided] = useState(false);
  const [humanized, setHumanized] = useState(false);

  const baseModel = PATHWAY_MODELS[active];

  // Apply collision: add edges from the Aha! Paradox concept
  const model = useMemo(() => {
    if (!collided) return baseModel;
    // Only patch the armoring model for the demo (the collision is keyed to its node IDs)
    if (active !== "armoring") return baseModel;
    return {
      ...baseModel,
      name: baseModel.name + " — colliding: Healthcare Staffing",
      links: [
        ...baseModel.links,
        ...HEALTHCARE_STAFFING_COLLISION.newEdges
          .filter((e) => baseModel.nodes.some((n) => n.id === e.from) && baseModel.nodes.some((n) => n.id === e.to))
          .map((e) => ({
            source: e.from,
            target: e.to,
            type: "reinforcing" as const,
            label: "+" as const,
            lag: e.lag,
          })),
      ],
      loops: [
        ...baseModel.loops,
        {
          id: "R3",
          type: "R" as const,
          name: "Workforce-availability loop",
          desc: HEALTHCARE_STAFFING_COLLISION.isomorphMapping,
          nodes: ["armor", "cat", "stay"],
        },
      ],
      archetypes: [
        ...(baseModel.archetypes ?? []),
        {
          id: "workforce-collision",
          name: "Healthcare-staffing isomorphism",
          description: HEALTHCARE_STAFFING_COLLISION.loadbearingDelusion,
          relatedLoops: ["R3"],
        },
      ],
    };
  }, [active, baseModel, collided]);

  const Icon = PATHWAY_META[active].icon;

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)] mb-1">
            Systems Modeler · Flagship
          </div>
          <h1 className="demo-display text-3xl font-semibold leading-tight">
            SLR Adaptation Pathways
          </h1>
          <p className="text-sm text-[var(--hw-slate-700)] mt-1.5 max-w-2xl leading-relaxed">
            Three pathways. Same SLR projection. Different feedback loops. Use this to explore tradeoffs
            with commissioners before the city locks in a 30-year direction.
          </p>
        </div>
        <button
          onClick={() => {
            setCollided(false);
            setHumanized(false);
          }}
          className="demo-btn-ghost text-sm inline-flex items-center gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>

      {/* Pathway tabs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {(Object.keys(PATHWAY_META) as PathwayKey[]).map((key) => {
          const meta = PATHWAY_META[key];
          const PathIcon = meta.icon;
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => {
                setActive(key);
                setCollided(false);
                setHumanized(false);
              }}
              className="demo-card p-4 text-left transition hover:shadow-md"
              style={
                isActive
                  ? { borderColor: meta.accent, borderWidth: 2, backgroundColor: meta.accent + "0d" }
                  : undefined
              }
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: meta.accent + "1a", color: meta.accent }}
                >
                  <PathIcon className="h-4 w-4" />
                </div>
                {isActive && (
                  <span
                    className="demo-chip"
                    style={{
                      backgroundColor: meta.accent,
                      color: "white",
                      borderColor: "transparent",
                    }}
                  >
                    active
                  </span>
                )}
              </div>
              <div className="demo-display font-semibold text-base">{meta.label}</div>
              <div className="text-xs text-[var(--hw-slate-500)] mt-0.5">{meta.sub}</div>
            </button>
          );
        })}
      </div>

      {/* Diagram + side */}
      <div className="grid grid-cols-12 gap-4">
        {/* Diagram */}
        <div className="col-span-12 xl:col-span-9 2xl:col-span-9">
          <div className="demo-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--hw-slate-200)]">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" style={{ color: PATHWAY_META[active].accent }} />
                <span className="demo-display text-sm font-semibold">{model.name}</span>
                <span className="text-[10px] text-[var(--hw-slate-500)]">
                  {model.nodes.length} variables · {model.links.length} links · {model.loops.length} loops
                </span>
              </div>
              <div className="text-[10px] text-[var(--hw-slate-500)]">
                D3 force layout · drag nodes to rearrange · scroll to zoom
              </div>
            </div>
            <div className="h-[calc(100vh-280px)] min-h-[600px] bg-white">
              <CausalLoopDiagram
                model={model}
                highlightedNodeIds={[]}
                highlightedLinkIndices={[]}
                activeFilters={{ reinforcing: true, balancing: true, nodes: true }}
                forceActive={true}
                onNodeClick={() => {}}
                onLoopClick={() => {}}
                onBackgroundClick={() => {}}
              />
            </div>
          </div>

          {/* Aha collision banner */}
          {collided && (
            <div className="demo-card p-4 mt-3 border-l-4" style={{ borderLeftColor: "#9b6dab" }}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-[#9b6dab] shrink-0" />
                <div className="flex-1">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-[#9b6dab] mb-0.5">
                    Aha! Paradox · Colliding with: {HEALTHCARE_STAFFING_COLLISION.concept}
                  </div>
                  <h3 className="demo-display text-base font-semibold mb-1">Load-bearing delusion identified</h3>
                  <p className="text-sm text-[var(--hw-slate-700)] leading-relaxed">
                    {HEALTHCARE_STAFFING_COLLISION.loadbearingDelusion}
                  </p>
                  <div className="mt-2 text-xs text-[var(--hw-slate-700)] italic">
                    Isomorph mapping: {HEALTHCARE_STAFFING_COLLISION.isomorphMapping}
                  </div>
                  <div className="mt-2 text-[11px] text-[var(--hw-slate-500)]">
                    {HEALTHCARE_STAFFING_COLLISION.newAnnotation}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Humanize narrative */}
          {humanized && (
            <div className="demo-card p-5 mt-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)]">
                    Humanized narrative
                  </div>
                  <h3 className="demo-display text-lg font-semibold">
                    Pathway: {PATHWAY_META[active].label}
                  </h3>
                </div>
                <button className="demo-btn-ghost text-sm inline-flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Export HTML
                </button>
              </div>
              <div
                className="prose prose-sm max-w-none text-[var(--hw-slate-900)] leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: PATHWAY_NARRATIVES[active]
                    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                    .split("\n\n")
                    .map((para) => `<p>${para}</p>`)
                    .join(""),
                }}
              />
            </div>
          )}
        </div>

        {/* Right rail */}
        <div className="col-span-12 xl:col-span-3 2xl:col-span-3 space-y-3">
          <InsightCard
            variant="teal"
            badge="ACTIONS"
            headline="Run the AI workflow."
            body={
              <div className="flex flex-col gap-2 mt-1">
                <button
                  onClick={() => setCollided((c) => !c)}
                  className="demo-btn-accent text-sm inline-flex items-center gap-2 justify-center"
                  style={{ backgroundColor: "#9b6dab" }}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  {collided ? "Reset collision" : `Collide with "${HEALTHCARE_STAFFING_COLLISION.concept}"`}
                </button>
                <button
                  onClick={() => setHumanized((h) => !h)}
                  className="demo-btn-primary text-sm inline-flex items-center gap-2 justify-center"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {humanized ? "Hide narrative" : "Humanize (800–1200 words)"}
                </button>
              </div>
            }
          />

          <div className="demo-card p-4">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-2">
              Loops in this pathway
            </div>
            <div className="space-y-2">
              {model.loops.map((loop) => (
                <div key={loop.id} className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="demo-chip"
                      style={{
                        backgroundColor: loop.type === "R" ? "#fee2e2" : "#dbeafe",
                        color: loop.type === "R" ? "#dc2626" : "#1d4ed8",
                        borderColor: "transparent",
                      }}
                    >
                      {loop.id} · {loop.type === "R" ? "Reinforcing" : "Balancing"}
                    </span>
                    <span className="font-medium text-[var(--hw-slate-900)]">{loop.name}</span>
                  </div>
                  <p className="text-[var(--hw-slate-500)] mt-1 leading-snug pl-1">{loop.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="demo-card p-4">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-2">
              Archetypes
            </div>
            {(model.archetypes ?? []).map((a) => (
              <div key={a.id} className="text-xs mb-2 last:mb-0">
                <div className="font-medium text-[var(--hw-slate-900)]">{a.name}</div>
                <p className="text-[var(--hw-slate-500)] mt-0.5 leading-snug">{a.description}</p>
              </div>
            ))}
          </div>

          <div className="demo-card p-4 text-[11px] text-[var(--hw-slate-500)] leading-snug">
            <div className="flex items-center gap-1.5 mb-1 text-[var(--hw-slate-700)] font-medium">
              <Network className="h-3 w-3" />
              Powered by Gene Bellinger CLD methodology
            </div>
            The same Systems Modeler that powers EcoHeart's Olympia POC. Each pathway model is exportable
            as raw JSON and as a self-contained interactive HTML for sharing with commissioners.
          </div>
        </div>
      </div>
    </div>
  );
}
