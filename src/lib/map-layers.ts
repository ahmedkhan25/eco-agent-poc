/**
 * Layer catalog registry for the EcoHeart map plugin.
 * Single source of truth for all available GIS layers —
 * URLs, rendering method, styling, and metadata.
 *
 * All endpoints listed here are public and require zero API keys.
 */

export type LayerCategory =
  | "climate"
  | "water"
  | "infrastructure"
  | "boundaries"
  | "realtime";

export type LayerType = "dynamic" | "tiled" | "feature" | "wms" | "geojson";

export interface MapLayerDef {
  id: string;
  name: string;
  category: LayerCategory;
  type: LayerType;
  url: string;
  /** Sublayer indices for dynamicMapLayer */
  layers?: number[];
  /** Leaflet path styling for feature/geojson layers */
  style?: {
    color?: string;
    fillColor?: string;
    fillOpacity?: number;
    weight?: number;
    opacity?: number;
  };
  /** Layer-level opacity for tiled/dynamic layers */
  opacity?: number;
  description: string;
  source: string;
  defaultVisible?: boolean;
  /** Caveat shown in UI (e.g. "City on-prem server — may be unavailable") */
  caveat?: string;
}

// ---------------------------------------------------------------------------
// Category display metadata
// ---------------------------------------------------------------------------

export const LAYER_CATEGORIES: Record<
  LayerCategory,
  { label: string; icon: string }
> = {
  climate: { label: "Climate & Hazards", icon: "thermometer" },
  water: { label: "Water & Environment", icon: "droplets" },
  infrastructure: { label: "Infrastructure & Utilities", icon: "building-2" },
  boundaries: { label: "Boundaries & Planning", icon: "map-pin" },
  realtime: { label: "Real-Time", icon: "radio" },
};

// ---------------------------------------------------------------------------
// Layer definitions — MVP stack (10 layers)
// ---------------------------------------------------------------------------

export const MAP_LAYERS: MapLayerDef[] = [
  // ── Climate & Hazards ────────────────────────────────────────────────
  {
    id: "fema-flood",
    name: "FEMA Flood Zones",
    category: "climate",
    type: "dynamic",
    url: "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer",
    layers: [28],
    opacity: 0.5,
    description:
      "National Flood Hazard Layer — flood zone designations including AE, X, and VE zones.",
    source: "FEMA NFHL",
    defaultVisible: false,
  },
  {
    id: "slr-1ft",
    name: "Sea Level Rise 1ft",
    category: "climate",
    type: "tiled",
    url: "https://coast.noaa.gov/arcgis/rest/services/dc_slr/slr_1ft/MapServer",
    opacity: 0.6,
    description: "NOAA sea level rise inundation scenario — 1 foot.",
    source: "NOAA Office for Coastal Management",
  },
  {
    id: "slr-3ft",
    name: "Sea Level Rise 3ft",
    category: "climate",
    type: "tiled",
    url: "https://coast.noaa.gov/arcgis/rest/services/dc_slr/slr_3ft/MapServer",
    opacity: 0.6,
    description: "NOAA sea level rise inundation scenario — 3 feet.",
    source: "NOAA Office for Coastal Management",
  },
  {
    id: "slr-6ft",
    name: "Sea Level Rise 6ft",
    category: "climate",
    type: "tiled",
    url: "https://coast.noaa.gov/arcgis/rest/services/dc_slr/slr_6ft/MapServer",
    opacity: 0.6,
    description: "NOAA sea level rise inundation scenario — 6 feet.",
    source: "NOAA Office for Coastal Management",
  },
  {
    id: "slr-10ft",
    name: "Sea Level Rise 10ft",
    category: "climate",
    type: "tiled",
    url: "https://coast.noaa.gov/arcgis/rest/services/dc_slr/slr_10ft/MapServer",
    opacity: 0.6,
    description: "NOAA sea level rise inundation scenario — 10 feet.",
    source: "NOAA Office for Coastal Management",
  },

  // ── Water & Environment ──────────────────────────────────────────────
  {
    id: "wetlands",
    name: "Thurston Wetlands",
    category: "water",
    type: "feature",
    url: "https://map.co.thurston.wa.us/arcgis/rest/services/Thurston/Thurston_Wetlands/FeatureServer/0",
    style: {
      color: "#047857",
      fillColor: "#059669",
      fillOpacity: 0.3,
      weight: 1,
    },
    description:
      "Thurston County mapped wetland boundaries with NWI classification codes.",
    source: "Thurston County GIS",
  },
  {
    id: "streams",
    name: "Thurston Streams",
    category: "water",
    type: "feature",
    url: "https://map.co.thurston.wa.us/arcgis/rest/services/Thurston/Thurston_Streams/FeatureServer/0",
    style: {
      color: "#0891B2",
      fillOpacity: 0,
      weight: 2,
    },
    description: "Stream and river centerlines in Thurston County.",
    source: "Thurston County GIS",
  },
  {
    id: "aquifer",
    name: "Critical Aquifer Recharge",
    category: "water",
    type: "feature",
    url: "https://map.co.thurston.wa.us/arcgis/rest/services/Thurston/Thurston_Critical_Aquifer_Recharge/FeatureServer/0",
    style: {
      color: "#B91C1C",
      fillColor: "#DC2626",
      fillOpacity: 0.25,
      weight: 1.5,
    },
    description:
      "Critical aquifer recharge areas — extreme and high sensitivity zones.",
    source: "Thurston County GIS",
    caveat: "County on-prem server — may be unavailable",
  },

  // ── Water & Environment (WMS) ────────────────────────────────────────
  {
    id: "nwi-wetlands",
    name: "National Wetlands Inventory",
    category: "water",
    type: "wms",
    url: "https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/services/Wetlands/MapServer/WMSServer",
    layers: [0],
    opacity: 0.5,
    description:
      "U.S. Fish & Wildlife Service National Wetlands Inventory boundaries.",
    source: "USFWS NWI",
  },

  // ── Boundaries & Planning ────────────────────────────────────────────
  // (can be expanded in future phases — zoning, parcels, city limits)
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** All SLR layer IDs for the scenario slider */
export const SLR_LAYER_IDS = ["slr-1ft", "slr-3ft", "slr-6ft", "slr-10ft"];

/** SLR foot values mapped to layer IDs */
export const SLR_SCENARIOS: { feet: number; layerId: string }[] = [
  { feet: 1, layerId: "slr-1ft" },
  { feet: 3, layerId: "slr-3ft" },
  { feet: 6, layerId: "slr-6ft" },
  { feet: 10, layerId: "slr-10ft" },
];

export function getLayerById(id: string): MapLayerDef | undefined {
  return MAP_LAYERS.find((l) => l.id === id);
}

export function getLayersByCategory(category: LayerCategory): MapLayerDef[] {
  return MAP_LAYERS.filter((l) => l.category === category);
}

/** Olympia, WA map defaults */
export const OLYMPIA_CENTER: [number, number] = [47.0379, -122.9007];
export const OLYMPIA_ZOOM = 12;
export const OLYMPIA_BOUNDS: [[number, number], [number, number]] = [
  [46.95, -123.1],
  [47.15, -122.75],
];
