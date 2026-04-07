/**
 * ArcGIS Spatial Query Utility
 *
 * Server-side module for the EcoHeart spatial query pipeline.
 * Two-stage LLM routing with gpt-5.4-mini, auto-discovered schemas,
 * Nominatim geocoding, and GeoJSON fetch/truncation.
 *
 * All ArcGIS endpoints are public — zero API keys required.
 */

import OpenAI from "openai";
import type { FeatureCollection, Feature } from "geojson";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpatialEndpoint {
  id: string;
  name: string;
  keywords: string[];
  url: string;
  queryable: boolean;
  scenarios?: number[];
  exampleQueries: Array<{ natural: string; where: string }>;
  description: string;
}

export interface FieldSchema {
  name: string;
  type: string;
  alias: string;
  length?: number;
  domain?: {
    codedValues?: Array<{ code: string; name: string }>;
  };
}

export interface RoutingResult {
  endpointId: string;
  confidence: number;
  locationMention: string;
}

export interface ParseResult {
  whereClause: string;
  locationName: string;
  bufferMeters: number | null;
  slrScenarioFt: number | null;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  bbox: [number, number, number, number]; // [west, south, east, north]
  source: "landmark" | "nominatim";
}

export interface SpatialQueryResult {
  stages: {
    routing: RoutingResult;
    parsing: ParseResult;
    validation: {
      originalWhere: string;
      validatedWhere: string;
      invalidFields: string[];
    };
    geocode: GeocodeResult;
  };
  mapData: FeatureCollection | null;
  layerActivation: Array<{ layerId: string }> | null;
  textForLLM: {
    featureCount: number;
    bbox: number[] | null;
    propertyKeys: string[];
    sampleFeatures: Record<string, unknown>[];
    stats: Record<string, Record<string, number>>;
  } | null;
  meta: {
    source: string;
    endpoint: string;
    queryTimeMs: number;
  };
}

// ---------------------------------------------------------------------------
// Endpoint Registry
// ---------------------------------------------------------------------------

export const SPATIAL_ENDPOINTS: SpatialEndpoint[] = [
  {
    id: "fema-flood-zones",
    name: "FEMA Flood Zones",
    keywords: ["flood", "floodplain", "FEMA", "zone AE", "flood zone", "flood hazard"],
    url: "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28",
    queryable: true,
    exampleQueries: [
      { natural: "flood zone AE", where: "FLD_ZONE = 'AE'" },
      { natural: "high risk flood areas", where: "FLD_ZONE IN ('A','AE','VE')" },
      { natural: "all flood zones", where: "1=1" },
    ],
    description: "FEMA National Flood Hazard Layer — flood zone designations (AE, X, VE, etc.)",
  },
  {
    id: "thurston-wetlands",
    name: "Thurston County Wetlands",
    keywords: ["wetland", "marsh", "swamp", "NWI", "bog"],
    url: "https://map.co.thurston.wa.us/arcgis/rest/services/Thurston/Thurston_Wetlands/FeatureServer/0",
    queryable: true,
    exampleQueries: [
      { natural: "all wetlands", where: "1=1" },
    ],
    description: "Thurston County mapped wetland boundaries with NWI classification",
  },
  {
    id: "thurston-streams",
    name: "Thurston County Streams",
    keywords: ["stream", "river", "creek", "waterway"],
    url: "https://map.co.thurston.wa.us/arcgis/rest/services/Thurston/Thurston_Streams/FeatureServer/0",
    queryable: true,
    exampleQueries: [
      { natural: "all streams", where: "1=1" },
    ],
    description: "Stream and river centerlines in Thurston County",
  },
  {
    id: "thurston-aquifer",
    name: "Critical Aquifer Recharge Areas",
    keywords: ["aquifer", "recharge", "groundwater", "contamination"],
    url: "https://map.co.thurston.wa.us/arcgis/rest/services/Thurston/Thurston_Critical_Aquifer_Recharge/FeatureServer/0",
    queryable: true,
    exampleQueries: [
      { natural: "high sensitivity aquifer", where: "SENSITIVITY IN ('Extreme','High')" },
      { natural: "all recharge areas", where: "1=1" },
    ],
    description: "Critical aquifer recharge areas — sensitivity zones",
  },
  {
    id: "noaa-slr",
    name: "NOAA Sea Level Rise",
    keywords: ["sea level", "SLR", "inundation", "sea rise", "coastal flood", "sea level rise"],
    url: "",
    queryable: false,
    scenarios: [1, 3, 6, 10],
    exampleQueries: [],
    description: "NOAA sea level rise inundation scenarios (1-10ft)",
  },
];

