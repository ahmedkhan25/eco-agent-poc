"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import { Download, Sparkles, Wand2, TrendingUp, TrendingDown, Hotel } from "lucide-react";
import { ConceptHeader } from "@/components/demo/concept-header";
import { InsightCard } from "@/components/demo/insight-card";
import { TOURISM_CLIMATE_MODEL } from "@/lib/demo/concept-data";

const CausalLoopDiagram = dynamic(
  () =>
    import("@/components/systems-modeler/causal-loop-diagram").then(
      (m) => m.CausalLoopDiagram
    ),
  { ssr: false, loading: () => <div className="w-full h-full bg-[var(--hw-slate-50)]" /> }
);

const SCENARIOS = [
  { id: "baseline", label: "Baseline", description: "Current Hollywood Broadwalk economy.", color: "var(--hw-teal)" },
  { id: "storms+30", label: "+30% storms", description: "Storm frequency rises 30% by 2040.", color: "var(--hw-coral)" },
  { id: "renourish", label: "Annual renourishment", description: "Broward County funds yearly sand-truck cycles.", color: "var(--hw-emerald)" },
];

const STORYBEATS = [
  {
    n: 1,
    title: "Healthy beach is the engine",
    body:
      "Hollywood Beach generates ~$890M in annual visitor spending. Hotels, restaurants, and the Broadwalk concession economy are anchored on beach width and dune health.",
  },
  {
    n: 2,
    title: "Storms compress the engine",
    body:
      "Each major storm season removes sand faster than passive recovery rebuilds it. Hurricane Nicole (2022) cost Hollywood ~$3M in sand replacement and 11 days of Broadwalk closures.",
  },
  {
    n: 3,
    title: "Resilience CIP is the flywheel",
    body:
      "When tourism tax revenue funds renourishment + dune planting + seawall raises, the loop reinforces itself. When it doesn't, the loop dampens.",
  },
];

