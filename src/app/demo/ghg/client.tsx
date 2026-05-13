"use client";

import Image from "next/image";
import { useState } from "react";
import { Factory, Car, Building2, Trash2, Flame, Download, RefreshCw, Target } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as ReTooltip, Legend, ReferenceLine, BarChart, Bar, Cell, AreaChart, Area } from "recharts";
import { ConceptHeader } from "@/components/demo/concept-header";
import { InsightCard } from "@/components/demo/insight-card";
import { GHG_SECTORS, GHG_BASELINE_2019, GHG_CURRENT_2025, GHG_TARGET_2050, GHG_GLIDE_PATH } from "@/lib/demo/concept-data";

const SECTOR_META: Record<string, { color: string; icon: typeof Factory }> = {
  "Buildings — Residential": { color: "#0E7C7B", icon: Building2 },
  "Buildings — Commercial": { color: "#27ad9b", icon: Building2 },
  "Transportation — On-road": { color: "#F4A261", icon: Car },
  "Transportation — Marine/Air": { color: "#e08a3e", icon: Car },
  "Waste — Landfill + WWTP": { color: "#9b6dab", icon: Trash2 },
  "Industrial Process": { color: "#f59e0b", icon: Factory },
};

export function GhgClient() {
  const [selectedSector, setSelectedSector] = useState<string>(GHG_SECTORS[0].sector);

  const sectorPie = GHG_SECTORS.map((s) => ({
    sector: s.sector,
    short: s.sector.split(" — ")[1] ?? s.sector,
    value: s.emissions2025,
    color: SECTOR_META[s.sector]?.color ?? "#64748b",
  }));

  const selected = GHG_SECTORS.find((s) => s.sector === selectedSector);
  const reductionToDate = (1 - GHG_CURRENT_2025 / GHG_BASELINE_2019) * 100;
  const target2030 = 0.33; // 33% reduction by 2030 (interim)
  const requiredAnnualReduction = Math.pow(GHG_TARGET_2050 / GHG_CURRENT_2025, 1 / 25) - 1;

  return (
    <div className="px-6 py-6">
      <ConceptHeader
        tag="Agent · Concept"
        title="GHG Inventory Auto-Updater"
        subtitle="Hollywood's Sustainable Action Plan targets 80% GHG reduction by 2050 — but the last community-scale inventory is dated. EcoHeart ingests utility data, DOT VMT, solid-waste tonnage, and wastewater BOD; computes the GPC-protocol inventory; tracks progress against the 2050 glide path."
      />

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <BigStat
          label="2019 baseline"
          value={`${(GHG_BASELINE_2019 / 1000000).toFixed(2)}M`}
          sub="tCO₂e/yr · GPC Basic+"
          accent="var(--hw-slate-500)"
        />
        <BigStat
          label="2025 estimated"
          value={`${(GHG_CURRENT_2025 / 1000000).toFixed(2)}M`}
          sub={`tCO₂e/yr · ${reductionToDate.toFixed(1)}% below baseline`}
          accent="var(--hw-teal)"
        />
        <BigStat
          label="2050 target"
          value={`${(GHG_TARGET_2050 / 1000000).toFixed(2)}M`}
          sub="tCO₂e/yr · 80% reduction"
          accent="var(--hw-emerald)"
        />
        <BigStat
          label="Required annual cut"
          value={`${Math.abs(requiredAnnualReduction * 100).toFixed(1)}%`}
          sub="/yr · 2025 → 2050 glide"
          accent="var(--hw-coral)"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <InsightCard
          variant="teal"
          badge="GLIDE PATH"
          headline={`On track for ${target2030 * 100}% reduction by 2030 (Climate Mayors interim target)`}
          body="Actual 2025 emissions vs glide-path target: marginally above. Building electrification + on-road EV adoption are the leading levers."
        />
        <InsightCard
          variant="coral"
          badge="LARGEST SECTOR"
          headline="On-road transportation: 32% of inventory"
          body="Hollywood's on-road VMT is ~12% above the SE FL regional average — driven by limited transit + tourism."
        />
        <InsightCard
          variant="amber"
          badge="CDP-READY"
          headline="Hollywood already files CDP annually (2019 baseline anchor)"
          body="EcoHeart auto-populates the CDP questionnaire from this inventory in production."
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left: glide path */}
        <div className="col-span-12 lg:col-span-8 space-y-3">
          {/* Glide path chart */}
          <div className="demo-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold">
                  Emissions trajectory vs glide path
                </div>
                <h3 className="demo-display text-base font-semibold">2019 → 2050 · 80% reduction target</h3>
              </div>
              <button className="demo-btn-ghost text-sm inline-flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh with 2025 data
              </button>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={GHG_GLIDE_PATH} margin={{ top: 8, right: 16, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--hw-coral)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--hw-coral)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <ReTooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v) => {
                      const n = typeof v === "number" ? v : null;
                      return n == null ? "—" : `${(n / 1000000).toFixed(2)}M tCO₂e`;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="actual" stroke="var(--hw-coral)" fill="url(#actualFill)" strokeWidth={2} name="Actual" connectNulls={false} dot />
                  <Line type="monotone" dataKey="target" stroke="var(--hw-teal)" strokeWidth={2} strokeDasharray="6 3" name="Compliance glide path" dot={false} />
                  <ReferenceLine y={GHG_TARGET_2050} stroke="var(--hw-emerald)" strokeDasharray="3 3" label={{ value: "2050 target", fill: "var(--hw-emerald)", fontSize: 10, position: "right" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sector breakdown */}
          <div className="demo-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold">
                  2025 emissions by sector
                </div>
                <h3 className="demo-display text-base font-semibold">tCO₂e per year · click to deep-dive</h3>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorPie} margin={{ top: 5, right: 8, bottom: 5, left: 0 }} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="short" tick={{ fontSize: 11 }} width={120} />
                  <ReTooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v: number) => `${(v / 1000).toFixed(1)}K tCO₂e`}
                  />
                  <Bar dataKey="value">
                    {sectorPie.map((s) => (
                      <Cell
                        key={s.sector}
                        fill={s.sector === selectedSector ? "var(--hw-coral)" : s.color}
                        cursor="pointer"
                        onClick={() => setSelectedSector(s.sector)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right: sector deep-dive */}
        <div className="col-span-12 lg:col-span-4 space-y-3">
          {selected && (
            <div className="demo-card p-4">
              <div className="flex items-center gap-2 mb-2">
                {(() => {
                  const meta = SECTOR_META[selected.sector];
                  const SectorIcon = meta?.icon ?? Factory;
                  return (
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: (meta?.color ?? "#64748b") + "1a", color: meta?.color }}>
                      <SectorIcon className="h-4 w-4" />
                    </div>
                  );
                })()}
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold">Sector</div>
                  <div className="demo-display font-semibold text-sm">{selected.sector}</div>
                </div>
              </div>

              <div className="space-y-1.5 mt-3 text-xs">
                <Row label="2019 baseline" value={`${(selected.emissions2019 / 1000).toFixed(0)}K`} />
                <Row label="2025 estimate" value={`${(selected.emissions2025 / 1000).toFixed(0)}K`} />
                <Row label="2030 target" value={`${(selected.target2030 / 1000).toFixed(0)}K`} />
                <Row label="2050 target" value={`${(selected.target2050 / 1000).toFixed(0)}K`} />
              </div>

              <div className="mt-3 pt-3 border-t border-[var(--hw-slate-200)]">
                <div className="text-[10px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold mb-1">
                  Top levers
                </div>
                <ul className="text-xs space-y-1 text-[var(--hw-slate-700)] list-disc pl-4 leading-snug">
                  {selected.sector.includes("Residential") && (
                    <>
                      <li>Heat-pump replacement program (EPA / Inflation Reduction Act rebates)</li>
                      <li>FBC 8th Edition energy code enforcement</li>
                      <li>Rooftop solar — SAP Action 41</li>
                    </>
                  )}
                  {selected.sector.includes("Commercial") && (
                    <>
                      <li>Commercial PACE financing for retrofits</li>
                      <li>Hotel-sector energy benchmarking ordinance</li>
                      <li>EV charging at parking garages</li>
                    </>
                  )}
                  {selected.sector.includes("On-road") && (
                    <>
                      <li>EV charger buildout — DOT funding</li>
                      <li>Broward County Transit expansion</li>
                      <li>Bike + Broadwalk mode-shift</li>
                    </>
                  )}
                  {selected.sector.includes("Marine") && (
                    <>
                      <li>Shore power at marinas</li>
                      <li>Electric water taxi pilot</li>
                    </>
                  )}
                  {selected.sector.includes("Waste") && (
                    <>
                      <li>Organics diversion + composting</li>
                      <li>WWTP methane capture (Southern Regional)</li>
                      <li>Septic-to-sewer expansion (F2)</li>
                    </>
                  )}
                  {selected.sector.includes("Industrial") && (
                    <>
                      <li>Refrigerant leak reduction</li>
                      <li>Process electrification</li>
                    </>
                  )}
                </ul>
              </div>

              <button className="demo-btn-primary text-sm w-full mt-3 inline-flex items-center justify-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Build sector action plan
              </button>
            </div>
          )}

          <div className="demo-card overflow-hidden">
            <div className="relative h-32">
              <Image src="/demo/ghg.png" alt="Hollywood substation + transportation" fill className="object-cover" sizes="33vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 text-white" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
                <div className="text-[10px] uppercase tracking-wider font-bold">Data sources</div>
                <div className="demo-display text-sm font-semibold">FPL · DOT VMT · Waste · WWTP · ACS</div>
              </div>
            </div>
            <div className="p-3">
              <div className="flex flex-wrap gap-1.5">
                <span className="demo-chip">GPC Basic+</span>
                <span className="demo-chip demo-chip-teal">CDP-aligned</span>
                <span className="demo-chip">Climate Mayors</span>
                <span className="demo-chip demo-chip-coral">Race to Zero</span>
              </div>
              <button className="demo-btn-accent text-sm w-full mt-3 inline-flex items-center justify-center gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Export CDP-formatted report
              </button>
            </div>
          </div>

          <div className="demo-card p-4 text-[11px] text-[var(--hw-slate-500)] leading-snug">
            <div className="flex items-center gap-1.5 mb-1 text-[var(--hw-slate-700)] font-medium">
              <Flame className="h-3 w-3" />
              About the inventory
            </div>
            EcoHeart computes the inventory in Daytona Python following the GPC Basic+ protocol (ICLEI 2014). Re-run nightly as new utility, VMT, and waste-tonnage data lands. Auto-fills the CDP questionnaire and Climate Mayors disclosure pack.
          </div>
        </div>
      </div>
    </div>
  );
}

function BigStat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="demo-card p-4">
      <div className="flex items-center gap-2 mb-2 text-[var(--hw-slate-500)]">
        <span className="text-[11px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <div className="demo-display text-2xl font-semibold" style={{ color: accent }}>{value}</div>
      <div className="text-xs text-[var(--hw-slate-500)] mt-0.5">{sub}</div>
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
