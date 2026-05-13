"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Search,
  Download,
  Mail,
  Ticket,
  Sparkles,
  ChevronDown,
  Loader2,
  MapPin,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as ReTooltip, Legend } from "recharts";
import { RiskDial } from "@/components/demo/risk-dial";
import { InsightCard } from "@/components/demo/insight-card";
import { HOLLYWOOD_CENTER } from "@/lib/demo/hollywood-data";
import type { HollywoodMapMarker } from "@/components/demo/hollywood-map";

const HollywoodMap = dynamic(
  () => import("@/components/demo/hollywood-map").then((m) => m.HollywoodMap),
  { ssr: false, loading: () => <div className="w-full h-full bg-[var(--hw-slate-50)]" /> }
);

const SAMPLE_ADDRESSES = [
  "2200 Adams St (South Lake)",
  "300 N Surf Rd (Broadwalk)",
  "5950 Sherman St (Hollywood Hills)",
  "Hollywood City Hall, 2600 Hollywood Blvd",
  "1450 Polk St (Downtown)",
];

interface ScoreItem { value: number; blurb: string }
interface Recommendation {
  title: string;
  action: string;
  citation: { doc: string; section?: string; quote: string };
}
interface Citation { doc: string; section?: string; quote: string }
interface Report {
  address: string;
  summary: string;
  scores: { flood: ScoreItem; surge: ScoreItem; heat: ScoreItem; wind: ScoreItem; insurance: ScoreItem };
  timeline: { year: number; flood: number; surge: number; heat: number }[];
  recommendations: Recommendation[];
  citations: Citation[];
  confidence: number;
  geocode?: { lat: number; lng: number; displayName: string } | null;
}

