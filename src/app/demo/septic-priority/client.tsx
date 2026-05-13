"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Droplets,
  Sparkles,
  Loader2,
  Download,
  GitCompareArrows,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as ReTooltip, Legend, Cell } from "recharts";
import { SEPTIC_PARCELS, HOLLYWOOD_CENTER, type SepticParcel } from "@/lib/demo/hollywood-data";
import { InsightCard } from "@/components/demo/insight-card";

type Weights = { gw: number; tide: number; cost: number; equity: number };

const DEFAULT_WEIGHTS: Weights = { gw: 25, tide: 25, cost: 25, equity: 25 };

const PHASE_COLORS = ["#0E7C7B", "#27ad9b", "#F4A261", "#e87a4a", "#9b6dab", "#e11d48"];
const PHASE_NAMES = [
  "Phase 1 — Year 1–5",
  "Phase 2 — Year 6–10",
  "Phase 3 — Year 11–15",
  "Phase 4 — Year 16–20",
  "Phase 5 — Year 21–25",
  "Phase 6 — Year 26–30",
];

// Composite score: higher = convert sooner.
function composite(p: SepticParcel, w: Weights) {
  // cost is inverted — lower cost should score higher
  return (
    (w.gw * p.groundwaterRisk +
      w.tide * p.tidalFloodExposure +
      w.cost * (100 - p.costToConnect) +
      w.equity * p.socialEquity) /
    100
  );
}

// Current city plan: Boulevard Heights first, then Driftwood, then Hollywood Hills…
function cityPlanPhase(p: SepticParcel): 1 | 2 | 3 | 4 | 5 | 6 {
  switch (p.neighborhood) {
    case "Boulevard Heights":
      return 1;
    case "Driftwood":
      return 2;
    case "Hollywood Hills":
      return 3;
    case "Liberia":
      return 4;
    case "Royal Poinciana":
      return 5;
    default:
      return 6;
  }
}

interface PhaseStat {
  phase: number;
  name: string;
  parcels: number;
  cost: string;
  costNum: number;
  equityShare: number;
  ghgSaved: number;
}

function computePhases(parcels: SepticParcel[]): PhaseStat[] {
  const stats: Record<number, { parcels: number; equitySum: number; ghg: number; costSum: number }> = {};
  for (const p of parcels) {
    if (!p.phase) continue;
    stats[p.phase] = stats[p.phase] ?? { parcels: 0, equitySum: 0, ghg: 0, costSum: 0 };
    stats[p.phase].parcels += 1;
    stats[p.phase].equitySum += p.socialEquity >= 60 ? 1 : 0;
    stats[p.phase].ghg += 0.25; // tCO2e / parcel (rough methane offset placeholder)
    stats[p.phase].costSum += 8000 + p.costToConnect * 75; // per parcel
  }
  return Array.from({ length: 6 }, (_, i) => {
    const idx = (i + 1) as 1 | 2 | 3 | 4 | 5 | 6;
    const s = stats[idx] ?? { parcels: 0, equitySum: 0, ghg: 0, costSum: 0 };
    return {
      phase: idx,
      name: PHASE_NAMES[i],
      parcels: s.parcels,
      cost: s.costSum >= 1_000_000 ? `$${(s.costSum / 1_000_000).toFixed(1)}M` : `$${(s.costSum / 1_000).toFixed(0)}K`,
      costNum: s.costSum,
      equityShare: s.parcels ? Math.round((s.equitySum / s.parcels) * 100) : 0,
      ghgSaved: s.ghg,
    };
  });
}

