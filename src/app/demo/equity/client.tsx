"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Users, TrendingUp, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as ReTooltip, Cell } from "recharts";
import { ConceptHeader } from "@/components/demo/concept-header";
import { InsightCard } from "@/components/demo/insight-card";
import { EQUITY_BLOCKS, type EquityBlock } from "@/lib/demo/concept-data";

type Weights = { exposure: number; equity: number };

const DEFAULT_WEIGHTS: Weights = { exposure: 50, equity: 50 };

const PEER_AAAS = [
  { name: "Hollywood — Liberia Core", svi: 82, exposure: 72, status: "Proposed" },
  { name: "Miami-Dade — Little River AAA", svi: 88, exposure: 78, status: "Adopted 2023" },
  { name: "Fort Lauderdale — River Oaks", svi: 79, exposure: 68, status: "Adopted 2024" },
  { name: "Miami Beach — North Shore", svi: 73, exposure: 81, status: "Pilot" },
  { name: "Hollywood — South Lake South", svi: 64, exposure: 91, status: "Proposed" },
];

export function EquityClient() {
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [selected, setSelected] = useState<string>(EQUITY_BLOCKS[0].id);

  const scored = useMemo(() => {
    return [...EQUITY_BLOCKS]
      .map((b) => {
        const exposureScore = (b.floodExposure + b.heatExposure + b.surgeExposure) / 3;
        const equityScore = (b.lmiPct + b.svi + b.noVehiclePct + b.over65Pct) / 4;
        const composite = (weights.exposure * exposureScore + weights.equity * equityScore) / 100;
        return { ...b, exposureScore, equityScore, composite };
      })
      .sort((a, b) => b.composite - a.composite);
  }, [weights]);

  const selectedBlock = scored.find((b) => b.id === selected) ?? scored[0];
  const top3 = scored.slice(0, 3);

  return (
    <div className="px-6 py-6">
      <ConceptHeader
        tag="GIS + Agent · Concept"
        title="Climate Equity Index Dashboard"
        subtitle="Overlay Hollywood's flood / heat / surge exposure with ACS demographics, CDC Social Vulnerability Index, and HUD LMI — surface where the highest climate burden meets the lowest adaptive capacity."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <InsightCard
          variant="teal"
          badge="TOP PRIORITY"
          headline={`${top3[0].neighborhood} · ${top3[0].name}`}
          body={`Composite score ${top3[0].composite.toFixed(0)} · ${top3[0].population.toLocaleString()} residents · ${top3[0].lmiPct}% LMI · SVI ${top3[0].svi}.`}
        />
        <InsightCard
          variant="coral"
          badge="ADAPTATION ACTION AREA"
          headline="Miami-Dade's Little River AAA is the precedent — $40M+ moving"
          body="Septic-to-sewer + stormwater + affordable housing, anchored to the highest combined burden zone."
        />
        <InsightCard
          variant="amber"
          badge="HOLLYWOOD STATUS"
          headline="No formally adopted AAA today"
          body="2050 Comprehensive Plan update is expected to introduce the framework; EcoHeart drafts the candidate boundary list."
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left: weights + map */}
        <div className="col-span-12 lg:col-span-8 space-y-3">
          {/* Weights */}
          <div className="demo-card p-4">
            <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold mb-3">
              Composite weight (auto-rebalance to 100)
            </div>
            <div className="space-y-3">
              <WeightSlider
                label="Climate exposure (flood + heat + surge)"
                value={weights.exposure}
                onChange={(v) => setWeights({ exposure: v, equity: 100 - v })}
                accent="var(--hw-teal)"
              />
              <WeightSlider
                label="Equity / adaptive capacity (LMI + SVI + age + mobility)"
                value={weights.equity}
                onChange={(v) => setWeights({ exposure: 100 - v, equity: v })}
                accent="var(--hw-coral)"
              />
            </div>
            <div className="text-[10px] text-[var(--hw-slate-500)] text-center mt-2">
              total: {weights.exposure + weights.equity}
            </div>
          </div>

          {/* Choropleth */}
          <div className="demo-card overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--hw-slate-200)]">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)]">
                Block-level composite score
              </span>
              <span className="text-[10px] text-[var(--hw-slate-500)]">
                ACS B19013 · CDC SVI · HUD CDBG · NOAA SLR
              </span>
            </div>
            <div className="relative bg-[var(--hw-slate-50)] h-72">
              <EquityChoropleth blocks={scored} selectedId={selected} onSelect={setSelected} />
            </div>
          </div>

          {/* Bar chart */}
          <div className="demo-card p-4">
            <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold mb-2">
              Ranked priority blocks
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scored} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
                  <XAxis dataKey="neighborhood" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={56} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <ReTooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(_v, _k, p) => {
                      const b = p.payload as EquityBlock & { composite: number };
                      return [b.composite.toFixed(0), b.name];
                    }}
                  />
                  <Bar dataKey="composite" name="Composite score">
                    {scored.map((b, i) => (
                      <Cell key={b.id} fill={b.id === selected ? "var(--hw-coral)" : i < 3 ? "var(--hw-teal)" : "#5fb0ad"} />
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
                Block profile
              </div>
              <div className="demo-display font-semibold text-lg leading-tight">
                {selectedBlock.neighborhood}
              </div>
              <div className="text-xs text-[var(--hw-slate-500)] mt-0.5">{selectedBlock.name} · {selectedBlock.population.toLocaleString()} residents</div>

              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <Stat label="Composite" value={selectedBlock.composite.toFixed(0)} accent="var(--hw-coral)" />
                <Stat label="Exposure" value={selectedBlock.exposureScore.toFixed(0)} accent="var(--hw-teal)" />
                <Stat label="LMI" value={`${selectedBlock.lmiPct}%`} accent="#9b6dab" />
                <Stat label="SVI" value={selectedBlock.svi.toString()} accent="#f59e0b" />
              </div>

              <div className="mt-3 pt-3 border-t border-[var(--hw-slate-200)] text-xs space-y-1">
                <Row label="Flood exposure" value={`${selectedBlock.floodExposure}/100`} />
                <Row label="Heat exposure" value={`${selectedBlock.heatExposure}/100`} />
                <Row label="Surge exposure" value={`${selectedBlock.surgeExposure}/100`} />
                <Row label="No-vehicle households" value={`${selectedBlock.noVehiclePct}%`} />
                <Row label="Age 65+" value={`${selectedBlock.over65Pct}%`} />
              </div>

              <button className="demo-btn-accent text-sm w-full mt-3 inline-flex items-center justify-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Propose as new AAA
              </button>
            </div>
          )}

          <div className="demo-card overflow-hidden">
            <div className="relative h-32">
              <Image src="/demo/equity.png" alt="Equity overlay neighborhoods" fill className="object-cover" sizes="33vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 text-white" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
                <div className="text-[10px] uppercase tracking-wider font-bold">Compact-region AAA benchmark</div>
                <div className="demo-display text-sm font-semibold">5 candidate zones across 4 cities</div>
              </div>
            </div>
            <div className="p-3">
              <div className="space-y-1.5">
                {PEER_AAAS.map((a) => (
                  <div key={a.name} className="text-xs flex items-center justify-between">
                    <span className="truncate">{a.name}</span>
                    <span className="demo-chip">{a.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EquityChoropleth({
  blocks,
  selectedId,
  onSelect,
}: {
  blocks: (EquityBlock & { composite: number })[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const minLat = Math.min(...blocks.map((b) => b.lat));
  const maxLat = Math.max(...blocks.map((b) => b.lat));
  const minLng = Math.min(...blocks.map((b) => b.lng));
  const maxLng = Math.max(...blocks.map((b) => b.lng));
  const W = 760;
  const H = 280;
  const padding = 24;

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <line x1={W * 0.84} x2={W * 0.84} y1={0} y2={H} stroke="#0E7C7B" strokeOpacity={0.25} strokeWidth={2} />
      {blocks.map((b) => {
        const x = padding + ((b.lng - minLng) / (maxLng - minLng)) * (W - padding * 2);
        const y = padding + (1 - (b.lat - minLat) / (maxLat - minLat)) * (H - padding * 2);
        const t = b.composite / 100;
        const r = 22 + t * 18;
        // Cream → coral → rose
        const color = blendColor("#fde68a", "#dc2626", t);
        const isSel = b.id === selectedId;
        return (
          <g key={b.id} onClick={() => onSelect(b.id)} style={{ cursor: "pointer" }}>
            <circle cx={x} cy={y} r={r} fill={color} opacity={0.65} stroke={isSel ? "#0f172a" : "white"} strokeWidth={isSel ? 2 : 1} />
            <text x={x} y={y - 4} fontSize={10} textAnchor="middle" fill="#0f172a" fontWeight="700">
              {b.composite.toFixed(0)}
            </text>
            <text x={x} y={y + 8} fontSize={8} textAnchor="middle" fill="#334155">
              {b.neighborhood.slice(0, 12)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function blendColor(c1: string, c2: string, t: number) {
  const parse = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const [r1, g1, b1] = parse(c1);
  const [r2, g2, b2] = parse(c2);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}

function WeightSlider({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[var(--hw-slate-700)]">{label}</span>
        <span className="demo-mono font-semibold" style={{ color: accent }}>{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: accent }}
      />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-md p-2" style={{ backgroundColor: accent + "1a" }}>
      <div className="text-[10px] uppercase tracking-wider text-[var(--hw-slate-500)]">{label}</div>
      <div className="demo-display text-lg font-semibold" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--hw-slate-500)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

// TrendingUp re-export not used; suppress
export const _t = TrendingUp;
export const _u = Users;
