# Phase 4: AI-Driven Spatial Queries — Implementation Plan

## Context

EcoHeart Phases 1-3 are shipped: Leaflet map, layer toggles, feature popups, SLR slider, split-view layout, Map Explorer page. The Zustand store's `setSpatialPayload(geojson, meta)` already triggers the map panel. What's missing: the AI tool that lets users type "Show me flood zones near downtown" and have the map respond.

Uses **gpt-5.4-mini** (`gpt-5.4-mini-2026-03-17`) at $0.75/$4.50 per M tokens for spatial parsing. Test pipeline independently before wiring into chat.

## Architecture: Deterministic Pipeline with Two-Stage LLM Routing

This is NOT an agentic loop — it's a **fixed pipeline** (Sequential Processing / Chain pattern). No `ToolLoopAgent` needed. The spatial tool's `execute` function is a deterministic 5-stage pipeline where only Stages 1-2 involve LLM calls.

Following the OpenAI multi-agent "agent-as-tool" pattern — the main chat agent (gpt-5.1) orchestrates, and the spatial tool internally uses gpt-5.4-mini as a specialist sub-agent:

```
User: "Show me how 4th Ave is affected by 1ft sea level rise"
        │
        ▼
Main Chat Agent (gpt-5.1 via streamText)
  recognizes spatial intent → calls spatialQuery tool
        │
        ▼
spatialQuery execute() — DETERMINISTIC PIPELINE:
  ┌──────────────────────────────────────────────────┐
  │ Stage 1: ROUTE (gpt-5.4-mini, structured output) │
  │   Classify query → one of N endpoint categories   │
  │   → { endpointId: "noaa-slr", confidence: 0.95,  │
  │        locationMention: "4th Ave" }                │
  │                                                    │
  │ Stage 2: PARSE (gpt-5.4-mini, targeted schema)    │
  │   Inject ONLY selected endpoint's field schema     │
  │   + few-shot examples → generate WHERE clause      │
  │   → { whereClause, locationName, bufferMeters }    │
  │                                                    │
  │ Stage 3: GEOCODE (Nominatim, free)                 │
  │   → { lat: 47.0456, lng: -122.9012, bbox: [...] } │
  │                                                    │
  │ Stage 4: FETCH or ACTIVATE                         │
  │   SLR → layerActivation: "slr-1ft" (no query)     │
  │   FEMA/Thurston → fetch f=geojson from REST        │
  │                                                    │
  │ Stage 5: VALIDATE + TRUNCATE                       │
  │   Validate WHERE clause fields against schema      │
  │   Full GeoJSON → mapData (for Leaflet)             │
  │   Compact summary → llmSummary (for GPT-5.1)      │
  └──────────────────────────────────────────────────┘
        │
        ▼
Main Chat Agent receives summary → writes natural language response
Frontend receives mapData → pushes to map store → map renders
```

### Why Two-Stage Routing?

A single LLM call that sees all 10 endpoint schemas at once is unreliable:
- **Endpoint selection ambiguity:** "flood risk" could mean FEMA NFHL, NOAA SLR, or FEMA Risk Index
- **Schema mismatch:** Each endpoint has completely different field names (FLD_ZONE vs WETLAND_TY vs SENSITIVITY)
- **Hallucinated fields:** If the LLM generates `FLOOD_TYPE` but the endpoint only has `FLD_ZONE`, the ArcGIS query fails

Two-stage solves this: Stage 1 is a simple classification (which dataset?). Stage 2 sees ONLY that dataset's schema + few-shot examples. Each call has a focused, constrained task.

---

## Step 1: ArcGIS Query Utility Module (server-side)

**New file: `src/lib/arcgis-query.ts`**

Pure server-side utility, no React. Contains:

### 1a. Spatial endpoint registry + schema auto-discovery

**Key principle: don't hardcode field schemas — auto-discover them from ArcGIS REST metadata.**

Every ArcGIS endpoint self-documents when you append `?f=json`. It returns the complete field list with names, types, aliases, and coded value domains (enums). The module fetches and caches these schemas at first use, then feeds the live schema to the LLM.

