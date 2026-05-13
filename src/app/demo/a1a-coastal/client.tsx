"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  Wrench,
  Construction,
  Trees,
  Waves,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as ReTooltip, Legend, ReferenceLine } from "recharts";
import { ConceptHeader } from "@/components/demo/concept-header";
import { InsightCard } from "@/components/demo/insight-card";
import { A1A_PUMP_STATIONS, SEAWALL_SEGMENTS, DUNE_ZONES } from "@/lib/demo/concept-data";
import type { HollywoodMapMarker } from "@/components/demo/hollywood-map";

const HollywoodMap = dynamic(
  () => import("@/components/demo/hollywood-map").then((m) => m.HollywoodMap),
  { ssr: false, loading: () => <div className="w-full h-full bg-[var(--hw-slate-50)]" /> }
);

const STATUS_META = {
  active: { label: "Active construction", color: "var(--hw-coral)", Icon: Construction },
  design: { label: "Design phase", color: "var(--hw-amber)", Icon: Wrench },
  complete: { label: "Complete", color: "var(--hw-emerald)", Icon: CheckCircle2 },
} as const;

export function A1AClient() {
  const [activePump, setActivePump] = useState<string | null>("sherman");
  const seawallChartData = SEAWALL_SEGMENTS.map((s) => ({
    name: s.name,
    current: s.currentFt,
    deficit: Math.max(0, s.recommended2060Ft - s.currentFt),
  }));
  const pump = activePump ? A1A_PUMP_STATIONS.find((p) => p.id === activePump) : null;

  const markers: HollywoodMapMarker[] = A1A_PUMP_STATIONS.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    severity: p.percentComplete > 80 ? "low" : p.percentComplete > 50 ? "moderate" : "high",
    label: p.name,
    onClick: () => setActivePump(p.id),
  }));

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <ConceptHeader
        tag="GIS + RAG · Concept"
        title="A1A Coastal Vulnerability Dashboard"
        subtitle="Scrollytelling tour of every mile of A1A in Hollywood — current FDOT pump-station projects, seawall heights, dune health, projected overtopping days. One URL to brief commissioners, residents, and grant reviewers."
      />

      {/* Stop 1: Hero map */}
      <section className="demo-card overflow-hidden mb-4">
        <div className="relative h-64">
          <Image
            src="/demo/a1a-coastal.png"
            alt="A1A barrier-island corridor"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/70" />
          <div className="absolute inset-0 flex flex-col justify-end p-6">
            <div className="text-xs uppercase tracking-widest text-white/80 mb-1">Stop 1 · The corridor</div>
            <h2 className="demo-display text-3xl font-semibold text-white mb-2">
              2.5 miles of barrier island. 21.3 miles of "critically eroded" Broward shoreline.
            </h2>
            <p className="text-sm text-white/90 max-w-2xl leading-relaxed" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.85)" }}>
              A1A from Sheridan St to Hallandale Beach Blvd is the asset Hollywood's tourism economy and emergency-egress system are built on. FDOT and the city are mid-construction on four pump stations and seawall raises. EcoHeart tracks each segment in one view.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <InsightCard variant="teal" badge="LIVE TODAY" headline="4 FDOT pump stations under active construction along A1A." body="Combined $24.7M project value · projected reduction in overtopping days: 26 → 7 per year by 2027." />
        <InsightCard variant="coral" badge="SEAWALL DEFICIT" headline="6 of 6 mapped seawall segments are below the recommended 6.5 ft NAVD88 by 2060." body="Current average top elevation: 4.8 ft. Closing the gap is a ~$22M lift." />
        <InsightCard variant="amber" badge="DUNE HEALTH" headline="159 sea-turtle nests across 5 monitored dune zones in 2025." body="Zone 5 (McKinley → Sheridan) at 33% native vegetation cover — lowest of any zone." />
      </div>

      {/* Stop 2: Pump stations */}
      <section className="demo-card p-5 mb-4">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)]">Stop 2 · Pump stations</div>
            <h2 className="demo-display text-xl font-semibold">FDOT A1A Resilience Improvements</h2>
          </div>
          <span className="demo-chip">Updated weekly</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {A1A_PUMP_STATIONS.map((p) => {
            const meta = STATUS_META[p.status];
            const active = activePump === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActivePump(p.id)}
                className="demo-card p-4 text-left transition hover:shadow-md"
                style={active ? { borderColor: meta.color, borderWidth: 2 } : undefined}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: meta.color + "1a", color: meta.color }}>
                    <meta.Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: meta.color }}>
                    {p.percentComplete}%
                  </span>
                </div>
                <div className="demo-display font-semibold text-sm leading-tight">{p.name}</div>
                <div className="mt-2 h-1.5 bg-[var(--hw-slate-100)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${p.percentComplete}%`, backgroundColor: meta.color }} />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                  <div>
                    <div className="text-[var(--hw-slate-500)]">Spent</div>
                    <div className="demo-mono font-semibold">${p.spentM.toFixed(1)}M</div>
                  </div>
                  <div>
                    <div className="text-[var(--hw-slate-500)]">Of</div>
                    <div className="demo-mono">${p.budgetM.toFixed(1)}M</div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-[var(--hw-slate-200)] text-[11px] text-[var(--hw-slate-700)]">
                  Overtopping: <span className="font-semibold">{p.reductionDaysCurrent}</span>
                  <ArrowRight className="inline h-3 w-3 mx-1" />
                  <span className="font-semibold text-emerald-600">{p.reductionDaysProjected}</span>{" "}days/yr
                </div>
              </button>
            );
          })}
        </div>

        {pump && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 demo-card p-0 overflow-hidden h-72">
              <HollywoodMap
                center={[pump.lat, pump.lng]}
                zoom={16}
                layerIds={["fema-flood"]}
                markers={markers}
                className="h-full w-full"
              />
            </div>
            <div className="demo-card p-4">
              <div className="text-[10px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold">Selected project</div>
              <div className="demo-display font-semibold text-base">{pump.name}</div>
              <div className="mt-3 space-y-2 text-xs">
                <Row label="Budget remaining" value={`$${(pump.budgetM - pump.spentM).toFixed(1)}M`} />
                <Row label="Estimated completion" value="Q1 2027" />
                <Row label="Parcels protected" value="~430" />
                <Row label="Funding mix" value="FDOT 70% · City 30%" />
              </div>
              <button className="demo-btn-primary text-sm mt-3 w-full">View RAG-grounded brief</button>
            </div>
          </div>
        )}
      </section>

      {/* Stop 3: Seawall heights */}
      <section className="demo-card p-5 mb-4">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)]">Stop 3 · Seawalls</div>
            <h2 className="demo-display text-xl font-semibold">Current heights vs SE FL Compact 2060 standard</h2>
          </div>
          <span className="demo-chip demo-chip-coral inline-flex items-center gap-1">
            <Waves className="h-3 w-3" />
            6.5 ft NAVD88 target
          </span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={seawallChartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 7]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
              <ReTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => `${v} ft`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="current" stackId="a" fill="var(--hw-teal)" name="Current top elevation" />
              <Bar dataKey="deficit" stackId="a" fill="var(--hw-rose)" name="Deficit to 2060 standard" />
              <ReferenceLine x={6.5} stroke="#0f172a" strokeDasharray="3 3" label={{ value: "Target 6.5 ft", fill: "#0f172a", fontSize: 10, position: "top" }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 text-[11px] text-[var(--hw-slate-500)]">
          Total deficit: {SEAWALL_SEGMENTS.reduce((s, x) => s + Math.max(0, x.recommended2060Ft - x.currentFt) * x.lengthFt, 0).toLocaleString()} linear-feet-of-raise · est. ~$22M
        </div>
      </section>

      {/* Stop 4: Dune health */}
      <section className="demo-card p-5 mb-4">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)]">Stop 4 · Dunes</div>
            <h2 className="demo-display text-xl font-semibold">Dune Master Plan zones</h2>
          </div>
          <span className="demo-chip demo-chip-emerald inline-flex items-center gap-1">
            <Trees className="h-3 w-3" />
            Native plant palette: sea oats, sea grape, dune sunflower
          </span>
        </div>
        <div className="border border-[var(--hw-slate-200)] rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--hw-slate-50)] text-xs">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Zone</th>
                <th className="text-right px-3 py-2 font-medium">Native veg cover</th>
                <th className="text-right px-3 py-2 font-medium">Last restored</th>
                <th className="text-right px-3 py-2 font-medium">2025 nest count</th>
                <th className="text-right px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {DUNE_ZONES.map((z) => (
                <tr key={z.id} className="border-t border-[var(--hw-slate-200)]">
                  <td className="px-3 py-2 font-medium">{z.name}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-[var(--hw-slate-100)] rounded-full overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${z.cover}%`,
                            backgroundColor: z.cover < 40 ? "var(--hw-rose)" : z.cover < 50 ? "var(--hw-amber)" : "var(--hw-emerald)",
                          }}
                        />
                      </div>
                      <span className="demo-mono">{z.cover}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right demo-mono text-[var(--hw-slate-700)]">{z.lastRestored}</td>
                  <td className="px-3 py-2 text-right demo-mono">{z.nestCount}</td>
                  <td className="px-3 py-2 text-right">
                    {z.cover < 40 ? (
                      <span className="demo-chip demo-chip-rose">Restore</span>
                    ) : z.cover < 50 ? (
                      <span className="demo-chip demo-chip-amber">Monitor</span>
                    ) : (
                      <span className="demo-chip demo-chip-emerald">Healthy</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Stop 5: What's next */}
      <section className="demo-card p-5">
        <div className="flex items-start gap-3 mb-3">
          <AlertTriangle className="h-5 w-5 text-[var(--hw-coral)] mt-0.5" />
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)]">Stop 5 · Next best actions</div>
            <h2 className="demo-display text-xl font-semibold">EcoHeart-recommended capital sequence</h2>
            <p className="text-sm text-[var(--hw-slate-700)] mt-1">In production, these recommendations are generated against the live Hollywood RAG corpus.</p>
          </div>
        </div>
        <ol className="space-y-2">
          {[
            { t: "Accelerate Sherman St + Franklin St pump-station closeouts", f: "Resilient Florida Implementation · $4.5M shortfall · 70% A1A flood-day reduction" },
            { t: "Adopt minimum seawall top elevation citywide (FBC overlay)", f: "Mirror Fort Lauderdale ULDR §47-19.3 · ordinance scope, no capital cost" },
            { t: "Zone 5 dune restoration (McKinley → Sheridan)", f: "Broward Coastal Dune Restoration Grant · $480K · Project ROC partnership" },
            { t: "Tidal valve installation along South Lake / Adams St", f: "Hollywood Hazard Mitigation Plan · $1.2M · HMGP-eligible" },
            { t: "Living shoreline pilot, Hallandale Blvd → Polk", f: "NOAA NCRF · $3.2M · Action 24 of Sustainable Hollywood Action Plan" },
          ].map((r, i) => (
            <li key={i} className="flex items-start gap-3 p-3 border border-[var(--hw-slate-200)] rounded-md">
              <span className="h-6 w-6 rounded-md bg-[var(--hw-teal-50)] text-[var(--hw-teal)] text-xs font-semibold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{r.t}</div>
                <div className="text-xs text-[var(--hw-slate-500)] mt-0.5">{r.f}</div>
              </div>
              <button className="demo-btn-ghost text-xs shrink-0">Open in Grant Finder</button>
            </li>
          ))}
        </ol>
      </section>
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