export function RiskReportClient() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const submit = async (q?: string) => {
    const value = (q ?? address).trim();
    if (!value) return;
    setAddress(value);
    setLoading(true);
    setError(null);
    setReport(null);
    setExpanded(null);
    try {
      const res = await fetch("/api/demo/risk-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: value }),
      });
      const j = await res.json();
      if (!res.ok || j.error) throw new Error(j.error || `HTTP ${res.status}`);
      setReport(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const markers: HollywoodMapMarker[] = report?.geocode
    ? [
        {
          id: "addr",
          lat: report.geocode.lat,
          lng: report.geocode.lng,
          severity: "high",
          label: report.address,
        },
      ]
    : [];

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)] mb-1">
          RAG + GIS · Flagship
        </div>
        <h1 className="demo-display text-3xl font-semibold leading-tight">
          Address Climate Risk Report
        </h1>
        <p className="text-sm text-[var(--hw-slate-700)] mt-1.5 max-w-2xl leading-relaxed">
          Type any Hollywood address. EcoHeart geocodes it, scores 5 hazards, projects them out to 2100 on the SE FL Compact curve, and grounds every recommendation in the city's own plans.
        </p>
      </div>

      {/* Search */}
      <div className="demo-card p-5 mb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex gap-2"
        >
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--hw-slate-500)]" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 2200 Adams Street, Hollywood, FL"
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-[var(--hw-slate-200)] focus:border-[var(--hw-teal)] focus:outline-none focus:ring-2 focus:ring-[var(--hw-teal-50)] text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !address.trim()}
            className="demo-btn-primary px-6 inline-flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Get my risk report
          </button>
        </form>
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="text-[11px] text-[var(--hw-slate-500)] mr-1 py-0.5">Try:</span>
          {SAMPLE_ADDRESSES.map((s) => (
            <button
              key={s}
              onClick={() => submit(s.split(" (")[0])}
              className="demo-chip hover:bg-[var(--hw-teal-50)] hover:text-[var(--hw-teal)] transition cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="demo-card p-4 mb-4 border-l-4 border-[var(--hw-rose)]">
          <div className="text-sm font-medium text-[var(--hw-rose)]">Couldn't generate report</div>
          <div className="text-xs text-[var(--hw-slate-700)] mt-1">{error}</div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="demo-card p-8 mb-4 flex items-center justify-center flex-col gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--hw-teal)]" />
          <div className="text-sm text-[var(--hw-slate-700)]">
            Geocoding via Nominatim · Synthesizing Hollywood plan citations via EcoHeart AI…
          </div>
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="space-y-4">
          {/* Map + address + confidence */}
          <div className="demo-card p-0 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3">
              <div className="md:col-span-2 h-56 md:h-72 border-r border-[var(--hw-slate-200)]">
                <HollywoodMap
                  center={
                    report.geocode
                      ? [report.geocode.lat, report.geocode.lng]
                      : HOLLYWOOD_CENTER
                  }
                  zoom={report.geocode ? 16 : 12}
                  layerIds={["fema-flood"]}
                  markers={markers}
                  className="h-full w-full"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-3.5 w-3.5 text-[var(--hw-teal)]" />
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)]">
                    Address
                  </span>
                </div>
                <div className="demo-display text-base font-semibold leading-tight">
                  {report.address}
                </div>
                {report.geocode && (
                  <div className="text-[11px] text-[var(--hw-slate-500)] mt-1 demo-mono">
                    {report.geocode.lat.toFixed(5)}, {report.geocode.lng.toFixed(5)}
                  </div>
                )}
                <p className="text-xs text-[var(--hw-slate-700)] mt-3 leading-relaxed">
                  {report.summary}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] uppercase text-[var(--hw-slate-500)]">Confidence</span>
                  <span className="demo-chip demo-chip-teal">{report.confidence}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5 risk dials */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <RiskDial label="Flood" score={report.scores.flood.value} blurb={report.scores.flood.blurb} />
            <RiskDial label="Storm Surge" score={report.scores.surge.value} blurb={report.scores.surge.blurb} />
            <RiskDial label="Heat" score={report.scores.heat.value} blurb={report.scores.heat.blurb} />
            <RiskDial label="Wind" score={report.scores.wind.value} blurb={report.scores.wind.blurb} />
            <RiskDial label="Insurance Stress" score={report.scores.insurance.value} blurb={report.scores.insurance.blurb} />
          </div>

          {/* Timeline */}
          <div className="demo-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold">
                  Risk evolution
                </div>
                <h3 className="demo-display text-lg font-semibold">2026 → 2100</h3>
              </div>
              <span className="demo-chip demo-chip-teal">SE FL Compact 2019 (reaffirmed Q4 2024)</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={report.timeline} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <ReTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="flood" stroke="var(--hw-teal)" strokeWidth={2} dot />
                  <Line type="monotone" dataKey="surge" stroke="var(--hw-coral)" strokeWidth={2} dot />
                  <Line type="monotone" dataKey="heat" stroke="#f59e0b" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Insights strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InsightCard
              variant="teal"
              badge="HOLLYWOOD CITED"
              headline="Hollywood targets 80% GHG reduction by 2050."
              body="Sustainable Hollywood Action Plan (2017) — 99 actions across 7 focus areas. Building-scale solar, EV, and energy-efficiency upgrades are direct contributors."
              sources={[{ doc: "Sustainable Hollywood Action Plan", section: "§3 Targets", quote: "80% greenhouse-gas reduction by 2050 (against 2010 baseline)." }]}
            />
            <InsightCard
              variant="coral"
              badge="ACTIVE GRANT"
              headline="A Climate Vulnerability Assessment Update is in flight."
              body="Funded by an $800K Resilient Florida grant; gates eligibility for state infrastructure funding per Florida Statute 380.093."
              sources={[{ doc: "FDEP Resilient Florida grant award", quote: "Hollywood CVA Update — public workshops Sept 2023." }]}
            />
          </div>

          {/* Recommendations */}
          <div className="demo-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold">
                  Recommendations
                </div>
                <h3 className="demo-display text-lg font-semibold">
                  {report.recommendations.length} actions grounded in Hollywood plans
                </h3>
              </div>
              <span className="demo-chip demo-chip-teal inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                AI synthesis
              </span>
            </div>
            <div className="space-y-2">
              {report.recommendations.map((r, i) => (
                <div key={i} className="border border-[var(--hw-slate-200)] rounded-lg">
                  <button
                    onClick={() => setExpanded(expanded === i ? null : i)}
                    className="w-full flex items-start gap-3 p-3 text-left hover:bg-[var(--hw-slate-50)] transition"
                  >
                    <span className="h-6 w-6 rounded-md bg-[var(--hw-teal-50)] text-[var(--hw-teal)] text-xs font-semibold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{r.title}</div>
                      <div className="text-xs text-[var(--hw-slate-500)] mt-0.5 truncate">
                        Per {r.citation.doc}
                        {r.citation.section ? ` · ${r.citation.section}` : ""}
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-[var(--hw-slate-500)] transition-transform ${
                        expanded === i ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expanded === i && (
                    <div className="px-3 pb-3 pl-12 text-sm text-[var(--hw-slate-700)] space-y-2 leading-relaxed">
                      <p>{r.action}</p>
                      <div className="text-xs italic text-[var(--hw-slate-500)] border-l-2 border-[var(--hw-teal)] pl-2">
                        "{r.citation.quote}"
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Citations */}
          <div className="demo-card p-4">
            <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold mb-2">
              Sources used
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {report.citations.map((c, i) => (
                <div key={i} className="text-xs border border-[var(--hw-slate-200)] rounded-md p-2">
                  <div className="font-medium">{c.doc}{c.section ? ` · ${c.section}` : ""}</div>
                  <div className="text-[var(--hw-slate-700)] italic mt-1">"{c.quote}"</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sticky action bar */}
          <div className="sticky bottom-3 z-10 demo-card p-3 flex flex-wrap items-center justify-between gap-3 shadow-md bg-white">
            <div className="text-xs text-[var(--hw-slate-700)]">
              <span className="font-medium">Ready to share.</span> All recommendations are RAG-grounded with page-level citations.
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="demo-btn-primary text-sm inline-flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Generate PDF
              </button>
              <button className="demo-btn-ghost text-sm inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Email to resident
              </button>
              <button className="demo-btn-ghost text-sm inline-flex items-center gap-1.5">
                <Ticket className="h-3.5 w-3.5" />
                Submit as 311 ticket
              </button>
              <a
                href="/demo/grant-finder"
                className="demo-btn-accent text-sm inline-flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Find grants
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!report && !loading && !error && (
        <div className="demo-card p-8 text-center">
          <div className="text-sm text-[var(--hw-slate-500)] mb-2">
            Type an address above or pick a sample to generate a full report.
          </div>
          <div className="text-xs text-[var(--hw-slate-500)]">
            Pipeline: Nominatim geocode (free, OSM-bounded to Hollywood) → EcoHeart AI synthesis using 7 authoritative Hollywood/FL sources.
          </div>
        </div>
      )}
    </div>
  );
}