**Endpoint registry (static — what to query):**
```typescript
SPATIAL_ENDPOINTS = [
  {
    id: "fema-flood-zones",
    name: "FEMA Flood Zones",
    keywords: ["flood", "floodplain", "FEMA", "zone AE", "flood zone"],
    url: "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28",
    queryable: true,
    // Few-shot examples anchor the LLM to correct syntax
    exampleQueries: [
      { natural: "flood zone AE", where: "FLD_ZONE = 'AE'" },
      { natural: "high risk flood areas", where: "FLD_ZONE IN ('A','AE','VE')" },
      { natural: "all flood zones", where: "1=1" }
    ],
    description: "FEMA National Flood Hazard Layer — flood zone designations"
  },
  {
    id: "thurston-wetlands",
    name: "Thurston County Wetlands",
    keywords: ["wetland", "marsh", "swamp", "NWI"],
    url: "https://map.co.thurston.wa.us/arcgis/rest/services/Thurston/Thurston_Wetlands/FeatureServer/0",
    queryable: true,
    exampleQueries: [
      { natural: "all wetlands", where: "1=1" }
    ],
    description: "Thurston County mapped wetland boundaries with NWI classification"
  },
  {
    id: "thurston-streams",
    name: "Thurston County Streams",
    keywords: ["stream", "river", "creek", "waterway"],
    url: "https://map.co.thurston.wa.us/arcgis/rest/services/Thurston/Thurston_Streams/FeatureServer/0",
    queryable: true,
    exampleQueries: [{ natural: "all streams", where: "1=1" }],
    description: "Stream and river centerlines in Thurston County"
  },
  {
    id: "thurston-aquifer",
    name: "Critical Aquifer Recharge Areas",
    keywords: ["aquifer", "recharge", "groundwater"],
    url: "https://map.co.thurston.wa.us/arcgis/rest/services/Thurston/Thurston_Critical_Aquifer_Recharge/FeatureServer/0",
    queryable: true,
    exampleQueries: [
      { natural: "high sensitivity", where: "SENSITIVITY IN ('Extreme','High')" },
      { natural: "all recharge areas", where: "1=1" }
    ],
    description: "Critical aquifer recharge areas — sensitivity zones"
  },
  {
    id: "noaa-slr",
    name: "NOAA Sea Level Rise",
    keywords: ["sea level", "SLR", "inundation", "sea rise", "coastal flood"],
    queryable: false,  // tiled MapServer, no /query endpoint
    scenarios: [1, 3, 6, 10],
    description: "NOAA sea level rise inundation scenarios (1-10ft)"
  }
]
```

**Schema auto-discovery (dynamic — how to query):**
```typescript
interface FieldSchema {
  name: string;
  type: string;        // esriFieldTypeString, esriFieldTypeDouble, etc.
  alias: string;
  length?: number;
  domain?: {           // coded value domains = enums
    codedValues?: Array<{ code: string; name: string }>;
  };
}

// In-memory cache — lives for server process duration
const schemaCache = new Map<string, FieldSchema[]>();

async function getEndpointSchema(url: string): Promise<FieldSchema[]> {
  if (schemaCache.has(url)) return schemaCache.get(url)!;
  
  const response = await fetch(`${url}?f=json`, { signal: AbortSignal.timeout(5000) });
  const metadata = await response.json();
  
  const fields = (metadata.fields ?? []).filter((f: any) =>
    !["OBJECTID", "GlobalID", "Shape__Area", "Shape__Length", "Shape", "FID"].includes(f.name)
  );
  
  schemaCache.set(url, fields);
  return fields;
}
```

**How it feeds into Stage 2 of the LLM call:**
```typescript
const schema = await getEndpointSchema(endpoint.url);
const fieldSummary = schema.map(f => {
  let desc = `${f.name} (${f.type.replace("esriFieldType", "")})`;
  if (f.domain?.codedValues) {
    desc += ` VALUES: ${f.domain.codedValues.map(cv => cv.code).join(", ")}`;
  }
  return desc;
}).join("\n");

// GPT-5.4-mini sees the REAL fields from the live endpoint
const prompt = `Dataset: ${endpoint.name}\nFields:\n${fieldSummary}\n` +
  `Examples:\n${endpoint.exampleQueries.map(e => `"${e.natural}" → ${e.where}`).join("\n")}\n` +
  `Generate a WHERE clause for: "${userQuery}"`;
```

