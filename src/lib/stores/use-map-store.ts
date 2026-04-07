import { create } from "zustand";
import type { Feature, FeatureCollection } from "geojson";

interface MapState {
  /** Whether the map panel is visible (split view active) */
  isMapVisible: boolean;
  /** IDs of currently active/visible layers from the layer registry */
  activeLayerIds: string[];
  /** GeoJSON payload from agent spatial results */
  spatialPayload: FeatureCollection | null;
  /** Metadata about the spatial payload (source, query, bbox) */
  spatialMeta: SpatialMeta | null;
  /** Currently selected/clicked feature on the map */
  selectedFeature: Feature | null;
  /** Selected layer name for the selected feature */
  selectedFeatureLayer: string | null;
  /** Current SLR scenario in feet (1, 3, 6, or 10) */
  slrScenario: number;

  // Actions
  showMap: () => void;
  hideMap: () => void;
  toggleMap: () => void;
  setActiveLayerIds: (ids: string[]) => void;
  toggleLayer: (id: string) => void;
  setSpatialPayload: (
    data: FeatureCollection | null,
    meta?: SpatialMeta | null
  ) => void;
  setSelectedFeature: (
    feature: Feature | null,
    layerName?: string | null
  ) => void;
  setSlrScenario: (feet: number) => void;
  reset: () => void;
}

export interface SpatialMeta {
  source: string;
  endpoint: string;
  query: string;
  featureCount: number;
  bbox?: [number, number, number, number];
}

const initialState = {
  isMapVisible: false,
  activeLayerIds: [] as string[],
  spatialPayload: null as FeatureCollection | null,
  spatialMeta: null as SpatialMeta | null,
  selectedFeature: null as Feature | null,
  selectedFeatureLayer: null as string | null,
  slrScenario: 3,
};

export const useMapStore = create<MapState>((set) => ({
  ...initialState,

  showMap: () => set({ isMapVisible: true }),
  hideMap: () => set({ isMapVisible: false }),
  toggleMap: () => set((s) => ({ isMapVisible: !s.isMapVisible })),

  setActiveLayerIds: (ids) => set({ activeLayerIds: ids }),

  toggleLayer: (id) =>
    set((s) => ({
      activeLayerIds: s.activeLayerIds.includes(id)
        ? s.activeLayerIds.filter((l) => l !== id)
        : [...s.activeLayerIds, id],
    })),

  setSpatialPayload: (data, meta = null) =>
    set({
      spatialPayload: data,
      spatialMeta: meta,
      isMapVisible: data !== null,
    }),

  setSelectedFeature: (feature, layerName = null) =>
    set({ selectedFeature: feature, selectedFeatureLayer: layerName }),

  setSlrScenario: (feet) => set({ slrScenario: feet }),

  reset: () => set(initialState),
}));
