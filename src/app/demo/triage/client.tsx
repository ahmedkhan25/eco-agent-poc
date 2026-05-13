"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
  Waves,
  CloudRain,
  Pipette,
  Droplets,
  Send,
  ArrowUpRight,
  MapPin,
  Clock,
} from "lucide-react";
// Note: ArrowUpRight used in ReportDetail
import { ConceptHeader } from "@/components/demo/concept-header";
import { InsightCard } from "@/components/demo/insight-card";
import { TRIAGE_REPORTS, type TriageReport } from "@/lib/demo/concept-data";
import type { HollywoodMapMarker } from "@/components/demo/hollywood-map";

const HollywoodMap = dynamic(
  () => import("@/components/demo/hollywood-map").then((m) => m.HollywoodMap),
  { ssr: false, loading: () => <div className="w-full h-full bg-[var(--hw-slate-50)]" /> }
);

const CLASS_META = {
  tidal: { label: "Tidal", color: "var(--hw-teal)", Icon: Waves, chip: "demo-chip-teal" },
  rainfall: { label: "Rainfall", color: "#9b6dab", Icon: CloudRain, chip: "demo-chip" },
  sewer: { label: "Sewer", color: "var(--hw-amber)", Icon: Pipette, chip: "demo-chip-amber" },
  outfall: { label: "Outfall", color: "var(--hw-coral)", Icon: Droplets, chip: "demo-chip-coral" },
} as const;