**Schema fetch error handling — hardcoded fallbacks for offline servers:**
```typescript
const FALLBACK_SCHEMAS: Record<string, FieldSchema[]> = {
  "fema-flood-zones": [
    { name: "FLD_ZONE", type: "esriFieldTypeString", alias: "Flood Zone" },
    { name: "ZONE_SUBTY", type: "esriFieldTypeString", alias: "Zone Subtype" },
    { name: "SFHA_TF", type: "esriFieldTypeString", alias: "Special Flood Hazard Area" },
    { name: "STATIC_BFE", type: "esriFieldTypeDouble", alias: "Base Flood Elevation" },
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

async function getEndpointSchema(url: string, endpointId: string): Promise<FieldSchema[]> {
  if (schemaCache.has(url)) return schemaCache.get(url)!;
  try {
    const response = await fetch(`${url}?f=json`, { signal: AbortSignal.timeout(5000) });
    const metadata = await response.json();
    const fields = (metadata.fields ?? []).filter(/* ... */);
    schemaCache.set(url, fields);
    return fields;
  } catch (err) {
    console.warn(`Schema fetch failed for ${endpointId}, using fallback`);
    return FALLBACK_SCHEMAS[endpointId] ?? [];
  }
}
```

**Benefits:**
- Never hardcode field names as primary source — if Thurston County adds a field, we pick it up automatically
- LLM always sees the real schema when available, falls back to known fields when server is offline
- WHERE validation checks against the discovered schema
- Coded value domains (enums) from ArcGIS become the LLM's allowed values

**Known schemas from research (for reference, not hardcoded):**

| Endpoint | Key Fields | Notes |
|----------|-----------|-------|
| FEMA NFHL (Layer 28) | `FLD_ZONE` (A/AE/AH/AO/VE/X/D), `ZONE_SUBTY`, `SFHA_TF` (T/F), `STATIC_BFE` (feet), `FLOODWAY` | Most queryable fields |
| Thurston Wetlands | `NWI_Code`, `ProjectName` | Sparse schema |
| Thurston Streams | Basic attributes | Limited queryable fields |
| Thurston Aquifer | `SENSITIVITY` (Extreme/High/Medium/Low) | Key enum field |
| NOAA SLR | N/A — tiled raster, not queryable | Layer activation only |

### 1b. Two-stage intent parsing with gpt-5.4-mini

Uses OpenAI SDK directly (same pattern as systems-modeler routes).

**JSON Schema definitions for structured output:**

```typescript
// Stage 1: Routing schema
const ROUTING_SCHEMA = {
  name: "spatial_routing",
  strict: true,
  schema: {
    type: "object",
    properties: {
      endpointId: {
        type: "string",
        enum: ["fema-flood-zones", "thurston-wetlands", "thurston-streams",
               "thurston-aquifer", "noaa-slr"]
      },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      locationMention: { type: "string", description: "Place name from query, or 'Olympia' if none" }
    },
    required: ["endpointId", "confidence", "locationMention"],
    additionalProperties: false
  }
};

// Stage 2: Query parsing schema
const QUERY_PARSE_SCHEMA = {
  name: "spatial_query_parse",
  strict: true,
  schema: {
    type: "object",
    properties: {
      whereClause: { type: "string", description: "SQL WHERE clause using endpoint fields, or '1=1' for all" },
      locationName: { type: "string", description: "Place name to geocode" },
      bufferMeters: { type: ["number", "null"], description: "Buffer radius in meters, null if not needed" },
      slrScenarioFt: { type: ["number", "null"], description: "SLR scenario in feet (1/3/6/10), null if not SLR" }
    },
    required: ["whereClause", "locationName", "bufferMeters", "slrScenarioFt"],
    additionalProperties: false
  }
};
```