export function SepticClient() {
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [solving, setSolving] = useState(false);
  const [optimized, setOptimized] = useState<SepticParcel[] | null>(null);
  const [compare, setCompare] = useState(false);

  const cityPlanParcels = useMemo<SepticParcel[]>(
    () => SEPTIC_PARCELS.map((p) => ({ ...p, phase: cityPlanPhase(p) })),
    []
  );

  const rebalance = (key: keyof Weights, value: number) => {
    const total = weights.gw + weights.tide + weights.cost + weights.equity;
    const others = total - weights[key];
    const delta = value - weights[key];
    if (others === 0) {
      setWeights({ ...weights, [key]: value });
      return;
    }
    const newWeights = { ...weights, [key]: value };
    const otherKeys = (Object.keys(weights) as Array<keyof Weights>).filter((k) => k !== key);
    for (const k of otherKeys) {
      newWeights[k] = Math.max(0, Math.round(weights[k] - delta * (weights[k] / others)));
    }
    const sum = newWeights.gw + newWeights.tide + newWeights.cost + newWeights.equity;
    if (sum !== 100) {
      // adjust the first non-key with non-zero
      const fix = otherKeys.find((k) => newWeights[k] > 0) ?? otherKeys[0];
      newWeights[fix] += 100 - sum;
    }
    setWeights(newWeights);
  };

  // Solve: score every parcel, sort desc, slice into 6 phases.
  const solve = () => {
    setSolving(true);
    setTimeout(() => {
      const scored = SEPTIC_PARCELS.map((p) => ({ ...p, _score: composite(p, weights) }))
        .sort((a, b) => b._score - a._score);
      const phaseSize = Math.ceil(scored.length / 6);
      const result: SepticParcel[] = scored.map((p, i) => ({
        ...p,
        phase: (Math.min(6, Math.floor(i / phaseSize) + 1) as 1 | 2 | 3 | 4 | 5 | 6),
      }));
      setOptimized(result);
      setSolving(false);
    }, 900);
  };

  // Auto-solve on mount with defaults
  useEffect(() => {
    solve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const optimizedStats = useMemo(() => computePhases(optimized ?? []), [optimized]);
  const cityPlanStats = useMemo(() => computePhases(cityPlanParcels), [cityPlanParcels]);

  const phase1Equity = optimizedStats[0]?.equityShare ?? 0;
  const totalCost = optimizedStats.reduce((s, p) => s + p.costNum, 0);

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)] mb-1">
          GIS · Cross-pillar
        </div>
        <h1 className="demo-display text-3xl font-semibold leading-tight">
          Septic-to-Sewer Prioritization
        </h1>
        <p className="text-sm text-[var(--hw-slate-700)] mt-1.5 max-w-3xl leading-relaxed">
          17,000 unsewered parcels and $1.3B to spend over 30 years. EcoHeart ranks every parcel on{" "}
          <span className="font-medium">risk × cost × equity</span> and re-clusters the phasing live.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left: controls */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
          <div className="demo-card p-4">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-3">
              Weights (auto-rebalance to 100)
            </div>
            <WeightSlider label="Groundwater risk" value={weights.gw} onChange={(v) => rebalance("gw", v)} />
            <WeightSlider label="Tidal flood exposure" value={weights.tide} onChange={(v) => rebalance("tide", v)} />
            <WeightSlider label="Cost to connect" value={weights.cost} onChange={(v) => rebalance("cost", v)} />
            <WeightSlider label="Social equity" value={weights.equity} onChange={(v) => rebalance("equity", v)} />
            <div className="text-[10px] text-[var(--hw-slate-500)] text-center mt-2">
              total: {weights.gw + weights.tide + weights.cost + weights.equity}
            </div>
            <button
              onClick={solve}
              disabled={solving}
              className="demo-btn-primary text-sm w-full mt-3 inline-flex items-center justify-center gap-2"
            >
              {solving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Solve
            </button>
          </div>

          <div className="demo-card p-4">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-2">
              Budget envelope
            </div>
            <div className="demo-display text-xl font-semibold">$1.3B</div>
            <div className="text-xs text-[var(--hw-slate-500)] mt-0.5">
              30 yrs · 6 phases · ~17,000 parcels
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--hw-slate-200)] text-xs space-y-1">
              <Row label="CDBG reserve fee / parcel" value="$2,130" />
              <Row label="Septic abandonment" value="~$2,000" />
              <Row label="Notification window" value="90 days" />
            </div>
          </div>

          <button
            onClick={() => setCompare((c) => !c)}
            className={`text-sm inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border ${
              compare ? "bg-[var(--hw-coral)] text-white border-[var(--hw-coral)]" : "demo-btn-ghost"
            }`}
          >
            <GitCompareArrows className="h-3.5 w-3.5" />
            {compare ? "Hide comparison" : "Compare to current city plan"}
          </button>
        </div>

        {/* Center: maps */}
        <div className="col-span-12 lg:col-span-9 space-y-3">
          {/* Insight strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <InsightCard
              variant="teal"
              badge="OPTIMIZED · PHASE 1"
              headline={`${optimizedStats[0]?.parcels ?? 0} parcels prioritized — ${phase1Equity}% in equity-priority tracts.`}
              body="Composite score = (Groundwater × Tide × CostInv × Equity) / 100."
              sources={[
                {
                  doc: "Hollywood Public Utilities Master Plan (Oct 22, 2025)",
                  quote: "$1.3B of the $2.5B plan is septic-to-sewer expansion.",
                },
              ]}
            />
            <InsightCard
              variant="coral"
              badge="ALL PHASES"
              headline={`Plan total: $${(totalCost / 1_000_000).toFixed(0)}M (model). Citywide methane offset ≈ ${optimizedStats.reduce((s, p) => s + p.ghgSaved, 0).toFixed(0)} tCO₂e/yr.`}
              sources={[
                {
                  doc: "Sustainable Hollywood Action Plan · Action 24",
                  quote: "Living shorelines + tidal-flooding mitigation paired with sewer expansion in the Lakes.",
                },
              ]}
            />
            <InsightCard
              variant="amber"
              badge="EQUITY"
              headline="Boulevard Heights + Liberia tracts are CDBG-eligible — qualifying for zero-interest forgivable connection loans."
              body="$2,130 Reserve Capacity Fee + ~$2,000 abandonment. Forgiven after 5 years of owner-occupancy."
            />
          </div>

          {/* Map */}
          <div className={`demo-card p-4 ${compare ? "grid grid-cols-2 gap-3" : ""}`}>
            {compare && (
              <ParcelCanvas
                title="Current city plan"
                subtitle="Boulevard Heights → Driftwood → Hills → Liberia"
                parcels={cityPlanParcels}
              />
            )}
            <ParcelCanvas
              title={compare ? "EcoHeart-optimized" : "Optimized phasing"}
              subtitle={`Weights: GW ${weights.gw} · Tide ${weights.tide} · Cost ${weights.cost} · Equity ${weights.equity}`}
              parcels={optimized ?? []}
            />
          </div>

          {/* Bottom chart */}
          <div className="demo-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)]">
                  Phase comparison
                </div>
                <h3 className="demo-display text-base font-semibold">Parcels &amp; cost per phase</h3>
              </div>
              <button className="demo-btn-ghost text-sm inline-flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={optimizedStats} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
                  <XAxis dataKey="phase" tickFormatter={(p) => `P${p}`} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ReTooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    labelFormatter={(p) => `Phase ${p}`}
                    formatter={(v: number, name: string) =>
                      name === "parcels" ? [`${v} parcels`, "Parcels"] : [v, name]
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="parcels" name="Parcels">
                    {optimizedStats.map((_, i) => (
                      <Cell key={i} fill={PHASE_COLORS[i]} />
                    ))}
                  </Bar>
                  <Bar dataKey="equityShare" name="% in equity-priority tracts" fill="var(--hw-coral)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {compare && (
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <PhaseTable title="Current plan" rows={cityPlanStats} />
                <PhaseTable title="EcoHeart-optimized" rows={optimizedStats} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeightSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[var(--hw-slate-700)]">{label}</span>
        <span className="demo-mono text-[var(--hw-teal)] font-semibold">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--hw-teal)]"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[var(--hw-slate-700)]">
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function PhaseTable({ title, rows }: { title: string; rows: PhaseStat[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-1">
        {title}
      </div>
      <div className="border border-[var(--hw-slate-200)] rounded-md overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-[var(--hw-slate-50)]">
            <tr>
              <th className="text-left px-2 py-1 font-medium">Phase</th>
              <th className="text-right px-2 py-1 font-medium">Parcels</th>
              <th className="text-right px-2 py-1 font-medium">Cost</th>
              <th className="text-right px-2 py-1 font-medium">Equity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.phase} className="border-t border-[var(--hw-slate-200)]">
                <td className="px-2 py-1">
                  <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: PHASE_COLORS[r.phase - 1] }} />
                  P{r.phase}
                </td>
                <td className="text-right demo-mono px-2 py-1">{r.parcels}</td>
                <td className="text-right demo-mono px-2 py-1">{r.cost}</td>
                <td className="text-right demo-mono px-2 py-1">{r.equityShare}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Lightweight SVG canvas that plots parcels on a normalized 0–1 lat/lng range
 * and colors each by phase. Avoids the heavier Leaflet for the comparison-view UX.
 */