// ---------------------------------------------------------------------------
// Schema Auto-Discovery + Fallbacks
// ---------------------------------------------------------------------------

const schemaCache = new Map<string, FieldSchema[]>();

const FALLBACK_SCHEMAS: Record<string, FieldSchema[]> = {
  "fema-flood-zones": [
    { name: "FLD_ZONE", type: "esriFieldTypeString", alias: "Flood Zone" },
    { name: "ZONE_SUBTY", type: "esriFieldTypeString", alias: "Zone Subtype" },
    { name: "SFHA_TF", type: "esriFieldTypeString", alias: "Special Flood Hazard Area" },
    { name: "STATIC_BFE", type: "esriFieldTypeDouble", alias: "Base Flood Elevation" },
    { name: "FLOODWAY", type: "esriFieldTypeString", alias: "Floodway" },
  ],
  "thurston-wetlands": [
    { name: "NWI_Code", type: "esriFieldTypeString", alias: "NWI Code" },
    { name: "ProjectName", type: "esriFieldTypeString", alias: "Project Name" },
  ],
  "thurston-aquifer": [
    { name: "SENSITIVITY", type: "esriFieldTypeString", alias: "Sensitivity" },
  ],
  "thurston-streams": [],
};

export async function getEndpointSchema(
  url: string,
  endpointId: string
): Promise<FieldSchema[]> {
  if (schemaCache.has(url)) return schemaCache.get(url)!;

  try {
    const response = await fetch(`${url}?f=json`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const metadata = await response.json();

    const SKIP_FIELDS = new Set([
      "OBJECTID", "GlobalID", "Shape__Area", "Shape__Length",
      "Shape", "FID", "Shape_Area", "Shape_Length",
    ]);

    const fields: FieldSchema[] = (metadata.fields ?? [])
      .filter((f: any) => !SKIP_FIELDS.has(f.name))
      .map((f: any) => ({
        name: f.name,
        type: f.type ?? "esriFieldTypeString",
        alias: f.alias ?? f.name,
        length: f.length,
        domain: f.domain ?? undefined,
      }));

    schemaCache.set(url, fields);
    return fields;
  } catch (err) {
    console.warn(`Schema fetch failed for ${endpointId}: ${err}. Using fallback.`);
    return FALLBACK_SCHEMAS[endpointId] ?? [];
  }
}

// ---------------------------------------------------------------------------
// Structured Output Schemas for gpt-5.4-mini
// ---------------------------------------------------------------------------

const ENDPOINT_IDS = SPATIAL_ENDPOINTS.map((e) => e.id);

const ROUTING_SCHEMA = {
  name: "spatial_routing",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      endpointId: { type: "string" as const, enum: ENDPOINT_IDS },
      confidence: { type: "number" as const },
      locationMention: { type: "string" as const },
    },
    required: ["endpointId", "confidence", "locationMention"],
    additionalProperties: false,
  },
};

const QUERY_PARSE_SCHEMA = {
  name: "spatial_query_parse",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      whereClause: { type: "string" as const },
      locationName: { type: "string" as const },
      bufferMeters: { type: ["number", "null"] as const },
      slrScenarioFt: { type: ["number", "null"] as const },
    },
    required: ["whereClause", "locationName", "bufferMeters", "slrScenarioFt"],
    additionalProperties: false,
  },
};

// ---------------------------------------------------------------------------
// Two-Stage LLM Routing
// ---------------------------------------------------------------------------

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SPATIAL_MODEL = "gpt-5.4-mini-2026-03-17";