**Stage 1 — ROUTE (classify):**
```typescript
const routing = await openai.chat.completions.create({
  model: "gpt-5.4-mini-2026-03-17",
  response_format: { type: "json_schema", json_schema: ROUTING_SCHEMA },
  messages: [{
    role: "system",
    content: `Classify this spatial query into one of these dataset categories:
      - fema-flood-zones: FEMA flood zones, floodplains, base flood elevation
      - noaa-slr: Sea level rise, coastal flooding, inundation scenarios
      - thurston-wetlands: Wetlands, marshes, NWI classifications
      - thurston-streams: Streams, rivers, creeks, waterways
      - thurston-aquifer: Groundwater, aquifer recharge, contamination risk
      Return: { endpointId, confidence, locationMention }`
  }, { role: "user", content: query }]
});
```
Returns: `{ endpointId, confidence: 0-1, locationMention }`

**Stage 2 — PARSE (targeted schema from auto-discovery):**
```typescript
const endpoint = SPATIAL_ENDPOINTS.find(e => e.id === routing.endpointId);

// Fetch LIVE field schema from ArcGIS (cached after first call)
const liveFields = await getEndpointSchema(endpoint.url);
const fieldSummary = liveFields.map(f => {
  let desc = `${f.name} (${f.type.replace("esriFieldType", "")})`;
  if (f.domain?.codedValues) {
    desc += ` VALUES: ${f.domain.codedValues.map(cv => cv.code).join(", ")}`;
  }
  return desc;
}).join("\n");

const parsing = await openai.chat.completions.create({
  model: "gpt-5.4-mini-2026-03-17",
  response_format: { type: "json_schema", json_schema: QUERY_PARSE_SCHEMA },
  messages: [{
    role: "system",
    content: `Parse a spatial query for the ${endpoint.name} dataset.
      Available fields:\n${fieldSummary}
      Example queries:\n${endpoint.exampleQueries.map(e => `"${e.natural}" → ${e.where}`).join("\n")}
      Generate a valid SQL WHERE clause using ONLY the fields listed above.`
  }, { role: "user", content: query }]
});
```
Returns: `{ whereClause, locationName, bufferMeters, slrScenarioFt }`

**Low-confidence fallback (< 0.7):** If Stage 1 confidence is low, activate multiple relevant layers on the map without WHERE filters. Return `layerActivation` as an array: `[{ layerId: "fema-flood" }, { layerId: "thurston-wetlands" }]` and text: "I've loaded several relevant layers — click any feature for details."

### 1c. WHERE clause validation

Before sending to ArcGIS, validate the LLM-generated WHERE clause against the auto-discovered schema. Uses a practical tokenizer approach (not a full SQL parser):

```typescript
function validateWhereClause(where: string, liveFields: FieldSchema[]): string {
  if (where === "1=1") return where;
  
  const knownFieldNames = liveFields.map(f => f.name.toUpperCase());
  
  // Practical extraction: strip string literals, then split on SQL operators/parens/quotes
  const stripped = where.replace(/'[^']*'/g, ""); // remove string literals
  const tokens = stripped.split(/[\s,()=<>!]+/).filter(Boolean);
  
  // SQL keywords to ignore
  const SQL_KEYWORDS = new Set([
    "AND", "OR", "NOT", "IN", "LIKE", "BETWEEN", "IS", "NULL",
    "1", "SELECT", "WHERE", "FROM"
  ]);
  
  const candidates = tokens.filter(t =>
    !SQL_KEYWORDS.has(t.toUpperCase()) && isNaN(Number(t))
  );
  
  const invalid = candidates.filter(t => !knownFieldNames.includes(t.toUpperCase()));
  
  if (invalid.length > 0) {
    console.warn(`LLM hallucinated fields: ${invalid.join(", ")}. Falling back to bbox-only.`);
    return "1=1";
  }
  return where;
}
```

### 1d. `geocodeLocation(name)` — Nominatim (free, no auth)

Converts "downtown Olympia" → `{ lat, lng, bbox }`. Constrained to Olympia area. Hardcoded fallback table for local landmarks:

```typescript
const OLYMPIA_LANDMARKS = {
  "downtown": { lat: 47.0379, lng: -122.9007 },
  "capitol lake": { lat: 47.0356, lng: -122.9065 },
  "percival landing": { lat: 47.0465, lng: -122.9047 },
  "capitol campus": { lat: 47.0358, lng: -122.9050 },
  "tumwater": { lat: 46.9998, lng: -122.9064 },
  "lacey": { lat: 47.0343, lng: -122.8232 },
  // ... more landmarks
};
```