export function TriageClient() {
  const [selected, setSelected] = useState<string>(TRIAGE_REPORTS[0].id);
  const [filter, setFilter] = useState<keyof typeof CLASS_META | "all">("all");

  const filtered = useMemo(
    () => (filter === "all" ? TRIAGE_REPORTS : TRIAGE_REPORTS.filter((r) => r.classification === filter)),
    [filter]
  );

  const selectedReport = TRIAGE_REPORTS.find((r) => r.id === selected) ?? TRIAGE_REPORTS[0];

  const buckets = useMemo(() => {
    const out = { tidal: 0, rainfall: 0, sewer: 0, outfall: 0 } as Record<keyof typeof CLASS_META, number>;
    for (const r of TRIAGE_REPORTS) out[r.classification]++;
    return out;
  }, []);

  const markers: HollywoodMapMarker[] = TRIAGE_REPORTS.map((r, i) => ({
    id: r.id,
    lat: 26.005 + (i * 0.005) % 0.04,
    lng: -80.18 + (i * 0.007) % 0.07,
    severity:
      r.classification === "tidal" || r.classification === "outfall"
        ? "high"
        : r.classification === "sewer"
          ? "moderate"
          : "low",
    label: r.address,
    onClick: () => setSelected(r.id),
  }));

  return (
    <div className="px-6 py-6">
      <ConceptHeader
        tag="Agent · Concept"
        title="311 Climate Complaint Triage"
        subtitle="When a resident reports 'my street is flooded' to 311, EcoHeart's agent auto-classifies the report (tidal vs rainfall vs broken outfall vs sewer), correlates with current tide + radar, attaches it to the relevant CIP project, and drafts a templated response."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        {(Object.keys(CLASS_META) as Array<keyof typeof CLASS_META>).map((k) => {
          const m = CLASS_META[k];
          const isActive = filter === k;
          return (
            <button
              key={k}
              onClick={() => setFilter(isActive ? "all" : k)}
              className="demo-card p-3 text-left transition hover:shadow-md"
              style={isActive ? { borderColor: m.color, borderWidth: 2 } : undefined}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ backgroundColor: m.color + "1a", color: m.color }}>
                  <m.Icon className="h-3.5 w-3.5" />
                </div>
                <span className="demo-display font-semibold text-sm">{m.label}</span>
              </div>
              <div className="demo-display text-xl font-semibold">{buckets[k]}</div>
              <div className="text-[10px] text-[var(--hw-slate-500)]">
                {Math.round((buckets[k] / TRIAGE_REPORTS.length) * 100)}% of inbox
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Inbox */}
        <div className="col-span-12 lg:col-span-5 demo-card overflow-hidden">
          <div className="px-3 py-2.5 border-b border-[var(--hw-slate-200)] flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)]">
              Inbox · {filtered.length} of {TRIAGE_REPORTS.length}
            </span>
            {filter !== "all" && (
              <button onClick={() => setFilter("all")} className="text-[11px] text-[var(--hw-teal)] hover:underline">
                Clear filter
              </button>
            )}
          </div>
          <div className="max-h-[640px] overflow-y-auto demo-scroll divide-y divide-[var(--hw-slate-200)]">
            {filtered.map((r) => {
              const meta = CLASS_META[r.classification];
              const active = r.id === selected;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelected(r.id)}
                  className={`w-full text-left p-3 transition ${
                    active ? "bg-[var(--hw-teal-50)]" : "hover:bg-[var(--hw-slate-50)]"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="h-7 w-7 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: meta.color + "1a", color: meta.color }}>
                      <meta.Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-sm truncate">{r.address}</span>
                        <span className="text-[10px] text-[var(--hw-slate-500)] demo-mono shrink-0">
                          {r.confidence}%
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--hw-slate-500)] mb-1 truncate">{r.neighborhood}</div>
                      <div className="text-xs text-[var(--hw-slate-700)] line-clamp-2 leading-snug italic">
                        "{r.raw}"
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail + map */}
        <div className="col-span-12 lg:col-span-7 space-y-3">
          {selectedReport && (
            <ReportDetail report={selectedReport} />
          )}

          <div className="demo-card overflow-hidden">
            <div className="px-3 py-2 border-b border-[var(--hw-slate-200)] flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-[var(--hw-teal)]" />
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)]">
                Cluster heatmap (last 7 days)
              </span>
            </div>
            <div className="h-[280px]">
              <HollywoodMap
                center={[26.012, -80.155]}
                zoom={12}
                layerIds={[]}
                markers={markers}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hero image / system explainer */}
      <section className="demo-card overflow-hidden mt-4">
        <div className="grid grid-cols-1 md:grid-cols-3">
          <div className="relative h-48 md:h-auto">
            <Image src="/demo/triage.png" alt="EcoHeart 311 operator view" fill className="object-cover" sizes="33vw" />
          </div>
          <div className="md:col-span-2 p-5">
            <div className="text-[10px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold mb-1">
              Why this matters
            </div>
            <h3 className="demo-display text-lg font-semibold mb-2">
              311 isn't a complaints inbox. It's a sensor network.
            </h3>
            <p className="text-sm text-[var(--hw-slate-700)] leading-relaxed">
              Hollywood NOW receives ~32,000 service requests per year. Roughly 7% are weather-related. EcoHeart's agent extracts signal from the noise — clustering by intersection, correlating against the live tide gauge + Broward radar, and routing the report to the CIP project it actually informs. The result: data your engineers can act on instead of inbox triage.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="demo-chip demo-chip-teal">Open311 spec</span>
              <span className="demo-chip">Auto-classify in &lt; 200 ms</span>
              <span className="demo-chip demo-chip-coral">Confidence-scored</span>
              <span className="demo-chip demo-chip-emerald">CIP-linked</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ReportDetail({ report }: { report: TriageReport }) {
  const meta = CLASS_META[report.classification];
  return (
    <div className="demo-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: meta.color + "1a", color: meta.color }}>
            <meta.Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold">
              Report · {report.id.toUpperCase()}
            </div>
            <div className="demo-display font-semibold text-base leading-tight">{report.address}</div>
            <div className="text-[11px] text-[var(--hw-slate-500)] mt-0.5">
              <Clock className="inline h-2.5 w-2.5 mr-0.5" />
              {report.receivedAt.slice(5, 16).replace("T", " · ")} · {report.neighborhood}
            </div>
          </div>
        </div>
        <span className={`demo-chip ${meta.chip}`}>
          {meta.label} · {report.confidence}%
        </span>
      </div>

      <div className="text-sm bg-[var(--hw-slate-50)] border border-[var(--hw-slate-200)] rounded-md p-3 italic text-[var(--hw-slate-700)] leading-relaxed">
        "{report.raw}"
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <Stat label="Tide at report" value={`${report.tideAtReport} ft`} sub="vs MLLW" accent="var(--hw-teal)" />
        <Stat label="Rain (last 6h)" value={`${report.rainfallLast6h} in`} sub="Broward MORD" accent="#9b6dab" />
        <Stat label="Classification" value={meta.label} sub={`${report.confidence}% confidence`} accent={meta.color} />
      </div>

      <div className="mt-3 border border-[var(--hw-slate-200)] rounded-md p-3">
        <div className="text-[10px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold mb-1">
          Nearest active CIP project
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">{report.nearestCipName}</div>
            <div className="mt-1 h-1.5 w-40 bg-[var(--hw-slate-100)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--hw-teal)]" style={{ width: `${report.nearestCipPct}%` }} />
            </div>
            <div className="text-[10px] text-[var(--hw-slate-500)] mt-0.5">{report.nearestCipPct}% complete</div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-[var(--hw-slate-500)]" />
        </div>
      </div>

      <div className="mt-3 border border-[var(--hw-slate-200)] rounded-md p-3 bg-[var(--hw-teal-50)]">
        <div className="text-[10px] uppercase tracking-wider text-[var(--hw-teal-600)] font-semibold mb-1">
          Drafted response (EcoHeart AI)
        </div>
        <p className="text-sm text-[var(--hw-slate-900)] leading-relaxed">
          Thank you for reporting tidal flooding on {report.address.split(",")[0]}. Our records show
          tide at the time of your report was {report.tideAtReport} ft MLLW (peak king-tide level).
          The {report.nearestCipName} ({report.nearestCipPct}% complete) is the active project
          serving this area. We expect substantive flood reduction at this intersection by Q3 2027.
        </p>
        <div className="mt-3 flex gap-2 flex-wrap">
          <button className="demo-btn-primary text-sm inline-flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Send response
          </button>
          <button className="demo-btn-ghost text-sm">Escalate</button>
          <button className="demo-btn-ghost text-sm">Tag to CIP</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="rounded-md p-2 border border-[var(--hw-slate-200)]">
      <div className="text-[10px] uppercase tracking-wider text-[var(--hw-slate-500)]">{label}</div>
      <div className="demo-display text-base font-semibold" style={{ color: accent }}>{value}</div>
      <div className="text-[10px] text-[var(--hw-slate-500)]">{sub}</div>
    </div>
  );
}
