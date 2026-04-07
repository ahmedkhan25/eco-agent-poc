"use client";

import { useState } from "react";
import EcoHeartMap from "@/components/map/index";
import LayerControl from "@/components/map/layer-control";
import FeaturePopup from "@/components/map/feature-popup";
import { useMapStore } from "@/lib/stores/use-map-store";
import type { SpatialQueryResult } from "@/lib/arcgis-query";
import { EcoheartLogo } from "@/components/ecoheart-logo";
import Link from "next/link";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Clock,
  MapPin,
  Database,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";

const EXAMPLE_QUERIES = [
  "Show me flood zones near downtown Olympia",
  "What wetlands are near Capitol Lake?",
  "Are there streams near Martin Way?",
  "Show critical aquifer recharge areas near Tumwater",
  "What areas would flood with 3 feet of sea level rise?",
  "Show me flood zone AE areas near the capitol campus",
  "Show me environmental risks downtown",
];

export default function SpatialTestPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SpatialQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(true);

  const { setSpatialPayload, toggleLayer, showMap } = useMapStore();

  const runQuery = async (q: string) => {
    const queryText = q || query;
    if (!queryText.trim()) return;

    setQuery(queryText);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/spatial-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        return;
      }

      setResult(data);

      // Push to map
      if (data.mapData) {
        setSpatialPayload(data.mapData, {
          source: data.meta.source,
          endpoint: data.meta.endpoint,
          query: queryText,
          featureCount: data.textForLLM?.featureCount ?? 0,
          bbox: data.textForLLM?.bbox,
        });
      } else if (data.layerActivation) {
        for (const la of data.layerActivation) {
          toggleLayer(la.layerId);
        }
        showMap();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcf9f4]">
      {/* Banner */}
      <nav className="bg-slate-900/95 backdrop-blur-sm px-6 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <EcoheartLogo className="h-9 w-9" />
            <span className="text-white font-semibold text-lg">ecoheart</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/map-explorer"
              className="text-slate-400 text-sm no-underline hover:text-white transition-colors"
            >
              Map Explorer
            </Link>
            <Link
              href="/spatial-pipeline"
              className="text-slate-400 text-sm no-underline hover:text-white transition-colors"
            >
              Pipeline Explainer
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[#1c1c19] font-[Manrope] tracking-tight">
            Spatial Query Test
          </h1>
          <p className="text-sm text-[#414844]">
            Test the AI spatial pipeline: gpt-5.4-mini parses intent &rarr;
            geocode &rarr; ArcGIS fetch &rarr; map render
          </p>
        </div>

        {/* Query Input */}
        <div className="bg-white rounded-[16px] shadow-[0px_12px_32px_rgba(28,28,25,0.06)] p-5 mb-5">
          <div className="flex flex-wrap gap-2 mb-4">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => runQuery(q)}
                disabled={loading}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                  query === q
                    ? "border-[#E8761B] bg-[#E8761B]/8 text-[#E8761B]"
                    : "border-[#e5e2dd] text-[#414844] hover:border-[#c1c8c2]"
                } disabled:opacity-50`}
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runQuery(query)}
              placeholder="Enter a spatial query about Olympia..."
              className="flex-1 px-4 py-2.5 rounded-[12px] bg-[#f6f3ee] border border-[#e5e2dd] text-sm text-[#1c1c19] placeholder:text-[#717973] focus:outline-none focus:border-[#2D6A4F]"
            />
            <button
              onClick={() => runQuery(query)}
              disabled={loading || !query.trim()}
              className="px-5 py-2.5 rounded-[12px] bg-[#012d1d] hover:bg-[#1b4332] text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {loading ? "Running..." : "Run Query"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-[12px] p-4 mb-5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Pipeline Error</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Results + Map */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: Debug + Results */}
          <div className="space-y-4">
            {result && (
              <>
                {/* Summary card */}
                <div className="bg-white rounded-[16px] shadow-[0px_12px_32px_rgba(28,28,25,0.06)] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-[#1c1c19] uppercase tracking-wider">
                      Result
                    </h3>
                    <span className="flex items-center gap-1 text-xs text-[#717973]">
                      <Clock className="w-3 h-3" />
                      {result.meta.queryTimeMs}ms
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#f6f3ee] rounded-[12px] p-3">
                      <p className="text-[10px] text-[#717973] uppercase tracking-wider">
                        Source
                      </p>
                      <p className="text-sm font-semibold text-[#1c1c19]">
                        {result.meta.source}
                      </p>
                    </div>
                    <div className="bg-[#f6f3ee] rounded-[12px] p-3">
                      <p className="text-[10px] text-[#717973] uppercase tracking-wider">
                        Features
                      </p>
                      <p className="text-sm font-semibold text-[#1c1c19]">
                        {result.textForLLM?.featureCount ?? "N/A"}
                      </p>
                    </div>
                  </div>

                  {result.layerActivation && (
                    <div className="mt-3 p-3 bg-[#e8f5ef] rounded-[12px]">
                      <p className="text-xs font-semibold text-[#2D6A4F]">
                        Layer Activation
                      </p>
                      <p className="text-xs text-[#414844] mt-1">
                        {result.layerActivation
                          .map((la) => la.layerId)
                          .join(", ")}
                      </p>
                    </div>
                  )}

                  {/* Sample features */}
                  {result.textForLLM &&
                    result.textForLLM.sampleFeatures.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[10px] text-[#717973] uppercase tracking-wider mb-2">
                          Sample Features (sent to LLM)
                        </p>
                        <pre className="bg-[#0D1117] text-[#E2E8F0] text-[10px] p-3 rounded-[8px] overflow-auto max-h-48 leading-relaxed">
                          {JSON.stringify(
                            result.textForLLM.sampleFeatures,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    )}

                  {/* Stats */}
                  {result.textForLLM &&
                    Object.keys(result.textForLLM.stats).length > 0 && (
                      <div className="mt-3">
                        <p className="text-[10px] text-[#717973] uppercase tracking-wider mb-2">
                          Attribute Stats
                        </p>
                        <pre className="bg-[#0D1117] text-[#E2E8F0] text-[10px] p-3 rounded-[8px] overflow-auto max-h-32 leading-relaxed">
                          {JSON.stringify(result.textForLLM.stats, null, 2)}
                        </pre>
                      </div>
                    )}
                </div>

                {/* Debug panel */}
                <div className="bg-white rounded-[16px] shadow-[0px_12px_32px_rgba(28,28,25,0.06)] overflow-hidden">
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="w-full flex items-center justify-between p-4 hover:bg-[#f6f3ee] transition-colors"
                  >
                    <span className="text-sm font-bold text-[#1c1c19] uppercase tracking-wider">
                      Debug — Pipeline Stages
                    </span>
                    {showDebug ? (
                      <ChevronDown className="w-4 h-4 text-[#717973]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#717973]" />
                    )}
                  </button>

                  {showDebug && (
                    <div className="px-4 pb-4 space-y-3">
                      {/* Routing */}
                      <StageCard
                        label="Stage 1: Route"
                        icon={<Database className="w-3.5 h-3.5" />}
                        status={
                          result.stages.routing.confidence >= 0.7
                            ? "pass"
                            : "warn"
                        }
                      >
                        <KV label="Endpoint" value={result.stages.routing.endpointId} />
                        <KV label="Confidence" value={`${(result.stages.routing.confidence * 100).toFixed(0)}%`} />
                        <KV label="Location" value={result.stages.routing.locationMention} />
                      </StageCard>

                      {/* Parsing */}
                      <StageCard
                        label="Stage 2: Parse"
                        icon={<Search className="w-3.5 h-3.5" />}
                        status="pass"
                      >
                        <KV label="WHERE" value={result.stages.parsing.whereClause} mono />
                        <KV label="Location" value={result.stages.parsing.locationName} />
                        {result.stages.parsing.bufferMeters && (
                          <KV label="Buffer" value={`${result.stages.parsing.bufferMeters}m`} />
                        )}
                        {result.stages.parsing.slrScenarioFt && (
                          <KV label="SLR" value={`${result.stages.parsing.slrScenarioFt}ft`} />
                        )}
                      </StageCard>

                      {/* Validation */}
                      <StageCard
                        label="Stage 3: Validate WHERE"
                        icon={<CheckCircle className="w-3.5 h-3.5" />}
                        status={
                          result.stages.validation.invalidFields.length > 0
                            ? "warn"
                            : "pass"
                        }
                      >
                        <KV label="Original" value={result.stages.validation.originalWhere} mono />
                        <KV label="Validated" value={result.stages.validation.validatedWhere} mono />
                        {result.stages.validation.invalidFields.length > 0 && (
                          <KV
                            label="Invalid fields"
                            value={result.stages.validation.invalidFields.join(", ")}
                            warn
                          />
                        )}
                      </StageCard>

                      {/* Geocode */}
                      <StageCard
                        label="Stage 4: Geocode"
                        icon={<MapPin className="w-3.5 h-3.5" />}
                        status="pass"
                      >
                        <KV label="Lat/Lng" value={`${result.stages.geocode.lat.toFixed(4)}, ${result.stages.geocode.lng.toFixed(4)}`} />
                        <KV label="Source" value={result.stages.geocode.source} />
                        <KV label="BBox" value={result.stages.geocode.bbox.map((n) => n.toFixed(4)).join(", ")} mono />
                      </StageCard>
                    </div>
                  )}
                </div>
              </>
            )}

            {!result && !loading && !error && (
              <div className="bg-white rounded-[16px] shadow-[0px_12px_32px_rgba(28,28,25,0.06)] p-12 text-center">
                <p className="text-[#717973] text-sm">
                  Select an example query or type your own to test the pipeline
                </p>
              </div>
            )}

            {loading && (
              <div className="bg-white rounded-[16px] shadow-[0px_12px_32px_rgba(28,28,25,0.06)] p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#2D6A4F] mx-auto mb-3" />
                <p className="text-sm text-[#414844]">
                  Running spatial pipeline...
                </p>
                <p className="text-xs text-[#717973] mt-1">
                  gpt-5.4-mini routing → geocode → ArcGIS fetch
                </p>
              </div>
            )}
          </div>

          {/* Right: Map */}
          <div className="bg-white rounded-[16px] shadow-[0px_12px_32px_rgba(28,28,25,0.06)] overflow-hidden relative min-h-[500px]">
            <EcoHeartMap />
            <div className="absolute bottom-4 right-4 z-[1000]">
              <LayerControl />
            </div>
            <FeaturePopup />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function StageCard({
  label,
  icon,
  status,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  status: "pass" | "warn";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-[12px] p-3 border ${
        status === "warn"
          ? "bg-amber-50 border-amber-200"
          : "bg-[#f6f3ee] border-[#e5e2dd]"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={status === "warn" ? "text-amber-600" : "text-[#2D6A4F]"}>
          {icon}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#414844]">
          {label}
        </span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function KV({
  label,
  value,
  mono,
  warn,
}: {
  label: string;
  value: string;
  mono?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[10px] text-[#717973] shrink-0 w-16">{label}</span>
      <span
        className={`text-[11px] break-all ${
          warn
            ? "text-amber-700 font-medium"
            : mono
              ? "font-mono text-[#414844]"
              : "text-[#1c1c19]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