function ParcelCanvas({
  title,
  subtitle,
  parcels,
}: {
  title: string;
  subtitle: string;
  parcels: SepticParcel[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 400 });

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  // Compute bounds once
  const bounds = useMemo(() => {
    if (!parcels.length) return null;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const p of parcels) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }
    return { minLat, maxLat, minLng, maxLng };
  }, [parcels]);

  const project = (lat: number, lng: number) => {
    if (!bounds) return [0, 0];
    const padding = 16;
    const x = padding + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (size.w - padding * 2);
    const y = padding + (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * (size.h - padding * 2);
    return [x, y];
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)]">
            {title}
          </div>
          <div className="text-xs text-[var(--hw-slate-500)]">{subtitle}</div>
        </div>
        <div className="flex items-center gap-1">
          {PHASE_NAMES.map((_, i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: PHASE_COLORS[i] }}
              title={`Phase ${i + 1}`}
            />
          ))}
        </div>
      </div>
      <div ref={ref} className="relative h-72 bg-[var(--hw-slate-50)] rounded-md overflow-hidden border border-[var(--hw-slate-200)]">
        <svg width={size.w} height={size.h} className="absolute inset-0">
          {/* Faint Intracoastal line — bbox right edge */}
          <line
            x1={size.w * 0.75}
            x2={size.w * 0.75}
            y1={0}
            y2={size.h}
            stroke="#0E7C7B"
            strokeOpacity={0.15}
            strokeWidth={2}
          />
          {parcels.map((p) => {
            const [x, y] = project(p.lat, p.lng);
            const color = p.phase ? PHASE_COLORS[p.phase - 1] : "var(--hw-slate-200)";
            return <circle key={p.id} cx={x} cy={y} r={2.5} fill={color} fillOpacity={0.8} />;
          })}
        </svg>
        <div className="absolute bottom-2 right-2 text-[10px] text-[var(--hw-slate-500)] bg-white/70 px-1.5 py-0.5 rounded">
          {parcels.length} parcels (sampled)
        </div>
      </div>
    </div>
  );
}