export function TourismLoopClient() {
  const [scenario, setScenario] = useState<string>("baseline");

  return (
    <div className="px-6 py-6">
      <ConceptHeader
        tag="Systems Modeler · Concept"
        title="Tourism-Climate Feedback Loop"
        subtitle="The Broadwalk is Hollywood's economic engine and its most exposed asset. This model traces the loops between storm risk, beach quality, hotel occupancy, sales-tax revenue, and the city's CIP capacity — making the case that resilience spending is revenue protection."
      />

      {/* Hero photo + framing */}
      <section className="demo-card overflow-hidden mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3">
          <div className="md:col-span-2 relative h-56">
            <Image src="/demo/tourism-loop.png" alt="Hollywood Beach Broadwalk" fill className="object-cover" sizes="66vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 text-white">
              <div className="text-xs uppercase tracking-widest opacity-80 mb-0.5">The asset</div>
              <h2 className="demo-display text-xl font-semibold leading-tight" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.85)" }}>
                2.5 miles of brick promenade · ~$890M annual visitor spend
              </h2>
            </div>
          </div>
          <div className="p-5">
            <div className="text-[10px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold mb-1">Why this model</div>
            <p className="text-sm text-[var(--hw-slate-700)] leading-relaxed">
              When a city commissioner asks "why are we spending on dunes when we have potholes?" — this model is the visual answer. It shows the revenue-into-resilience loop that potholes don't participate in.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <InsightCard
          variant="teal"
          badge="REVENUE FLYWHEEL"
          headline="R1: Beach → Visitor-days → Tax → CIP → Renourishment → Beach"
          body="The reinforcing loop the city wants to protect. Each link has a multi-year lag — slow to build, slow to break."
        />
        <InsightCard
          variant="coral"
          badge="STORM EROSION"
          headline="B1: Storm frequency directly subtracts from beach width"
          body="Sand loss is faster than passive recovery. Only renourishment closes the gap."
        />
        <InsightCard
          variant="amber"
          badge="INSURANCE DRAG"
          headline="B2: Storm frequency → commercial premiums → hotel occupancy"
          body="A second-order penalty: 17 new FL insurers since 2023, but coastal commercial rates climbing 8–14%/yr."
        />
      </div>

      {/* Scenario tabs */}
      <div className="flex flex-wrap gap-2 mb-3">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => setScenario(s.id)}
            className="demo-card p-3 text-left transition hover:shadow-md flex-1 min-w-[200px]"
            style={
              scenario === s.id
                ? { borderColor: s.color, borderWidth: 2, backgroundColor: s.color + "0d" }
                : undefined
            }
          >
            <div className="flex items-center justify-between mb-1">
              <span className="demo-display font-semibold text-sm">{s.label}</span>
              {scenario === s.id && (
                <span className="demo-chip" style={{ backgroundColor: s.color, color: "white", borderColor: "transparent" }}>
                  active
                </span>
              )}
            </div>
            <div className="text-xs text-[var(--hw-slate-500)]">{s.description}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Diagram */}
        <div className="col-span-12 xl:col-span-9">
          <div className="demo-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--hw-slate-200)]">
              <div className="flex items-center gap-2">
                <Hotel className="h-4 w-4 text-[var(--hw-teal)]" />
                <span className="demo-display text-sm font-semibold">{TOURISM_CLIMATE_MODEL.name}</span>
                <span className="text-[10px] text-[var(--hw-slate-500)]">
                  {TOURISM_CLIMATE_MODEL.nodes.length} variables · {TOURISM_CLIMATE_MODEL.links.length} links · {TOURISM_CLIMATE_MODEL.loops.length} loops
                </span>
              </div>
              <div className="flex gap-2">
                <button className="demo-btn-ghost text-xs inline-flex items-center gap-1.5">
                  <Download className="h-3 w-3" />
                  JSON
                </button>
                <button className="demo-btn-ghost text-xs inline-flex items-center gap-1.5">
                  <Download className="h-3 w-3" />
                  HTML
                </button>
              </div>
            </div>
            <div className="h-[calc(100vh-440px)] min-h-[520px] bg-white">
              <CausalLoopDiagram
                model={TOURISM_CLIMATE_MODEL}
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
        </div>

        {/* Right rail */}
        <div className="col-span-12 xl:col-span-3 space-y-3">
          <InsightCard
            variant="teal"
            badge="ACTIONS"
            headline="Run the AI workflow."
            body={
              <div className="flex flex-col gap-2 mt-1">
                <button className="demo-btn-accent text-sm inline-flex items-center gap-2 justify-center" style={{ backgroundColor: "#9b6dab" }}>
                  <Wand2 className="h-3.5 w-3.5" />
                  Collide with "Climate migration"
                </button>
                <button className="demo-btn-primary text-sm inline-flex items-center gap-2 justify-center">
                  <Sparkles className="h-3.5 w-3.5" />
                  Humanize (800–1200 words)
                </button>
              </div>
            }
          />

          <div className="demo-card p-4">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-2">
              Loops in this pathway
            </div>
            <div className="space-y-2">
              {TOURISM_CLIMATE_MODEL.loops.map((loop) => (
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
                      {loop.id} · {loop.type === "R" ? <TrendingUp className="inline h-2.5 w-2.5" /> : <TrendingDown className="inline h-2.5 w-2.5" />} {loop.type === "R" ? "Reinforcing" : "Balancing"}
                    </span>
                  </div>
                  <div className="font-medium text-[var(--hw-slate-900)] mt-0.5">{loop.name}</div>
                  <p className="text-[var(--hw-slate-500)] mt-0.5 leading-snug">{loop.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Story beats */}
      <section className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {STORYBEATS.map((b) => (
          <div key={b.n} className="demo-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-6 w-6 rounded-md bg-[var(--hw-teal)] text-white text-xs font-bold flex items-center justify-center">
                {b.n}
              </span>
              <span className="demo-display font-semibold text-sm">{b.title}</span>
            </div>
            <p className="text-xs text-[var(--hw-slate-700)] leading-relaxed">{b.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