### 1e. `queryArcGISFeatures(config)` — fetches GeoJSON

Constructs REST URL with `f=geojson`, `outSR=4326`, `resultRecordCount=200`, geometry envelope. 5-second timeout. Error handling for unavailable Thurston County on-prem servers.

### 1f. `truncateForLLM(geojson)` — splits the return

Full GeoJSON → map. Compact summary for LLM:
```typescript
{
  featureCount: 47,
  bbox: [-122.91, 47.03, -122.89, 47.05],
  propertyKeys: ["FLD_ZONE", "ZONE_SUBTY", "STATIC_BFE"],
  sampleFeatures: [ /* 3-5 features, properties only, no geometry */ ],
  stats: { FLD_ZONE: { "AE": 32, "X": 15 } }  // value distributions for string fields
}
```

---

## Step 2: Test API Route

**New file: `src/app/api/spatial-query/route.ts`**

Standalone POST endpoint. Full pipeline:
1. Stage 1: `routeSpatialQuery(query)` → endpoint classification
2. Stage 2: `parseSpatialQuery(query, endpoint)` → WHERE clause + location
3. Validate WHERE clause against endpoint schema
4. `geocodeLocation(locationName)` → coordinates
5. If SLR: return `{ layerActivation: [{ layerId: "slr-3ft" }] }`
6. If low confidence: return `{ layerActivation: [{ layerId: "fema-flood" }, { layerId: "thurston-wetlands" }, ...] }`
7. Else: `queryArcGISFeatures(...)` → GeoJSON
8. `truncateForLLM(geojson)` → summary
9. Return all intermediate results for debug visibility:

```typescript
// Test API response — includes all debug data
interface SpatialQueryResponse {
  stages: {
    routing: { endpointId: string; confidence: number; locationMention: string };
    parsing: { whereClause: string; locationName: string; bufferMeters: number | null; slrScenarioFt: number | null };
    validation: { originalWhere: string; validatedWhere: string; invalidFields: string[] };
    geocode: { lat: number; lng: number; bbox: number[]; source: "landmark" | "nominatim" };
  };
  mapData: FeatureCollection | null;
  layerActivation: Array<{ layerId: string }> | null;  // ARRAY for multi-layer fallback
  summary: { featureCount: number; bbox: number[]; sampleFeatures: object[]; stats: object };
  meta: { source: string; endpoint: string; queryTimeMs: number };
}
```

**Chat tool return shape** (different from test API — optimized for LLM + frontend consumption):
```typescript
// What spatialQuery tool execute() returns in tools.ts
interface SpatialToolResult {
  textForLLM: object;     // compact summary — feature count, stats, sample properties
  mapData: FeatureCollection | null;  // full GeoJSON — stripped before re-entering LLM context
  layerActivation: Array<{ layerId: string }> | null;
  meta: SpatialMeta;
}
```
- `chat-interface.tsx` extracts `mapData` → `useMapStore.setSpatialPayload()`
- `chat-interface.tsx` extracts `layerActivation` → `useMapStore.toggleLayer()` per item
- `route.ts` strips `mapData` via `stripSpatialMapData` before results re-enter conversation

---

## Step 3: Test Page

**New file: `src/app/spatial-test/page.tsx`**

Interactive page for validating the pipeline before integration:
- Text input + example query buttons
- Calls `POST /api/spatial-query`
- **Debug panel** (collapsible): shows all `stages` from response — routing result, parsed WHERE clause, validation, geocode
- **Schema inspector panel:** shows the auto-discovered field schema for each endpoint (what the LLM sees). Fetches via `GET /api/spatial-query/schema?endpoint=fema-flood-zones`
- **Results panel:** feature count, query time, attribute summary
- **Map panel:** reuses `EcoHeartMap` component, pushes results via `useMapStore`

