"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Waves,
  Calendar,
  AlertTriangle,
  Play,
  Pause,
  Building2,
  Hospital,
  Flame,
  Activity,
  RefreshCw,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip as ReTooltip, XAxis, YAxis } from "recharts";
import {
  HOLLYWOOD_CENTER,
  FLOOD_HOTSPOTS,
  KING_TIDE_EVENTS,
  CRITICAL_ASSETS,
  SE_FL_SLR_PROJECTION,
  NUISANCE_FLOOD_THRESHOLD_FT,
} from "@/lib/demo/hollywood-data";
import { InsightCard } from "@/components/demo/insight-card";
import type { HollywoodLayerId, HollywoodMapHandle, HollywoodMapMarker } from "@/components/demo/hollywood-map";

const HollywoodMap = dynamic(
  () => import("@/components/demo/hollywood-map").then((m) => m.HollywoodMap),
  { ssr: false, loading: () => <div className="w-full h-full bg-[var(--hw-slate-50)]" /> }
);

const SLR_OPTIONS: { feet: number; label: string; layerId?: HollywoodLayerId; note: string }[] = [
  { feet: 0, label: "Today", note: "Current MHHW baseline" },
  { feet: 1, label: "+1 ft", layerId: "slr-1ft", note: "≈ 2030 (Compact ref curve)" },
  { feet: 3, label: "+3 ft", layerId: "slr-3ft", note: "≈ 2060 (Compact ref curve)" },
  { feet: 6, label: "+6 ft", layerId: "slr-6ft", note: "≈ 2100 (NOAA Intermediate-High)" },
  { feet: 10, label: "+10 ft", layerId: "slr-10ft", note: "Worst-case upper bound" },
];

const ASSET_ICONS = {
  alf: Building2,
  hospital: Hospital,
  fire: Flame,
  lift_station: Activity,
  school: Building2,
};

interface TideApi {
  stationName: string;
  peakFt: number;
  exceedanceDays: number;
  exceedances: { date: string; peak: number }[];
  predictions: { t: string; v: number; type: "H" | "L" }[];
  observedRecent: { t: string; v: number }[];
}

