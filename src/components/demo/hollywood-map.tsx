"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Layer } from "leaflet";

export type HollywoodLayerId =
  | "fema-flood"
  | "slr-1ft"
  | "slr-3ft"
  | "slr-6ft"
  | "slr-10ft";

export interface HollywoodMapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  severity?: "high" | "moderate" | "low";
  popupHtml?: string;
  onClick?: () => void;
}

export interface HollywoodMapHandle {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  fitBounds: (bounds: [[number, number], [number, number]]) => void;
}

interface Props {
  center?: [number, number];
  zoom?: number;
  layerIds?: HollywoodLayerId[];
  markers?: HollywoodMapMarker[];
  className?: string;
  onReady?: (handle: HollywoodMapHandle) => void;
}

const LAYER_CONFIG: Record<
  HollywoodLayerId,
  {
    kind: "dynamic" | "tiled";
    url: string;
    layers?: number[];
    opacity: number;
  }
> = {
  "fema-flood": {
    kind: "dynamic",
    url: "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer",
    layers: [28],
    opacity: 0.45,
  },
  "slr-1ft": {
    kind: "tiled",
    url: "https://coast.noaa.gov/arcgis/rest/services/dc_slr/slr_1ft/MapServer",
    opacity: 0.55,
  },
  "slr-3ft": {
    kind: "tiled",
    url: "https://coast.noaa.gov/arcgis/rest/services/dc_slr/slr_3ft/MapServer",
    opacity: 0.55,
  },
  "slr-6ft": {
    kind: "tiled",
    url: "https://coast.noaa.gov/arcgis/rest/services/dc_slr/slr_6ft/MapServer",
    opacity: 0.6,
  },
  "slr-10ft": {
    kind: "tiled",
    url: "https://coast.noaa.gov/arcgis/rest/services/dc_slr/slr_10ft/MapServer",
    opacity: 0.6,
  },
};

const HOLLYWOOD_FALLBACK: [number, number] = [26.0112, -80.1495];

export function HollywoodMap({
  center = HOLLYWOOD_FALLBACK,
  zoom = 12,
  layerIds = [],
  markers = [],
  className,
  onReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRefs = useRef<Map<HollywoodLayerId, Layer>>(new Map());
  const markerRefs = useRef<Map<string, Layer>>(new Map());
  const [ready, setReady] = useState(false);

  // Initialize once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      // @ts-expect-error -- CSS import handled by webpack at runtime
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center,
        zoom,
        zoomControl: true,
        attributionControl: true,
      });
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          maxZoom: 20,
          subdomains: "abcd",
        }
      ).addTo(map);
      mapRef.current = map;
      setReady(true);

      if (onReady) {
        onReady({
          flyTo: (lat, lng, z = 15) => map.flyTo([lat, lng], z, { duration: 1.2 }),
          fitBounds: (b) => map.fitBounds(b, { padding: [40, 40] }),
        });
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRefs.current.clear();
        markerRefs.current.clear();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync layers
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const active = new Set(layerIds);

    // Remove
    for (const [id, layer] of layerRefs.current.entries()) {
      if (!active.has(id)) {
        map.removeLayer(layer);
        layerRefs.current.delete(id);
      }
    }

    // Add
    (async () => {
      const esri = await import("esri-leaflet");
      for (const id of layerIds) {
        if (layerRefs.current.has(id)) continue;
        const cfg = LAYER_CONFIG[id];
        let layer: Layer;
        if (cfg.kind === "dynamic") {
          layer = esri.dynamicMapLayer({
            url: cfg.url,
            layers: cfg.layers,
            opacity: cfg.opacity,
            f: "image",
          });
        } else {
          layer = esri.tiledMapLayer({ url: cfg.url, opacity: cfg.opacity });
        }
        layer.addTo(map);
        layerRefs.current.set(id, layer);
      }
    })();
  }, [layerIds, ready]);

  // Sync markers
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    (async () => {
      const L = (await import("leaflet")).default;
      const seen = new Set(markers.map((m) => m.id));
      for (const [id, layer] of markerRefs.current.entries()) {
        if (!seen.has(id)) {
          map.removeLayer(layer);
          markerRefs.current.delete(id);
        }
      }
      for (const m of markers) {
        if (markerRefs.current.has(m.id)) continue;
        const color =
          m.severity === "high"
            ? "#e11d48"
            : m.severity === "moderate"
              ? "#f59e0b"
              : m.severity === "low"
                ? "#10b981"
                : "#0E7C7B";
        const marker = L.circleMarker([m.lat, m.lng], {
          radius: 8,
          fillColor: color,
          color: "#fff",
          weight: 2,
          fillOpacity: 0.95,
        }).addTo(map);
        if (m.popupHtml) marker.bindPopup(m.popupHtml);
        if (m.label) marker.bindTooltip(m.label);
        if (m.onClick) marker.on("click", m.onClick);
        markerRefs.current.set(m.id, marker);
      }
    })();
  }, [markers, ready]);

  return <div ref={containerRef} className={className} style={{ width: "100%", height: "100%" }} />;
}