export async function routeSpatialQuery(query: string): Promise<RoutingResult> {
  const client = getOpenAIClient();

  const endpointDescriptions = SPATIAL_ENDPOINTS.map(
    (e) => `- ${e.id}: ${e.description}`
  ).join("\n");

  const completion = await client.chat.completions.create({
    model: SPATIAL_MODEL,
    response_format: { type: "json_schema", json_schema: ROUTING_SCHEMA },
    messages: [
      {
        role: "system",
        content: `You classify spatial queries about Olympia, WA into dataset categories.

Available datasets:
${endpointDescriptions}

Return the best matching endpointId, your confidence (0.0-1.0), and the location mentioned in the query (or "Olympia" if none specified).`,
      },
      { role: "user", content: query },
    ],
    temperature: 0,
  });

  return JSON.parse(completion.choices[0].message.content!);
}

export async function parseSpatialQuery(
  query: string,
  endpoint: SpatialEndpoint
): Promise<ParseResult> {
  // For non-queryable endpoints (SLR), return simple parse
  if (!endpoint.queryable) {
    // Extract scenario from query if possible
    const scenarioMatch = query.match(/(\d+)\s*(?:ft|foot|feet)/i);
    const slrFt = scenarioMatch ? parseInt(scenarioMatch[1], 10) : 3;
    const validScenarios = endpoint.scenarios ?? [1, 3, 6, 10];
    const closest = validScenarios.reduce((prev, curr) =>
      Math.abs(curr - slrFt) < Math.abs(prev - slrFt) ? curr : prev
    );

    return {
      whereClause: "1=1",
      locationName: "Olympia",
      bufferMeters: null,
      slrScenarioFt: closest,
    };
  }

  // Fetch live schema for this endpoint
  const liveFields = await getEndpointSchema(endpoint.url, endpoint.id);

  const fieldSummary = liveFields
    .map((f) => {
      let desc = `${f.name} (${f.type.replace("esriFieldType", "")})`;
      if (f.domain?.codedValues) {
        desc += ` VALUES: ${f.domain.codedValues.map((cv) => cv.code).join(", ")}`;
      }
      return desc;
    })
    .join("\n");

  const exampleStr = endpoint.exampleQueries
    .map((e) => `"${e.natural}" → ${e.where}`)
    .join("\n");

  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: SPATIAL_MODEL,
    response_format: { type: "json_schema", json_schema: QUERY_PARSE_SCHEMA },
    messages: [
      {
        role: "system",
        content: `You parse spatial queries for the ${endpoint.name} dataset in Olympia, WA.

Available fields:
${fieldSummary || "(no specific fields — use WHERE 1=1 to return all features)"}

Example queries:
${exampleStr || "(none)"}

Rules:
- Generate a valid SQL WHERE clause using ONLY the fields listed above
- If no specific filter is needed, use "1=1"
- Extract the location name to geocode (e.g., "downtown Olympia", "Capitol Lake")
- If the user mentions a buffer distance, extract it in meters
- slrScenarioFt should be null (this is not an SLR query)`,
      },
      { role: "user", content: query },
    ],
    temperature: 0,
  });

  return JSON.parse(completion.choices[0].message.content!);
}

// ---------------------------------------------------------------------------
// WHERE Clause Validation
// ---------------------------------------------------------------------------

