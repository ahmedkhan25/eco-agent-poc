"use client";

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import type { Map as LeafletMap, Layer, PathOptions } from "leaflet";
import {
  MAP_LAYERS,
  OLYMPIA_CENTER,
  OLYMPIA_ZOOM,
  type MapLayerDef,
} from "@/lib/map-layers";
import { useMapStore } from "@/lib/stores/use-map-store";

// ---------------------------------------------------------------------------
// Public handle exposed via ref
// ---------------------------------------------------------------------------

export interface MapHandle {
  getMap: () => LeafletMap | null;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  fitBounds: (bounds: [[number, number], [number, number]]) => void;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MapContainerProps {
  className?: string;
  onFeatureClick?: (
    feature: GeoJSON.Feature,
    layerName: string
  ) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MapContainer = forwardRef<MapHandle, MapContainerProps>(
  function MapContainer({ className, onFeatureClick }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const layerRefs = useRef<Map<string, Layer>>(new Map());
    const agentLayerRef = useRef<Layer | null>(null);

    const {
      activeLayerIds,
      spatialPayload,
      selectedFeature,
      setSelectedFeature,
    } = useMapStore();

    // Expose map handle to parent
    useImperativeHandle(ref, () => ({
      getMap: () => mapRef.current,
      flyTo: (lat, lng, zoom = 14) => mapRef.current?.flyTo([lat, lng], zoom),
      fitBounds: (bounds) =>
        mapRef.current?.fitBounds(bounds, { padding: [40, 40] }),
    }));

    // ------------------------------------------------------------------
    // Initialize Leaflet map
    // ------------------------------------------------------------------
    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      let mounted = true;

      const init = async () => {
        const L = await import("leaflet");
        // @ts-expect-error -- CSS import handled by webpack at runtime
        await import("leaflet/dist/leaflet.css");

        if (!mounted || !containerRef.current) return;

        // Fix default marker icon paths (webpack breaks them)
        delete (L.Icon.Default.prototype as any)._getIconUrl; // eslint-disable-line
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        const map = L.map(containerRef.current, {
          center: OLYMPIA_CENTER,
          zoom: OLYMPIA_ZOOM,
          zoomControl: true,
          attributionControl: true,
        });

        mapRef.current = map;

        // CARTO Positron basemap — free, no API key
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          {
            attribution:
              '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 20,
          }
        ).addTo(map);

        // Force a resize after mount (fixes grey tiles in split view)
        setTimeout(() => map.invalidateSize(), 200);
      };

      init();

      const currentLayerRefs = layerRefs.current;
      return () => {
        mounted = false;
        mapRef.current?.remove();
        mapRef.current = null;
        currentLayerRefs.clear();
      };
    }, []);

    // ------------------------------------------------------------------
    // Sync active layers from store → Leaflet
    // ------------------------------------------------------------------
    const syncLayers = useCallback(async () => {
      const map = mapRef.current;
      if (!map) return;

      const L = await import("leaflet");
      const esri = await import("esri-leaflet");

      // Remove layers no longer active
      for (const [id, layer] of layerRefs.current.entries()) {
        if (!activeLayerIds.includes(id)) {
          map.removeLayer(layer);
          layerRefs.current.delete(id);
        }
      }

      // Add newly active layers
      for (const id of activeLayerIds) {
        if (layerRefs.current.has(id)) continue;

        const def = MAP_LAYERS.find((l) => l.id === id);
        if (!def) continue;

        const layer = createLayer(L, esri, def, onFeatureClick);
        if (layer) {
          layer.addTo(map);
          layerRefs.current.set(id, layer);
        }
      }
    }, [activeLayerIds, onFeatureClick]);

    useEffect(() => {
      // Small delay to ensure map is initialized
      const timer = setTimeout(syncLayers, 100);
      return () => clearTimeout(timer);
    }, [syncLayers]);

    // ------------------------------------------------------------------
    // Render agent spatial payload as GeoJSON overlay
    // ------------------------------------------------------------------
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      // Remove previous agent layer
      if (agentLayerRef.current) {
        map.removeLayer(agentLayerRef.current);
        agentLayerRef.current = null;
      }

      if (!spatialPayload) return;

      const renderPayload = async () => {
        const L = await import("leaflet");

        const agentLayer = L.geoJSON(spatialPayload, {
          style: () =>
            ({
              color: "#C45A15",
              fillColor: "#E8761B",
              fillOpacity: 0.35,
              weight: 2,
            }) as PathOptions,
          onEachFeature: (feature, layer) => {
            layer.on("click", () => {
              setSelectedFeature(feature, "Agent Results");
              onFeatureClick?.(feature, "Agent Results");
            });
          },
        });

        agentLayer.addTo(map);
        agentLayerRef.current = agentLayer;

        // Auto-zoom to the spatial results
        const bounds = agentLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
        }
      };

      renderPayload();
    }, [spatialPayload, setSelectedFeature, onFeatureClick]);

    // ------------------------------------------------------------------
    // Invalidate map size when container resizes (split view transitions)
    // ------------------------------------------------------------------
    useEffect(() => {
      if (!containerRef.current || !mapRef.current) return;

      const observer = new ResizeObserver(() => {
        mapRef.current?.invalidateSize();
      });
      observer.observe(containerRef.current);

      return () => observer.disconnect();
    }, []);

    return (
      <div
        ref={containerRef}
        className={`h-full w-full ${className ?? ""}`}
        style={{ minHeight: "300px" }}
      />
    );
  }
);

export default MapContainer;

// ---------------------------------------------------------------------------
// Layer factory — creates the correct Leaflet layer from a MapLayerDef
// ---------------------------------------------------------------------------

function createLayer(
  L: typeof import("leaflet"),
  esri: typeof import("esri-leaflet"),
  def: MapLayerDef,
  onFeatureClick?: (feature: GeoJSON.Feature, layerName: string) => void
): Layer | null {
  switch (def.type) {
    case "dynamic":
      return esri.dynamicMapLayer({
        url: def.url,
        layers: def.layers,
        opacity: def.opacity ?? 0.5,
      });

    case "tiled":
      return esri.tiledMapLayer({
        url: def.url,
        opacity: def.opacity ?? 0.6,
      });

    case "feature": {
      return esri.featureLayer({
        url: def.url,
        style: () => (def.style ?? {}) as PathOptions,
        onEachFeature: (feature: GeoJSON.Feature, layer: Layer) => {
          layer.on?.("click", () => {
            useMapStore.getState().setSelectedFeature(feature, def.name);
            onFeatureClick?.(feature, def.name);
          });
        },
      });
    }

    case "wms":
      return L.tileLayer.wms(def.url, {
        layers: def.layers?.join(",") ?? "0",
        format: "image/png",
        transparent: true,
        opacity: def.opacity ?? 0.5,
        attribution: def.source,
      });

    default:
      return null;
  }
}
