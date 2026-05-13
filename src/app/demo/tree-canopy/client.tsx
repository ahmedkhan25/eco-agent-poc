"use client";

import { useMemo, useState } from "react";
import { Trees, Thermometer, Users, Plus, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as ReTooltip, Cell } from "recharts";
import { ConceptHeader } from "@/components/demo/concept-header";
import { InsightCard } from "@/components/demo/insight-card";
import { CANOPY_BLOCKS, HOLLYWOOD_CANOPY_AVG, type CanopyBlock } from "@/lib/demo/concept-data";

export function TreeCanopyClient() {
  const [showEquity, setShowEquity] = useState(false);
  const [selected, setSelected] = useState<string>(CANOPY_BLOCKS[0].id);
  const [cipCart, setCipCart] = useState<string[]>([]);

  const blocks = useMemo<CanopyBlock[]>(() => {
    return [...CANOPY_BLOCKS]
      .map((b) => ({
        ...b,
        priority: showEquity
          ? (100 - b.canopyPct) * 0.4 + b.hviScore * 0.6
          : (100 - b.canopyPct) * 0.5 + b.heatIndex2040 * 0.5,
      }))
      .sort((a, b) => (b as CanopyBlock & { priority: number }).priority - (a as CanopyBlock & { priority: number }).priority);
  }, [showEquity]);

  const selectedBlock = blocks.find((b) => b.id === selected) ?? blocks[0];

  const totalCost = cipCart.reduce(
    (s, id) => s + (CANOPY_BLOCKS.find((b) => b.id === id)?.costUsd ?? 0),
    0
  );
  const totalTrees = cipCart.reduce(
    (s, id) => s + (CANOPY_BLOCKS.find((b) => b.id === id)?.recommendedTrees ?? 0),
    0
  );

  return (
    <div className="px-6 py-6">
      <ConceptHeader
        tag="GIS · Concept"
        title="Tree Canopy & Heat Island Map"
        subtitle="Identify neighborhoods where heat-vulnerable residents live under thin tree canopy, and where the next dollar of urban-forestry investment yields the most cooling. Built on USFS Tree Canopy + Landsat NDVI + ACS demographics."
        right={
          <button
            onClick={() => setShowEquity((v) => !v)}
            className={`text-sm inline-flex items-center gap-1.5 px-3 py-2 rounded-md transition ${
              showEquity ? "bg-[var(--hw-coral)] text-white" : "demo-btn-ghost"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            {showEquity ? "Hide equity overlay" : "Add equity overlay"}
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <InsightCard
          variant="teal"
          badge="CITYWIDE"
          headline={`Hollywood average canopy: ${HOLLYWOOD_CANOPY_AVG}%`}
          body="Compared to Miami-Dade Urban Forestry Plan target of 30%, Hollywood is 12 percentage points behind."
        />
        <InsightCard
          variant="coral"
          badge="HOT BLOCK"
          headline={`${blocks[0].neighborhood}, ${blocks[0].name} — ${blocks[0].canopyPct}% canopy, HVI ${blocks[0].hviScore}`}
          body={`${blocks[0].recommendedTrees} new trees · $${(blocks[0].costUsd / 1000).toFixed(0)}K · ${blocks[0].population.toLocaleString()} residents served.`}
        />
        <InsightCard
          variant="amber"
          badge="2040 PROJECTION"
          headline="Days/yr with heat index > 100°F"
          body={`Worst block: ${Math.max(...CANOPY_BLOCKS.map((b) => b.heatIndex2040))} days · best: ${Math.min(...CANOPY_BLOCKS.map((b) => b.heatIndex2040))} days. ~12-day delta directly attributable to canopy cover.`}
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Split-view maps (SVG-style block grid for now) */}
        <div className="col-span-12 lg:col-span-8 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CanopyHeatPanel
              title="Canopy cover today"
              subtitle="% tree canopy per block (USFS 2023)"
              icon={Trees}
              accent="var(--hw-teal)"
              blocks={blocks}
              selectedId={selected}
              onSelect={setSelected}
              showEquity={showEquity}
              mode="canopy"
            />
            <CanopyHeatPanel
              title="Projected heat 2040"
              subtitle="Days/yr with heat index > 100°F"
              icon={Thermometer}
              accent="var(--hw-coral)"
              blocks={blocks}
              selectedId={selected}
              onSelect={setSelected}
              showEquity={showEquity}
              mode="heat"
            />
          </div>

          {/* Priority blocks bar chart */}
          <div className="demo-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold">
                  {showEquity ? "Combined canopy + heat + equity score" : "Combined canopy + heat score"}
                </div>
                <h3 className="demo-display text-base font-semibold">Top 10 priority blocks</h3>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={blocks} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <ReTooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(_v, _k, p) => {
                      const b = p.payload as CanopyBlock;
                      return [`${b.canopyPct}% canopy · HVI ${b.hviScore}`, b.neighborhood];
                    }}
                  />
                  <Bar dataKey={(b: CanopyBlock & { priority?: number }) => b.priority ?? 0} name="Priority score">
                    {blocks.map((b, i) => (
                      <Cell
                        key={b.id}
                        fill={b.id === selected ? "var(--hw-coral)" : i < 3 ? "var(--hw-teal)" : "#5fb0ad"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="col-span-12 lg:col-span-4 space-y-3">
          {selectedBlock && (
            <div className="demo-card p-4">
              <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold mb-1">
                Selected block
              </div>
              <div className="demo-display font-semibold text-lg leading-tight">
                {selectedBlock.neighborhood} · {selectedBlock.name}
              </div>
              <div className="text-[11px] text-[var(--hw-slate-500)] mt-0.5">
                {selectedBlock.population.toLocaleString()} residents · lat {selectedBlock.lat.toFixed(3)}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <Stat label="Canopy" value={`${selectedBlock.canopyPct}%`} accent="var(--hw-teal)" />
                <Stat label="HVI" value={selectedBlock.hviScore.toString()} accent="var(--hw-coral)" />
                <Stat label="2040 heat days" value={selectedBlock.heatIndex2040.toString()} accent="#f59e0b" />
                <Stat label="Trees needed" value={selectedBlock.recommendedTrees.toString()} accent="var(--hw-emerald)" />
              </div>

              <div className="mt-3 pt-3 border-t border-[var(--hw-slate-200)] text-xs">
                <div className="flex justify-between mb-1">
                  <span className="text-[var(--hw-slate-500)]">Est. cost</span>
                  <span className="demo-mono font-semibold">${selectedBlock.costUsd.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-[var(--hw-slate-500)]">Cooling effect</span>
                  <span className="font-medium">−4.2 °F surface</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--hw-slate-500)]">Carbon</span>
                  <span className="font-medium">~58 tCO₂e/yr at maturity</span>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() =>
                    setCipCart((c) =>
                      c.includes(selectedBlock.id) ? c.filter((x) => x !== selectedBlock.id) : [...c, selectedBlock.id]
                    )
                  }
                  className={`text-sm inline-flex items-center gap-1.5 px-3 py-2 rounded-md transition flex-1 justify-center ${
                    cipCart.includes(selectedBlock.id)
                      ? "bg-[var(--hw-emerald)] text-white"
                      : "demo-btn-primary"
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {cipCart.includes(selectedBlock.id) ? "In CIP cart" : "Add to CIP"}
                </button>
                <button className="demo-btn-ghost text-sm inline-flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  StreetView
                </button>
              </div>
            </div>
          )}

          <div className="demo-card p-4">
            <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold mb-2">
              CIP cart
            </div>
            {cipCart.length === 0 ? (
              <div className="text-xs text-[var(--hw-slate-500)] py-3 text-center">
                Add priority blocks to assemble a capital project list.
              </div>
            ) : (
              <>
                <div className="space-y-1.5 mb-3">
                  {cipCart.map((id) => {
                    const b = CANOPY_BLOCKS.find((x) => x.id === id);
                    if (!b) return null;
                    return (
                      <div key={id} className="text-xs flex justify-between items-center bg-[var(--hw-slate-50)] rounded-md px-2 py-1.5">
                        <span className="font-medium truncate">{b.neighborhood}</span>
                        <span className="demo-mono">${(b.costUsd / 1000).toFixed(0)}K</span>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2 border-t border-[var(--hw-slate-200)] flex justify-between text-xs">
                  <span className="text-[var(--hw-slate-500)]">{totalTrees} trees</span>
                  <span className="demo-display font-semibold">${(totalCost / 1000).toFixed(0)}K</span>
                </div>
                <button className="demo-btn-accent text-sm w-full mt-2">Export as CIP line items</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CanopyHeatPanel({
  title,
  subtitle,
  icon: Icon,
  accent,
  blocks,
  selectedId,
  onSelect,
  showEquity,
  mode,
}: {
  title: string;
  subtitle: string;
  icon: typeof Trees;
  accent: string;
  blocks: CanopyBlock[];
  selectedId: string;
  onSelect: (id: string) => void;
  showEquity: boolean;
  mode: "canopy" | "heat";
}) {
  // Compute bounds
  const minLat = Math.min(...blocks.map((b) => b.lat));
  const maxLat = Math.max(...blocks.map((b) => b.lat));
  const minLng = Math.min(...blocks.map((b) => b.lng));
  const maxLng = Math.max(...blocks.map((b) => b.lng));
  const W = 380;
  const H = 240;
  const padding = 18;

  return (
    <div className="demo-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--hw-slate-200)]">
        <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
        <div className="flex-1 min-w-0">
          <div className="demo-display font-semibold text-sm leading-tight">{title}</div>
          <div className="text-[10px] text-[var(--hw-slate-500)]">{subtitle}</div>
        </div>
      </div>
      <div className="relative bg-[var(--hw-slate-50)]" style={{ height: H }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          {/* Coast line approximation */}
          <line x1={W * 0.84} x2={W * 0.84} y1={0} y2={H} stroke="#0E7C7B" strokeOpacity={0.25} strokeWidth={2} />
          {blocks.map((b) => {
            const x = padding + ((b.lng - minLng) / (maxLng - minLng)) * (W - padding * 2);
            const y = padding + (1 - (b.lat - minLat) / (maxLat - minLat)) * (H - padding * 2);
            const value = mode === "canopy" ? b.canopyPct : b.heatIndex2040;
            const intensity =
              mode === "canopy"
                ? 1 - Math.min(1, value / 30) // low canopy = hot color
                : Math.min(1, value / 55); // high heat = hot color
            // HVI score doubles as an equity-vulnerability proxy in the concept overlay
            const equityBoost = showEquity ? b.hviScore / 100 : 0;
            const finalIntensity = Math.min(1, intensity * 0.7 + equityBoost * 0.5);
            const color = mode === "canopy" ? blendColor("#a7f3d0", "#dc2626", finalIntensity) : blendColor("#fde68a", "#dc2626", finalIntensity);
            const r = 14 + value / 6;
            const isSel = b.id === selectedId;
            return (
              <g key={b.id} onClick={() => onSelect(b.id)} style={{ cursor: "pointer" }}>
                <circle cx={x} cy={y} r={r} fill={color} opacity={0.7} stroke={isSel ? "#0f172a" : "white"} strokeWidth={isSel ? 2 : 1} />
                <text x={x} y={y + 3} fontSize={9} textAnchor="middle" fill="#0f172a" fontWeight="600">
                  {mode === "canopy" ? `${b.canopyPct}%` : value}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="absolute bottom-2 right-2 text-[9px] text-[var(--hw-slate-500)] bg-white/85 px-1.5 py-0.5 rounded">
          {showEquity ? "× ACS SVI overlay" : "no equity overlay"}
        </div>
      </div>
    </div>
  );
}

function blendColor(c1: string, c2: string, t: number) {
  const parse = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const [r1, g1, b1] = parse(c1);
  const [r2, g2, b2] = parse(c2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-md p-2" style={{ backgroundColor: accent + "1a" }}>
      <div className="text-[10px] uppercase tracking-wider text-[var(--hw-slate-500)]">{label}</div>
      <div className="demo-display text-lg font-semibold" style={{ color: accent }}>{value}</div>
    </div>
  );
}