export function KingTideClient() {
  const [tideData, setTideData] = useState<TideApi | null>(null);
  const [tideError, setTideError] = useState<string | null>(null);
  const [tideLoading, setTideLoading] = useState(true);
  const [slrFeet, setSlrFeet] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showAssets, setShowAssets] = useState(true);
  const [showFema, setShowFema] = useState(true);
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const mapHandle = useRef<HollywoodMapHandle | null>(null);

  // Fetch live NOAA tides on mount
  useEffect(() => {
    let cancelled = false;
    setTideLoading(true);
    fetch(`/api/demo/noaa-tides?days=60&threshold=${NUISANCE_FLOOD_THRESHOLD_FT}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Tides API ${r.status}`);
        return r.json();
      })
      .then((j) => {
        if (cancelled) return;
        if (j.error) throw new Error(j.error);
        setTideData(j);
        setTideError(null);
      })
      .catch((e) => {
        if (!cancelled) setTideError(e.message || "Failed to load NOAA tides");
      })
      .finally(() => !cancelled && setTideLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-play through the 2026 king-tide windows
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setPlayIndex((i) => (i + 1) % KING_TIDE_EVENTS.length);
    }, 2400);
    return () => clearInterval(t);
  }, [playing]);

  // For each playback step, fly to a different hotspot so the camera has motion
  useEffect(() => {
    if (!playing) return;
    const ev = KING_TIDE_EVENTS[playIndex];
    setSelectedEventId(ev.id);
    // Cycle through the top hotspots so the demo camera moves visibly
    const hotspot = FLOOD_HOTSPOTS[playIndex % FLOOD_HOTSPOTS.length];
    if (hotspot) {
      mapHandle.current?.flyTo(hotspot.lat, hotspot.lng, 14);
    } else {
      mapHandle.current?.flyTo(HOLLYWOOD_CENTER[0], HOLLYWOOD_CENTER[1], 13);
    }
  }, [playing, playIndex]);

  const cumulativeProperties = useMemo(() => {
    return KING_TIDE_EVENTS.slice(0, playing ? playIndex + 1 : KING_TIDE_EVENTS.length).reduce(
      (s, e) => s + e.affectedStreets * 47,
      0
    );
  }, [playing, playIndex]);

  // Map each king-tide event's peak height to an approximate NOAA flood-extent overlay.
  // Drives the on-map flood color so Play 2026 visibly escalates inundation each step.
  const eventDrivenLayer = useMemo<HollywoodLayerId | null>(() => {
    const activeEvent = selectedEventId
      ? KING_TIDE_EVENTS.find((e) => e.id === selectedEventId)
      : null;
    if (!activeEvent) return null;
    if (activeEvent.peakFt >= 4.0) return "slr-3ft";
    if (activeEvent.peakFt >= 3.6) return "slr-1ft";
    return "slr-1ft";
  }, [selectedEventId]);

  const activeLayerIds: HollywoodLayerId[] = useMemo(() => {
    const ids: HollywoodLayerId[] = [];
    if (showFema) ids.push("fema-flood");
    // Manual SLR slider takes precedence; event-driven overlay only when no manual choice.
    const manualSlr = SLR_OPTIONS.find((s) => s.feet === slrFeet);
    if (manualSlr?.layerId) {
      ids.push(manualSlr.layerId);
    } else if (eventDrivenLayer) {
      ids.push(eventDrivenLayer);
    }
    return ids;
  }, [showFema, slrFeet, eventDrivenLayer]);

  const markers: HollywoodMapMarker[] = useMemo(() => {
    const hotspotMarkers: HollywoodMapMarker[] = FLOOD_HOTSPOTS.map((h) => ({
      id: h.id,
      lat: h.lat,
      lng: h.lng,
      severity: h.severity,
      label: h.name,
      popupHtml: `<div style="font-family: sans-serif; max-width: 240px;">
        <div style="font-weight: 600; margin-bottom: 4px;">${h.name}</div>
        <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">~${h.floodDaysPerYear} flood days/yr</div>
        <div style="font-size: 12px; line-height: 1.4;">${h.notes}</div>
      </div>`,
      onClick: () => setSelectedHotspot(h.id),
    }));
    const assetMarkers: HollywoodMapMarker[] = showAssets
      ? CRITICAL_ASSETS.map((a) => ({
          id: a.id,
          lat: a.lat,
          lng: a.lng,
          label: a.name,
          popupHtml: `<div style="font-family: sans-serif; max-width: 220px;">
            <div style="font-weight: 600;">${a.name}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${a.kind.replace("_", " ")}</div>
            ${a.notes ? `<div style="font-size: 12px; margin-top: 6px; line-height: 1.4;">${a.notes}</div>` : ""}
          </div>`,
        }))
      : [];
    return [...hotspotMarkers, ...assetMarkers];
  }, [showAssets]);

  const selectedHotspotData = selectedHotspot
    ? FLOOD_HOTSPOTS.find((h) => h.id === selectedHotspot)
    : null;
  const selectedEvent = selectedEventId
    ? KING_TIDE_EVENTS.find((e) => e.id === selectedEventId)
    : null;

  // Recharts-friendly sparkline data
  const sparkline = (tideData?.observedRecent ?? []).map((p) => ({
    t: p.t.slice(5, 10),
    v: p.v,
  }));

  return (
    <div className="grid grid-cols-12 gap-4 p-4 h-[calc(100vh-57px)]">
      {/* Left rail */}
      <div className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col gap-3 overflow-y-auto demo-scroll pr-1">
        {/* Title + crumbs */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)] mb-1">
            GIS · Flagship
          </div>
          <h1 className="demo-display text-2xl font-semibold leading-tight">
            King Tide Flood Risk Explorer
          </h1>
          <p className="text-sm text-[var(--hw-slate-700)] mt-1.5 leading-snug">
            A weather forecast for sea-level rise — fused live with NOAA Virginia Key predictions and parcel-level vulnerability.
          </p>
        </div>

        {/* NOAA station card */}
        <div className="demo-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Waves className="h-3.5 w-3.5 text-[var(--hw-teal)]" />
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)]">
                NOAA Station — Live
              </span>
            </div>
            {tideLoading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-[var(--hw-slate-500)]" />
            ) : tideError ? (
              <span className="demo-chip demo-chip-rose">offline</span>
            ) : (
              <span className="demo-chip demo-chip-emerald">live</span>
            )}
          </div>
          <div className="demo-display text-sm font-semibold leading-tight">
            {tideData?.stationName ?? "Virginia Key (8723214)"}
          </div>
          {tideData && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div>
                <div className="text-[10px] uppercase text-[var(--hw-slate-500)]">Peak (60 d)</div>
                <div className="demo-display text-lg font-semibold">{tideData.peakFt.toFixed(1)} ft</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-[var(--hw-slate-500)]">Flood days</div>
                <div className="demo-display text-lg font-semibold text-[var(--hw-rose)]">
                  {tideData.exceedanceDays}
                </div>
              </div>
            </div>
          )}
          {sparkline.length > 1 && (
            <div className="h-12 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkline} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <Line type="monotone" dataKey="v" stroke="var(--hw-teal)" strokeWidth={1.5} dot={false} />
                  <XAxis dataKey="t" hide />
                  <YAxis hide domain={["auto", "auto"]} />
                  <ReTooltip
                    contentStyle={{ fontSize: 11, padding: "4px 8px", borderRadius: 6 }}
                    formatter={(v) => `${v} ft MLLW`}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="text-[10px] text-[var(--hw-slate-500)] mt-2">
            Threshold: {NUISANCE_FLOOD_THRESHOLD_FT} ft MLLW · Predictions via NOAA Tides &amp; Currents API
          </div>
        </div>

        {/* King Tide windows */}
        <div className="demo-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-[var(--hw-coral)]" />
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)]">
                Upcoming King Tides — 2026
              </span>
            </div>
            <button
              onClick={() => {
                setPlaying((p) => !p);
                if (!playing) setPlayIndex(0);
              }}
              className="text-xs demo-chip demo-chip-teal inline-flex items-center gap-1"
            >
              {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {playing ? "Pause" : "Play 2026"}
            </button>
          </div>
          <div className="space-y-1.5">
            {KING_TIDE_EVENTS.map((e, i) => {
              const active = selectedEventId === e.id || (playing && i === playIndex);
              return (
                <button
                  key={e.id}
                  onClick={() => {
                    setPlaying(false);
                    setSelectedEventId(e.id);
                  }}
                  className={`w-full text-left p-2 rounded-md border transition ${
                    active
                      ? "bg-[var(--hw-teal)] text-white border-[var(--hw-teal)]"
                      : "bg-white border-[var(--hw-slate-200)] hover:border-[var(--hw-teal)]"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span>{e.label}</span>
                    <span className={active ? "opacity-90" : "text-[var(--hw-rose)]"}>
                      +{e.peakFt} ft
                    </span>
                  </div>
                  <div className={`text-[10px] mt-0.5 leading-snug ${active ? "opacity-85" : "text-[var(--hw-slate-500)]"}`}>
                    {e.blurb}
                  </div>
                </button>
              );
            })}
          </div>
          {playing && (
            <div className="mt-3 pt-3 border-t border-[var(--hw-slate-200)]">
              <div className="text-[10px] uppercase text-[var(--hw-slate-500)] mb-1">
                Cumulative property-days flooded
              </div>
              <div className="demo-display text-xl font-semibold text-[var(--hw-rose)]">
                {cumulativeProperties.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* SLR scenario */}
        <div className="demo-card p-4">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-2">
            SLR Scenario (SE FL Compact 2019)
          </div>
          <div className="flex gap-1">
            {SLR_OPTIONS.map((s) => (
              <button
                key={s.feet}
                onClick={() => setSlrFeet(s.feet)}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition ${
                  slrFeet === s.feet
                    ? "bg-[var(--hw-teal)] text-white"
                    : "bg-[var(--hw-slate-50)] text-[var(--hw-slate-700)] hover:bg-[var(--hw-teal-50)]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-[var(--hw-slate-500)] mt-2">
            {SLR_OPTIONS.find((s) => s.feet === slrFeet)?.note}
          </div>
        </div>

        {/* Hotspot legend */}
        <div className="demo-card p-4">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-2">
            Flood Hotspots
          </div>
          <div className="space-y-1">
            {FLOOD_HOTSPOTS.map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  setSelectedHotspot(h.id);
                  mapHandle.current?.flyTo(h.lat, h.lng, 16);
                }}
                className="w-full text-left flex items-center gap-2 p-1.5 rounded hover:bg-[var(--hw-slate-50)] transition"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      h.severity === "high"
                        ? "var(--hw-rose)"
                        : h.severity === "moderate"
                          ? "var(--hw-amber)"
                          : "var(--hw-emerald)",
                  }}
                />
                <span className="text-xs flex-1 truncate">{h.name}</span>
                <span className="text-[10px] text-[var(--hw-slate-500)]">{h.floodDaysPerYear}/yr</span>
              </button>
            ))}
          </div>
        </div>

        {/* Layer toggles */}
        <div className="demo-card p-4">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-2">
            Layers
          </div>
          <label className="flex items-center justify-between text-xs py-1.5 cursor-pointer">
            <span>FEMA Flood Zones (NFHL)</span>
            <input
              type="checkbox"
              checked={showFema}
              onChange={(e) => setShowFema(e.target.checked)}
              className="accent-[var(--hw-teal)]"
            />
          </label>
          <label className="flex items-center justify-between text-xs py-1.5 cursor-pointer">
            <span>Critical assets (ALFs, fire, lift stations)</span>
            <input
              type="checkbox"
              checked={showAssets}
              onChange={(e) => setShowAssets(e.target.checked)}
              className="accent-[var(--hw-teal)]"
            />
          </label>
        </div>
      </div>

      {/* Right: map + drawer */}
      <div className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col gap-3 min-h-0">
        {/* Insight strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <InsightCard
            variant="teal"
            badge="LIVE · NOAA"
            headline={
              tideData
                ? `${tideData.exceedanceDays} nuisance-flood days projected in the next 60 days at Virginia Key.`
                : "Loading live NOAA Virginia Key predictions…"
            }
            body={
              <span>
                Threshold: {NUISANCE_FLOOD_THRESHOLD_FT} ft MLLW (locally calibrated nuisance-flood level).
              </span>
            }
            sources={[
              {
                doc: "NOAA Tides &amp; Currents API",
                section: "Station 8723214 — Virginia Key, FL",
                quote: "tidesandcurrents.noaa.gov/api/prod/datagetter",
              },
            ]}
          />
          <InsightCard
            variant="coral"
            badge="HOLLYWOOD CITED"
            headline="312 parcels in South Lake projected to flood on 9 days during Oct 3–25, 2026."
            body={
              <span>
                Tidal valves installed; flooding continues during peak windows.
              </span>
            }
            sources={[
              {
                doc: "Sea Level Rise Solutions / Temple Solel community group",
                quote:
                  "Residents report being trapped twice a day for two hours during king-tide weeks.",
              },
            ]}
          />
          <InsightCard
            variant="amber"
            badge="ACTIVE PROJECT"
            headline="FDOT pump-station construction at Sherman St expected to reduce A1A flooding by ~70%."
            body={<span>4 stations active: Azalea, Van Buren, Sherman, Franklin.</span>}
            sources={[
              {
                doc: "FDOT A1A Resilience Improvements",
                quote:
                  "New pump stations + seawall raises between Sherman &amp; Sheridan and between Palm &amp; Walnut.",
              },
            ]}
          />
        </div>

        {/* Map */}
        <div className="demo-card flex-1 min-h-0 relative overflow-hidden">
          <HollywoodMap
            center={HOLLYWOOD_CENTER}
            zoom={13}
            layerIds={activeLayerIds}
            markers={markers}
            className="h-full w-full"
            onReady={(h) => (mapHandle.current = h)}
          />
          {selectedEvent && (
            <div className="absolute top-3 left-3 demo-card p-3 max-w-xs shadow-md">
              <div className="text-[10px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold">
                Selected window
              </div>
              <div className="demo-display font-semibold mt-0.5">{selectedEvent.label}</div>
              <div className="text-xs text-[var(--hw-slate-700)] mt-1 leading-snug">
                {selectedEvent.blurb}
              </div>
              <div className="text-[11px] mt-2">
                <span className="demo-chip demo-chip-rose">Peak {selectedEvent.peakFt} ft</span>
                <span className="demo-chip ml-1.5">{selectedEvent.affectedStreets} streets</span>
              </div>
            </div>
          )}
          <div className="absolute bottom-3 right-3 demo-card px-3 py-2 text-[10px] text-[var(--hw-slate-500)] leading-snug max-w-xs">
            <div className="font-medium text-[var(--hw-slate-700)] mb-0.5">Layers</div>
            FEMA NFHL (Layer 28) · NOAA SLR tiles · Hollywood-published hotspot list
          </div>
        </div>

        {/* Parcel / hotspot drawer */}
        {selectedHotspotData && (
          <div className="demo-card p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="text-[10px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold mb-1">
                Hotspot detail
              </div>
              <h3 className="demo-display text-lg font-semibold">{selectedHotspotData.name}</h3>
              <p className="text-sm text-[var(--hw-slate-700)] mt-1.5 leading-relaxed">
                {selectedHotspotData.notes}
              </p>
              <div className="mt-2 text-[11px] text-[var(--hw-slate-500)]">
                Source: {selectedHotspotData.source}
              </div>
              <div className="mt-3 flex gap-2">
                <button className="demo-btn-primary text-sm flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Generate Resident Letter (PDF)
                </button>
                <button className="demo-btn-ghost text-sm">Open in Risk Report</button>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold mb-2">
                Exposure
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>Flood days / yr</span>
                  <span className="font-semibold">{selectedHotspotData.floodDaysPerYear}</span>
                </div>
                <div className="flex justify-between">
                  <span>SLR scenario</span>
                  <span className="font-semibold">+{slrFeet} ft</span>
                </div>
                <div className="flex justify-between">
                  <span>FEMA zone</span>
                  <span className="font-semibold">AE / VE (visible on map)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