export function validateWhereClause(
  where: string,
  liveFields: FieldSchema[]
): { validatedWhere: string; invalidFields: string[] } {
  if (where === "1=1" || !where) {
    return { validatedWhere: "1=1", invalidFields: [] };
  }

  const knownFieldNames = new Set(
    liveFields.map((f) => f.name.toUpperCase())
  );

  // Strip string literals to avoid false positives
  const stripped = where.replace(/'[^']*'/g, "");

  // Split on SQL operators, parens, commas, quotes
  const tokens = stripped.split(/[\s,()=<>!]+/).filter(Boolean);

  const SQL_KEYWORDS = new Set([
    "AND", "OR", "NOT", "IN", "LIKE", "BETWEEN", "IS", "NULL",
    "SELECT", "WHERE", "FROM", "1",
  ]);

  const candidates = tokens.filter(
    (t) => !SQL_KEYWORDS.has(t.toUpperCase()) && isNaN(Number(t))
  );

  const invalidFields = candidates.filter(
    (t) => !knownFieldNames.has(t.toUpperCase())
  );

  if (invalidFields.length > 0) {
    console.warn(
      `WHERE validation: hallucinated fields [${invalidFields.join(", ")}]. Falling back to 1=1.`
    );
    return { validatedWhere: "1=1", invalidFields };
  }

  return { validatedWhere: where, invalidFields: [] };
}

// ---------------------------------------------------------------------------
// Geocoding — Nominatim + Olympia Landmarks
// ---------------------------------------------------------------------------

const OLYMPIA_LANDMARKS: Record<
  string,
  { lat: number; lng: number }
> = {
  downtown: { lat: 47.0379, lng: -122.9007 },
  "downtown olympia": { lat: 47.0379, lng: -122.9007 },
  olympia: { lat: 47.0379, lng: -122.9007 },
  "capitol lake": { lat: 47.0356, lng: -122.9065 },
  "capitol campus": { lat: 47.0358, lng: -122.905 },
  "percival landing": { lat: 47.0465, lng: -122.9047 },
  tumwater: { lat: 46.9998, lng: -122.9064 },
  lacey: { lat: 47.0343, lng: -122.8232 },
  "west olympia": { lat: 47.0418, lng: -122.9355 },
  "eastside": { lat: 47.0462, lng: -122.874 },
  "south capitol": { lat: 47.0289, lng: -122.9012 },
  "martin way": { lat: 47.0424, lng: -122.8195 },
  "harrison ave": { lat: 47.0458, lng: -122.9152 },
  "4th avenue": { lat: 47.0456, lng: -122.9012 },
  "4th ave": { lat: 47.0456, lng: -122.9012 },
};

const BUFFER_KM = 0.015; // ~1.5km default bbox radius

export async function geocodeLocation(
  name: string
): Promise<GeocodeResult> {
  const normalized = name.toLowerCase().trim();

  // Check landmarks first
  for (const [key, coords] of Object.entries(OLYMPIA_LANDMARKS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return {
        lat: coords.lat,
        lng: coords.lng,
        bbox: [
          coords.lng - BUFFER_KM * 4,
          coords.lat - BUFFER_KM * 3,
          coords.lng + BUFFER_KM * 4,
          coords.lat + BUFFER_KM * 3,
        ],
        source: "landmark",
      };
    }
  }

  // Nominatim fallback — constrained to Olympia area
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", `${name}, Olympia, WA`);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set(
      "viewbox",
      "-123.1,46.95,-122.75,47.15"
    );
    url.searchParams.set("bounded", "1");

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": "EcoHeart/1.0 (ecoheart-poc)" },
      signal: AbortSignal.timeout(5000),
    });
    const results = await response.json();

    if (results.length > 0) {
      const r = results[0];
      const lat = parseFloat(r.lat);
      const lng = parseFloat(r.lon);
      const bbox: [number, number, number, number] = r.boundingbox
        ? [
            parseFloat(r.boundingbox[2]), // west
            parseFloat(r.boundingbox[0]), // south
            parseFloat(r.boundingbox[3]), // east
            parseFloat(r.boundingbox[1]), // north
          ]
        : [
            lng - BUFFER_KM * 4,
            lat - BUFFER_KM * 3,
            lng + BUFFER_KM * 4,
            lat + BUFFER_KM * 3,
          ];

      return { lat, lng, bbox, source: "nominatim" };
    }
  } catch (err) {
    console.warn(`Nominatim geocode failed for "${name}": ${err}`);
  }

  // Ultimate fallback: downtown Olympia
  return {
    lat: 47.0379,
    lng: -122.9007,
    bbox: [-122.94, 47.01, -122.86, 47.06],
    source: "landmark",
  };
}