### Test queries to validate:
1. "Show me flood zones near downtown Olympia" → FEMA NFHL, geocode downtown
2. "What wetlands are near Capitol Lake?" → Thurston Wetlands, landmark lookup
3. "Are there streams near Martin Way?" → Thurston Streams, Nominatim geocode
4. "Show critical aquifer recharge areas near Tumwater" → Thurston Aquifer, landmark
5. "What areas would flood with 3 feet of sea level rise?" → SLR layer activation (no GeoJSON)
6. "Show me high risk flood zone AE areas" → FEMA NFHL with `FLD_ZONE = 'AE'` WHERE clause
7. "Show me environmental risks downtown" → Low confidence → multi-layer fallback

**Acceptance criteria:** All 7 queries return correct endpoint selection, valid geocoding, correct WHERE clauses, and render on the test map. Hallucinated fields caught by validation.

---

## Step 4: Wire into Main Chat

### 4a. Add `spatialQuery` tool to `src/lib/tools.ts`

Add to the `healthcareTools` object. The `execute` function reuses all functions from `arcgis-query.ts`. Returns: `{ textForLLM, mapData, layerActivation, meta }` — matching the `SpatialToolResult` interface defined in Step 2.

### 4b. Update system prompt in `src/app/api/chat/route.ts`

Add spatial instructions after existing RAG section (~line 816):
```
SPATIAL/GIS CAPABILITIES:
When users ask about locations, flood risks, sea level rise, wetlands, streams, or 
geographic features in the Olympia area, use the spatialQuery tool. It queries public
government GIS services and returns map-visualizable data.

Available data: FEMA flood zones (AE/X/VE designations), NOAA sea level rise 
scenarios (1-10ft), Thurston County wetlands, streams, and critical aquifer recharge areas.

The tool returns a summary with feature count, key attributes, and sample data. Use this
to write an informative response. The map visualization is generated automatically.
```

Add `stripSpatialMapData` in the context-stripping logic (like `stripBase64Images` at line 152) to remove full GeoJSON from tool results before they re-enter the LLM context.

### 4c. Render in `src/components/chat-interface.tsx`

Add `case "tool-spatialQuery":` in the `switch(part.type)` block (~line 3997):
- Loading state: "Querying spatial data..." with map icon
- On output: push `mapData` to `useMapStore.setSpatialPayload()`, render summary card (feature count, source, query time)
- For SLR: call `useMapStore.toggleLayer(layerId)` + `showMap()`

---

## Files Summary

**New (3):**
| File | Purpose |
|------|---------|
| `src/lib/arcgis-query.ts` | Two-stage LLM routing, endpoint registry with field schemas, geocoder, ArcGIS fetch, WHERE validation, GeoJSON truncation |
| `src/app/api/spatial-query/route.ts` | Standalone test API route (full pipeline with debug output) |
| `src/app/spatial-test/page.tsx` | Test page with debug panel + map for pipeline validation |

**Modified (3):**
| File | Change |
|------|--------|
| `src/lib/tools.ts` | Add `spatialQuery` tool to `healthcareTools` |
| `src/app/api/chat/route.ts` | Spatial system prompt + strip mapData from context |
| `src/components/chat-interface.tsx` | `case "tool-spatialQuery"` rendering + map store wiring |

## Sequencing

```
Step 1 (arcgis-query.ts)         ← build: endpoint registry, two-stage routing, geocoder, fetch, validation
Step 2 (api/spatial-query)       ← standalone API with debug output
Step 3 (spatial-test page)       ← manual validation with 7 test queries
─── GATE: all test queries pass, WHERE validation catches hallucinations ───
Step 4a (tools.ts)               ← wire into chat tools
Step 4b (route.ts)               ← system prompt + context stripping
Step 4c (chat-interface.tsx)     ← render + map store push
```

## Verification

1. **Test page:** `/spatial-test` — run all 7 sample queries, verify map renders, check debug panel for correct routing/parsing
2. **Validation:** Intentionally test ambiguous queries ("environmental risks") — verify multi-layer fallback
3. **Chat integration:** Type "Show me flood zones near downtown" in main chat → map slides in with orange features
4. **SLR:** Type "Show me 6ft sea level rise" → SLR layer toggles on
5. **Cost:** Confirm gpt-5.4-mini is called (not gpt-5.1) for spatial parsing via server logs
6. **Field validation:** Test that hallucinated WHERE clause fields are caught and fall back to `1=1`
