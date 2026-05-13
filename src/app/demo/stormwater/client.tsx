"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Droplets,
  Activity,
  ArrowRight,
  Bell,
  FileText,
} from "lucide-react";
import { ComposedChart, Bar, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as ReTooltip, Legend, ReferenceLine } from "recharts";
import { ConceptHeader } from "@/components/demo/concept-header";
import { InsightCard } from "@/components/demo/insight-card";
import { OUTFALLS, OUTFALL_SERIES, type Outfall } from "@/lib/demo/concept-data";
import type { HollywoodMapMarker } from "@/components/demo/hollywood-map";

const HollywoodMap = dynamic(
  () => import("@/components/demo/hollywood-map").then((m) => m.HollywoodMap),
  { ssr: false, loading: () => <div className="w-full h-full bg-[var(--hw-slate-50)]" /> }
);

const STATUS_META = {
  exceedance: { label: "Exceedance", color: "var(--hw-rose)", chip: "demo-chip-rose" },
  watch: { label: "Watch", color: "var(--hw-amber)", chip: "demo-chip-amber" },
  ok: { label: "OK", color: "var(--hw-emerald)", chip: "demo-chip-emerald" },
} as const;

const FL_DEP_LIMIT_ECOLI = 410;

export function StormwaterClient() {
  const [selectedId, setSelectedId] = useState<string>(OUTFALLS[0].id);
  const [tab, setTab] = useState<"outfalls" | "samples" | "alerts">("alerts");
  const selected = OUTFALLS.find((o) => o.id === selectedId);

  const markers: HollywoodMapMarker[] = useMemo(
    () =>
      OUTFALLS.map((o) => ({
        id: o.id,
        lat: o.lat,
        lng: o.lng,
        severity: o.status === "exceedance" ? "high" : o.status === "watch" ? "moderate" : "low",
        label: o.name,
        onClick: () => setSelectedId(o.id),
      })),
    []
  );

  const exceedanceCount = OUTFALLS.filter((o) => o.status === "exceedance").length;
  const totalSepticNear = OUTFALLS.reduce((s, o) => s + o.septicWithin500ft, 0);

  return (
    <div className="px-6 py-6">
      <ConceptHeader
        tag="GIS + Agent · Concept"
        title="Stormwater Outfall + Water Quality"
        subtitle="Near-real-time view of every stormwater outfall discharging into the Intracoastal and Atlantic, paired with bacterial sample history and septic-system proximity. Tells the operational story of why septic-to-sewer matters."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <InsightCard
          variant="amber"
          badge="ACTIVE ALERTS"
          headline={`${exceedanceCount} outfalls in exceedance · 1 with 4+ consecutive months over limit`}
          body="Pattern strongest in the South Lake / Lakes corridor — same area as the F2 septic-to-sewer Phase 1."
        />
        <InsightCard
          variant="teal"
          badge="EPA / FDEP"
          headline={`FL DEP enterococci limit: ${FL_DEP_LIMIT_ECOLI} CFU/100mL · E. coli class: same`}
          body="Sample data from EPA STORET + Florida Watershed Information Network (WIN)."
        />
        <InsightCard
          variant="coral"
          badge="SEPTIC PROXIMITY"
          headline={`${totalSepticNear} septic parcels within 500 ft of mapped outfalls`}
          body="The cross-pillar story: outfall water quality and septic-to-sewer prioritization are the same problem."
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Map */}
        <div className="col-span-12 lg:col-span-7 demo-card p-0 overflow-hidden">
          <div className="h-[480px]">
            <HollywoodMap
              center={[26.0157, -80.139]}
              zoom={13}
              layerIds={["fema-flood"]}
              markers={markers}
              className="h-full w-full"
            />
          </div>
        </div>

        {/* Right pane with tabs */}
        <div className="col-span-12 lg:col-span-5 space-y-3">
          <div className="demo-card overflow-hidden">
            <div className="flex border-b border-[var(--hw-slate-200)]">
              {(["alerts", "outfalls", "samples"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 px-3 py-2.5 text-xs font-medium uppercase tracking-wider transition ${
                    tab === t ? "bg-[var(--hw-teal)] text-white" : "text-[var(--hw-slate-700)] hover:bg-[var(--hw-slate-50)]"
                  }`}
                >
                  {t === "alerts" && <Bell className="inline h-3 w-3 mr-1" />}
                  {t === "outfalls" && <Droplets className="inline h-3 w-3 mr-1" />}
                  {t === "samples" && <Activity className="inline h-3 w-3 mr-1" />}
                  {t}
                </button>
              ))}
            </div>

            {tab === "alerts" && (
              <div className="p-3 max-h-[420px] overflow-y-auto demo-scroll">
                <div className="space-y-2">
                  {OUTFALLS.filter((o) => o.status !== "ok").map((o) => {
                    const meta = STATUS_META[o.status];
                    return (
                      <button
                        key={o.id}
                        onClick={() => setSelectedId(o.id)}
                        className={`w-full text-left p-3 rounded-md border transition ${
                          o.id === selectedId
                            ? "border-[var(--hw-teal)] bg-[var(--hw-teal-50)]"
                            : "border-[var(--hw-slate-200)] hover:border-[var(--hw-teal)]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm">{o.name}</span>
                          <span className={`demo-chip ${meta.chip}`}>{meta.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[var(--hw-slate-700)]">
                          <span>
                            <AlertCircle className="inline h-3 w-3 mr-0.5" style={{ color: meta.color }} />
                            {o.exceedances12mo} exceedances / 12 mo
                          </span>
                          <span>
                            <Droplets className="inline h-3 w-3 mr-0.5" />
                            {o.septicWithin500ft} septic ≤ 500 ft
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === "outfalls" && (
              <div className="p-3 max-h-[420px] overflow-y-auto demo-scroll">
                <div className="space-y-1.5">
                  {OUTFALLS.map((o) => {
                    const meta = STATUS_META[o.status];
                    return (
                      <button
                        key={o.id}
                        onClick={() => setSelectedId(o.id)}
                        className={`w-full text-left flex items-center gap-2 p-2 rounded-md border transition ${
                          o.id === selectedId
                            ? "border-[var(--hw-teal)] bg-[var(--hw-teal-50)]"
                            : "border-[var(--hw-slate-200)] hover:bg-[var(--hw-slate-50)]"
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                        <span className="text-xs flex-1 truncate">{o.name}</span>
                        <span className="text-[11px] text-[var(--hw-slate-500)] demo-mono shrink-0">{o.recentEcoli}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === "samples" && (
              <div className="p-3">
                <div className="text-xs text-[var(--hw-slate-700)] leading-relaxed">
                  EcoHeart pulls samples nightly from EPA STORET + Florida Watershed Information Network (WIN). In production, a Daytona Python job correlates each new sample against rainfall (Broward MORD network) and tide (NOAA Virginia Key) to score whether the exceedance is tidal-driven, rainfall-driven, or chronic.
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="border border-[var(--hw-slate-200)] rounded-md p-2">
                    <div className="text-[10px] uppercase text-[var(--hw-slate-500)]">Samples / yr</div>
                    <div className="demo-display text-lg font-semibold">~2,300</div>
                  </div>
                  <div className="border border-[var(--hw-slate-200)] rounded-md p-2">
                    <div className="text-[10px] uppercase text-[var(--hw-slate-500)]">Auto-classified</div>
                    <div className="demo-display text-lg font-semibold">100%</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Selected outfall detail */}
          {selected && (
            <div className="demo-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold">Outfall detail</div>
                  <div className="demo-display font-semibold text-base leading-tight">{selected.name}</div>
                  <div className="text-[11px] text-[var(--hw-slate-500)] mt-0.5">
                    Discharges to {selected.receivingWater}
                  </div>
                </div>
                <span className={`demo-chip ${STATUS_META[selected.status].chip}`}>
                  {STATUS_META[selected.status].label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <Stat label="Recent" value={`${selected.recentEcoli}`} sub="CFU/100mL" />
                <Stat label="12-mo exceed." value={String(selected.exceedances12mo)} sub="months over" />
                <Stat label="Septic ≤ 500ft" value={String(selected.septicWithin500ft)} sub="parcels" />
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                <button className="demo-btn-primary text-sm inline-flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Investigation memo
                </button>
                <button className="demo-btn-accent text-sm inline-flex items-center gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5" />
                  Open in Septic Map
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Time series for selected outfall */}
      {selected && (
        <div className="demo-card p-5 mt-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold">
                24-month series — {selected.name}
              </div>
              <h3 className="demo-display text-base font-semibold">
                E. coli (CFU/100mL) · monthly rainfall · tide
              </h3>
            </div>
            <span className="text-[11px] text-[var(--hw-slate-500)]">
              FL DEP limit: {FL_DEP_LIMIT_ECOLI} CFU/100mL (dashed line)
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={OUTFALL_SERIES} margin={{ top: 8, right: 16, bottom: 5, left: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={1} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <ReTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="ecoli" name="E. coli (CFU/100mL)" fill="var(--hw-coral)" />
                <Line yAxisId="right" type="monotone" dataKey="rainfallIn" stroke="var(--hw-teal)" strokeWidth={2} name="Rain (in)" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="tideFt" stroke="#9b6dab" strokeWidth={2} name="Tide (ft)" dot={false} strokeDasharray="3 3" />
                <ReferenceLine yAxisId="left" y={FL_DEP_LIMIT_ECOLI} stroke="#dc2626" strokeDasharray="5 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="border border-[var(--hw-slate-200)] rounded-md p-2">
      <div className="text-[10px] uppercase tracking-wider text-[var(--hw-slate-500)]">{label}</div>
      <div className="demo-display text-base font-semibold">{value}</div>
      <div className="text-[10px] text-[var(--hw-slate-500)]">{sub}</div>
    </div>
  );
}

// Type-only import suppression (keeps tree-shaker happy)
export type _O = Outfall;