// ---------------------------------------------------------------------------
// ArcGIS Feature Query
// ---------------------------------------------------------------------------

export async function queryArcGISFeatures(
  endpointUrl: string,
  where: string,
  bbox: [number, number, number, number],
  maxFeatures: number = 200
): Promise<FeatureCollection> {
  const url = new URL(`${endpointUrl}/query`);
  url.searchParams.set("where", where);
  url.searchParams.set(
    "geometry",
    JSON.stringify({
      xmin: bbox[0],
      ymin: bbox[1],
      xmax: bbox[2],
      ymax: bbox[3],
      spatialReference: { wkid: 4326 },
    })
  );
  url.searchParams.set("geometryType", "esriGeometryEnvelope");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "*");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("f", "geojson");
  url.searchParams.set("resultRecordCount", String(maxFeatures));

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(
      `ArcGIS query failed: HTTP ${response.status} from ${endpointUrl}`
    );
  }

  const data = await response.json();

  // ArcGIS sometimes returns { error: {...} } instead of GeoJSON
  if (data.error) {
    throw new Error(
      `ArcGIS error: ${data.error.message ?? JSON.stringify(data.error)}`
    );
  }

  return data as FeatureCollection;
}

// ---------------------------------------------------------------------------
// GeoJSON Truncation for LLM
// ---------------------------------------------------------------------------

export function truncateForLLM(geojson: FeatureCollection): {
  featureCount: number;
  bbox: number[] | null;
  propertyKeys: string[];
  sampleFeatures: Record<string, unknown>[];
  stats: Record<string, Record<string, number>>;
} {
  const features = geojson.features ?? [];

  // Collect all property keys
  const keySet = new Set<string>();
  for (const f of features) {
    if (f.properties) {
      for (const k of Object.keys(f.properties)) {
        keySet.add(k);
      }
    }
  }
  const propertyKeys = [...keySet].filter(
    (k) =>
      !["OBJECTID", "GlobalID", "Shape__Area", "Shape__Length", "FID"].includes(k)
  );

  // Sample features (properties only, no geometry)
  const sampleFeatures = features.slice(0, 5).map((f) => {
    const props: Record<string, unknown> = {};
    for (const k of propertyKeys) {
      if (f.properties?.[k] !== undefined && f.properties[k] !== null) {
        props[k] = f.properties[k];
      }
    }
    return props;
  });

  // Compute value distribution stats for string fields
  const stats: Record<string, Record<string, number>> = {};
  for (const key of propertyKeys) {
    const values: string[] = [];
    for (const f of features) {
      const val = f.properties?.[key];
      if (typeof val === "string" && val) values.push(val);
    }
    if (values.length > 0) {
      const dist: Record<string, number> = {};
      for (const v of values) {
        dist[v] = (dist[v] ?? 0) + 1;
      }
      // Only include if there are <= 20 distinct values (useful enum, not unique IDs)
      if (Object.keys(dist).length <= 20) {
        stats[key] = dist;
      }
    }
  }

  // Compute bbox from features
  let bbox: number[] | null = null;
  if (geojson.bbox) {
    bbox = geojson.bbox as number[];
  } else if (features.length > 0) {
    let minLng = Infinity, minLat = Infinity;
    let maxLng = -Infinity, maxLat = -Infinity;
    for (const f of features) {
      visitCoordinates(f.geometry, (lng, lat) => {
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
      });
    }
    if (isFinite(minLng)) {
      bbox = [minLng, minLat, maxLng, maxLat];
    }
  }

  return {
    featureCount: features.length,
    bbox,
    propertyKeys,
    sampleFeatures,
    stats,
  };
}

/** Walk all coordinates in a GeoJSON geometry */
function visitCoordinates(
  geometry: Feature["geometry"],
  fn: (lng: number, lat: number) => void
) {
  if (!geometry) return;
  const coords = (geometry as any).coordinates;
  if (!coords) return;

  function walk(c: any) {
    if (typeof c[0] === "number") {
      fn(c[0], c[1]);
    } else if (Array.isArray(c)) {
      for (const sub of c) walk(sub);
    }
  }
  walk(coords);
}

// ---------------------------------------------------------------------------
// Full Pipeline
// ---------------------------------------------------------------------------

const SLR_LAYER_MAP: Record<number, string> = {
  1: "slr-1ft",
  3: "slr-3ft",
  6: "slr-6ft",
  10: "slr-10ft",
};

export async function runSpatialPipeline(
  query: string
): Promise<SpatialQueryResult> {
  const startTime = Date.now();

  // Stage 1: Route
  const routing = await routeSpatialQuery(query);
  const endpoint = SPATIAL_ENDPOINTS.find((e) => e.id === routing.endpointId);

  if (!endpoint) {
    throw new Error(`Unknown endpoint: ${routing.endpointId}`);
  }

  // Low-confidence fallback: activate multiple layers
  if (routing.confidence < 0.7) {
    const relevantLayers = SPATIAL_ENDPOINTS.filter(
      (e) => e.queryable && e.id !== "noaa-slr"
    ).map((e) => ({ layerId: e.id.replace("thurston-", "") }));

    return {
      stages: {
        routing,
        parsing: { whereClause: "1=1", locationName: routing.locationMention, bufferMeters: null, slrScenarioFt: null },
        validation: { originalWhere: "1=1", validatedWhere: "1=1", invalidFields: [] },
        geocode: await geocodeLocation(routing.locationMention),
      },
      mapData: null,
      layerActivation: relevantLayers,
      textForLLM: null,
      meta: {
        source: "multi-layer fallback (low confidence)",
        endpoint: "",
        queryTimeMs: Date.now() - startTime,
      },
    };
  }

  // Stage 2: Parse
  const parsing = await parseSpatialQuery(query, endpoint);

  // Stage 3: Geocode
  const geocode = await geocodeLocation(parsing.locationName);

  // Handle SLR (non-queryable — layer activation)
  if (!endpoint.queryable && parsing.slrScenarioFt !== null) {
    const layerId = SLR_LAYER_MAP[parsing.slrScenarioFt] ?? "slr-3ft";
    return {
      stages: {
        routing,
        parsing,
        validation: { originalWhere: "1=1", validatedWhere: "1=1", invalidFields: [] },
        geocode,
      },
      mapData: null,
      layerActivation: [{ layerId }],
      textForLLM: {
        featureCount: 0,
        bbox: geocode.bbox,
        propertyKeys: [],
        sampleFeatures: [],
        stats: {},
      },
      meta: {
        source: endpoint.name,
        endpoint: `NOAA SLR ${parsing.slrScenarioFt}ft`,
        queryTimeMs: Date.now() - startTime,
      },
    };
  }

  // Stage 4: Validate WHERE clause
  const liveFields = await getEndpointSchema(endpoint.url, endpoint.id);
  const validation = validateWhereClause(parsing.whereClause, liveFields);

  // Stage 5: Fetch GeoJSON
  let mapData: FeatureCollection | null = null;
  let textForLLM: SpatialQueryResult["textForLLM"] = null;

  try {
    mapData = await queryArcGISFeatures(
      endpoint.url,
      validation.validatedWhere,
      geocode.bbox
    );
    textForLLM = truncateForLLM(mapData);
  } catch (err) {
    console.error(`ArcGIS fetch failed: ${err}`);
    textForLLM = {
      featureCount: 0,
      bbox: geocode.bbox,
      propertyKeys: [],
      sampleFeatures: [],
      stats: {},
    };
  }

  return {
    stages: {
      routing,
      parsing,
      validation: {
        originalWhere: parsing.whereClause,
        validatedWhere: validation.validatedWhere,
        invalidFields: validation.invalidFields,
      },
      geocode,
    },
    mapData,
    layerActivation: null,
    textForLLM,
    meta: {
      source: endpoint.name,
      endpoint: endpoint.url,
      queryTimeMs: Date.now() - startTime,
    },
  };
}
