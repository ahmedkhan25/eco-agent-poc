# EcoHeart GIS Map — Architecture Deep Dive

> **Date:** April 6, 2026
> **Status:** Phase 1+2 shipped, Phases 3-5 planned
> **Key files:** `src/components/map/`, `src/lib/map-layers.ts`, `src/lib/stores/use-map-store.ts`

---

## 1. How the Map Loads

The map never touches the server. Everything is client-side.

### Boot sequence (what happens when you open `/map-explorer`)

```
Browser loads page.tsx
        │
        ▼
next/dynamic imports map-container.tsx with ssr: false
        │  (this is critical — Leaflet crashes if imported during SSR
        │   because it accesses `window` and `document` at import time)
        │
        ▼
useEffect fires inside MapContainer
        │
        ├─ await import("leaflet")          ← dynamic import, ~42KB gzipped
        ├─ await import("leaflet/dist/leaflet.css")  ← injected into DOM
        │
        ▼
L.map(containerRef, { center: OLYMPIA_CENTER, zoom: 12 })
        │
        ▼
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/...")
        │
        ▼  basemap tile requests go directly from browser → CARTO CDN
        │  (no backend, no proxy, no API key)
        │
        ▼
Map is ready. No layers are active yet.
User sees a clean Olympia basemap.
```

**Why vanilla Leaflet instead of react-leaflet?** Both Leaflet and esri-leaflet use an imperative API (`layer.addTo(map)`, `map.removeLayer(layer)`). Wrapping this in react-leaflet's declarative component model creates friction — especially for dynamic layer add/remove and the esri-leaflet plugin. Vanilla Leaflet inside `useEffect` is the cleanest pattern for Next.js 15.

---

## 2. How Layers Are Registered

All available layers are defined in a single registry file:

**`src/lib/map-layers.ts`**

```typescript
export interface MapLayerDef {
  id: string;              // unique key, e.g. "fema-flood"
  name: string;            // display name, e.g. "FEMA Flood Zones"
  category: LayerCategory; // "climate" | "water" | "infrastructure" | ...
  type: LayerType;         // determines which Leaflet method to use
  url: string;             // the ArcGIS REST or WMS endpoint
  layers?: number[];       // sublayer indices for dynamic/wms layers
  style?: PathOptions;     // fill/stroke for vector layers
  opacity?: number;        // for raster layers
  description: string;     // shown in the info tooltip
  source: string;          // data provenance
}
```

The `type` field is the dispatch key. It tells the layer factory which Leaflet/esri-leaflet class to instantiate:

| `type` value | Leaflet class | What it does | Example |
|---|---|---|---|
| `"dynamic"` | `esri.dynamicMapLayer()` | Server renders a PNG image for the current bbox + zoom, compositing selected sublayers. Browser receives a single image per pan/zoom. | FEMA NFHL (layer 28) |
| `"tiled"` | `esri.tiledMapLayer()` | Pre-cached raster tiles. Fast because tiles are pre-rendered on the server. No query capability. | NOAA SLR 1ft/3ft/6ft/10ft |
| `"feature"` | `esri.featureLayer()` | Fetches individual GeoJSON vector features from a FeatureServer. Browser renders them as SVG/Canvas paths. Supports click events and per-feature styling. | Thurston Wetlands, Streams, Aquifer |
| `"wms"` | `L.tileLayer.wms()` | Standard OGC WMS — requests PNG tiles from a WMS endpoint. Works with non-ArcGIS servers too. | National Wetlands Inventory |
| `"geojson"` | `L.geoJSON()` | Renders a raw GeoJSON FeatureCollection passed directly (not fetched from a URL). Used for agent-generated spatial results. | Agent query results |

**Adding a new layer** means adding one object to the `MAP_LAYERS` array. No other code changes required — the layer factory, UI controls, and toggle logic all read from this registry.

---

## 3. How Layers Get Toggled On/Off

This is a three-part reactive chain: **UI → Store → Map**.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  LayerControl    │     │  useMapStore     │     │  MapContainer       │
│  (layer-control) │────▶│  (Zustand)       │────▶│  (map-container)    │
│                  │     │                  │     │                     │
│  User clicks     │     │  toggleLayer(id) │     │  syncLayers()       │
│  toggle button   │     │  updates         │     │  diffs activeIds    │
│                  │     │  activeLayerIds  │     │  vs layerRefs map   │
│                  │     │  array           │     │  adds/removes from  │
│                  │     │                  │     │  Leaflet map        │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
```

### Step by step:

1. **User clicks toggle** in `layer-control.tsx` → calls `toggleLayer("fema-flood")`

2. **Zustand store** updates `activeLayerIds`:
   ```typescript
   // If "fema-flood" was not active → add it
   activeLayerIds: [...prev, "fema-flood"]
   // If it was active → remove it
   activeLayerIds: prev.filter(id => id !== "fema-flood")
   ```

3. **MapContainer** subscribes to `activeLayerIds` via `useMapStore()`. When it changes, the `syncLayers` callback reference changes (it has `activeLayerIds` in its dependency array), which triggers the `useEffect` that calls `syncLayers()`.

4. **`syncLayers()`** does a diff:
   - **Remove**: iterates `layerRefs` (a `Map<string, Layer>` of currently-rendered Leaflet layers). If an ID is in `layerRefs` but NOT in `activeLayerIds` → `map.removeLayer(layer)` and delete from refs.
   - **Add**: iterates `activeLayerIds`. If an ID is NOT in `layerRefs` → look up its `MapLayerDef` from the registry, call `createLayer()` to instantiate the right Leaflet class, call `.addTo(map)`, and store the ref.

5. **`createLayer()`** is a factory function (bottom of `map-container.tsx`) that switches on `def.type`:
   ```
   "dynamic" → esri.dynamicMapLayer({ url, layers, opacity })
   "tiled"   → esri.tiledMapLayer({ url, opacity })
   "feature" → esri.featureLayer({ url, style, onEachFeature })
   "wms"     → L.tileLayer.wms(url, { layers, format, transparent })
   ```

6. **Data flows directly from browser to government servers.** When esri-leaflet adds a `dynamicMapLayer`, it sends requests like:
   ```
   GET https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/export
       ?bbox=-122.95,47.01,-122.85,47.06
       &size=800,600
       &layers=show:28
       &format=png32
       &transparent=true
       &f=image
   ```
   The browser gets back a PNG overlay image. No EcoHeart backend involved.

   For `featureLayer`, it sends:
   ```
   GET https://map.co.thurston.wa.us/.../Thurston_Wetlands/FeatureServer/0/query
       ?where=1=1
       &geometry={"xmin":-122.95,...}
       &geometryType=esriGeometryEnvelope
       &outFields=*
       &f=geojson
   ```
   The browser gets back GeoJSON and renders it as SVG paths.

---

## 4. How the SLR Slider Works

The Sea Level Rise slider is a special control that swaps between four tiled map layers:

```
SLR Slider value:  1ft ──── 3ft ──── 6ft ──── 10ft
                    │        │        │         │
Layer ID:        slr-1ft  slr-3ft  slr-6ft  slr-10ft
                    │        │        │         │
URL:             coast.noaa.gov/arcgis/rest/services/dc_slr/slr_Xft/MapServer
```

When the slider changes:
1. `setSlrScenario(newFeet)` updates the store
2. `handleSlrChange()` in `layer-control.tsx`:
   - Deactivates all SLR layers that don't match the new value
   - Activates the matching SLR layer
3. This triggers the normal `syncLayers` diff — old SLR tile layer removed, new one added
4. NOAA's pre-cached tiles load almost instantly since they're raster tiles

The slider only appears in the UI when at least one SLR layer is active (checked via `activeLayerIds.some(id => SLR_LAYER_IDS.includes(id))`).

---

## 5. How Feature Click → Popup Works

Only **feature** and **geojson** type layers support click interaction (raster layers like dynamic/tiled/wms are just images — there's nothing to click).

```
User clicks wetland polygon on map
        │
        ▼
esri.featureLayer's onEachFeature callback fires
        │
        ├─ feature = { type: "Feature", properties: { NWI_Code: "L1OW", ... }, geometry: {...} }
        ├─ layerName = "Thurston Wetlands"
        │
        ▼
useMapStore.setSelectedFeature(feature, layerName)
        │
        ▼
FeaturePopup component re-renders (watches selectedFeature from store)
        │
        ├─ Extracts properties from feature.properties
        ├─ Filters out internal fields (OBJECTID, Shape, FID)
        ├─ Formats keys (SCREAMING_CASE → Title Case)
        ├─ Renders attribute table
        ├─ Shows "Ask EcoHeart" button
        └─ Shows "Copy" button
```

**"Ask EcoHeart" bridge flow:**
1. User clicks "Ask EcoHeart" on a wetland feature
2. `feature-popup.tsx` builds a contextual query string from the feature attributes
3. On the `/map-explorer` page: navigates to `/?q=<query>` (chat page with pre-filled question)
4. On the split-view (chat page): calls `onAskQuery(query)` prop which could pre-fill the chat input

---

## 6. How Agent Spatial Results Render (Split View)

This is the pipeline for when the AI agent returns spatial data from a chat query. **Not yet wired to the AI tool** (Phase 4 work), but the rendering pipeline is fully built.

```
User asks: "Show me flood zones near downtown Olympia"
        │
        ▼
/api/chat/route.ts → GPT calls arcgis_query tool (future Phase 4)
        │
        ▼
Tool fetches GeoJSON from FEMA endpoint, returns:
{
  spatial: { type: "FeatureCollection", features: [...] },
  spatialMeta: { source: "FEMA NFHL", featureCount: 47, bbox: [...] },
  text: "I found 47 properties in flood zone AE..."
}
        │
        ▼
chat-interface.tsx detects spatial key in tool result (future Phase 4)
        │
        ▼
useMapStore.setSpatialPayload(geojson, meta)
        │
        ├─ sets spatialPayload = geojson
        ├─ sets spatialMeta = meta
        └─ sets isMapVisible = true   ← this triggers the split view
        │
        ▼
split-view.tsx reacts to isMapVisible:
        ├─ Chat panel animates from 100% → 45% width (300ms ease-out)
        └─ Map panel slides in from right at 55% width
        │
        ▼
map-container.tsx reacts to spatialPayload change:
        ├─ Removes previous agent layer (if any)
        ├─ Creates L.geoJSON(spatialPayload) with orange styling (#E8761B)
        ├─ Adds click handlers to each feature
        ├─ Calls map.fitBounds() to auto-zoom to the result bbox
        └─ Agent results are ALWAYS orange to distinguish from reference layers
```

**Key design decision:** Agent results are rendered as a separate GeoJSON layer (`agentLayerRef`) that sits on top of any reference layers. It uses EcoHeart orange (`#E8761B`) so users instantly see what the AI found vs. what background layers are showing.

---

## 7. State Management Architecture

All map state lives in a single Zustand store (`use-map-store.ts`). No props drilling, no context providers. Any component can read or write map state.

```
┌─────────────────────────────────────────────────────┐
│                   useMapStore                        │
│                                                     │
│  isMapVisible ──────── controls split-view show/hide │
│  activeLayerIds ────── which registry layers are on  │
│  spatialPayload ────── GeoJSON from agent results    │
│  spatialMeta ───────── metadata about agent results  │
│  selectedFeature ───── currently clicked feature     │
│  selectedFeatureLayer  which layer it belongs to     │
│  slrScenario ───────── current SLR feet (1/3/6/10)  │
│                                                     │
│  Actions:                                           │
│  showMap / hideMap / toggleMap                       │
│  toggleLayer(id) / setActiveLayerIds([...])         │
│  setSpatialPayload(geojson, meta)                   │
│  setSelectedFeature(feature, layerName)             │
│  setSlrScenario(feet)                               │
│  reset()                                            │
└─────────────────────────────────────────────────────┘
        │
   consumed by:
        │
        ├── map-container.tsx  (reads activeLayerIds, spatialPayload)
        ├── layer-control.tsx  (reads/writes activeLayerIds, slrScenario)
        ├── feature-popup.tsx  (reads selectedFeature, writes via setSelectedFeature)
        ├── split-view.tsx     (reads isMapVisible, writes via hideMap)
        └── page.tsx / map-explorer/page.tsx (top-level orchestration)
```

**Why Zustand instead of React context or props?**
- The map store is accessed from deeply nested components (popup inside map inside split-view) AND from outside the component tree (the chat interface needs to push spatial data)
- Zustand allows `useMapStore.getState().setSpatialPayload(data)` from anywhere — including inside non-React code (like a Leaflet click callback or an API response handler)
- No provider wrapper needed in the component tree

---

## 8. File Map

```
src/
├── lib/
│   ├── map-layers.ts              ← Layer registry (URLs, types, styles)
│   └── stores/
│       └── use-map-store.ts       ← Zustand store (all map state)
│
├── components/map/
│   ├── index.tsx                  ← next/dynamic wrapper (ssr: false)
│   ├── map-container.tsx          ← Core Leaflet map + layer sync + agent overlay
│   ├── split-view.tsx             ← Chat + Map resizable layout
│   ├── layer-control.tsx          ← Toggle switches, categories, SLR slider
│   └── feature-popup.tsx          ← Click-to-inspect attribute card
│
├── app/
│   ├── page.tsx                   ← Chat page, wraps ChatInterface in SplitView
│   └── map-explorer/page.tsx      ← Standalone full-width map page
│
└── types/
    └── esri-leaflet.d.ts          ← Type stubs for esri-leaflet
```

---

## 9. Data Flow Summary — No Backend Involved

This is a critical architectural point: **the map is 100% client-side for layer rendering.**

```
                    ┌─────────────────────────────┐
                    │       BROWSER                │
                    │                             │
                    │  Leaflet map ───────────────┼───→ CARTO CDN (basemap tiles)
                    │       │                     │
                    │       ├── esri.dynamic ─────┼───→ hazards.fema.gov (FEMA NFHL)
                    │       ├── esri.tiled ───────┼───→ coast.noaa.gov (NOAA SLR)
                    │       ├── esri.feature ─────┼───→ map.co.thurston.wa.us (Wetlands)
                    │       └── L.tileLayer.wms ──┼───→ fwspublicservices.wim.usgs.gov (NWI)
                    │                             │
                    │  Zero requests to            │
                    │  EcoHeart backend            │
                    │  for layer rendering         │
                    └─────────────────────────────┘
```

The only time the EcoHeart backend gets involved is:
1. **Agent spatial queries** (Phase 4, not yet built) — the backend calls ArcGIS REST APIs, processes the GeoJSON, and returns it through the chat streaming pipeline
2. **"Ask EcoHeart" from a feature popup** — this triggers a regular chat query through the existing RAG pipeline

---

## 10. Future: AI-Driven Spatial Queries in the Map View

This section outlines how to add generative UI and AI-driven queries **directly in the map view**, without going through the existing RAG document pipeline. This is Phase 4+ work.

### 10a. The `arcgis_query` Tool (backend, in route.ts)

The AI agent gets a new tool that can query any public ArcGIS REST endpoint:

```
User: "How many properties are in FEMA flood zone AE near downtown?"
                    │
                    ▼
GPT decides to call arcgis_query tool with:
{
  service_url: "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28",
  where_clause: "FLD_ZONE = 'AE'",
  geometry: { xmin: -122.91, ymin: 47.03, xmax: -122.89, ymax: 47.05 },
  out_fields: "FLD_ZONE,ZONE_SUBTY,BFE_REVERT",
  max_features: 200
}
                    │
                    ▼
Tool execute() function (server-side, in route.ts):
  1. Builds ArcGIS REST query URL:
     GET .../MapServer/28/query?where=FLD_ZONE='AE'&geometry=...&f=geojson
  2. Fetches GeoJSON from FEMA
  3. If > 200 features: sends full GeoJSON to map, but sends only
     SUMMARY STATS to GPT (count, attribute distributions, bbox)
     to avoid blowing the context window
  4. Returns { spatial: FeatureCollection, spatialMeta: {...}, text: "..." }
                    │
                    ▼
Frontend detects spatial key → pushes to map store → map renders it
```

**The GeoJSON truncation problem:** A spatial query can easily return 500+ features with complex geometries — megabytes of GeoJSON. You can't send all of it to GPT. The solution:

- **Map gets everything** — full GeoJSON FeatureCollection, all geometries rendered
- **GPT gets a summary** — feature count, attribute value distributions, bounding box, a few example features
- The AI writes a natural-language summary; the map shows the spatial proof

### 10b. Generative Map UI — AI Returns Layer Commands

Instead of just returning text, the agent could return **structured map commands** that the frontend interprets:

```typescript
// Agent response includes a "mapActions" array:
{
  text: "Here's the flood risk analysis for the shoreline area...",
  mapActions: [
    { action: "activateLayer", layerId: "fema-flood" },
    { action: "activateLayer", layerId: "slr-3ft" },
    { action: "fitBounds", bounds: [[-122.91, 47.03], [-122.89, 47.05]] },
    { action: "addGeoJSON", data: { ... }, style: { fillColor: "#E8761B" } },
    { action: "showInsight", position: "bottom-right", text: "47 parcels at risk" }
  ]
}
```

The frontend interprets these actions and drives the map programmatically. This is **generative UI** — the AI doesn't just generate text, it generates interface state.

### 10c. Map-Native Chat Panel

A lightweight chat input embedded **directly in the map view** (not the full ChatInterface):

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                    MAP CANVAS                         │
│                                                      │
│                                                      │
│  ┌─────────────────────────────────────┐             │
│  │ AI Insight: 47 parcels in AE zone   │             │
│  │ near shoreline with avg BFE 12ft    │             │
│  └─────────────────────────────────────┘             │
│                                                      │
│  ┌────────────────────────────────────┐              │
│  │ "Now show me sea level rise at 6ft" │ [→]         │
│  └────────────────────────────────────┘              │
│                                                      │
│  ┌──────────────┐                                    │
│  │ LAYER CTRL   │                                    │
│  └──────────────┘                                    │
└──────────────────────────────────────────────────────┘
```

This would use a **separate, lightweight API route** (not the full chat/route.ts) optimized for spatial queries:
- Smaller system prompt (spatial context only, no RAG documents)
- Only the `arcgis_query` tool available
- Faster responses (no document retrieval overhead)
- Responses include `mapActions` for direct map manipulation

### 10d. Direct ArcGIS REST Queries (No AI, Client-Side)

For power users / demo scenarios, allow the map to query ArcGIS endpoints directly without going through the AI:

```typescript
// Client-side spatial query — no backend, no AI
async function queryFeaturesInView(layerDef: MapLayerDef, map: LeafletMap) {
  const bounds = map.getBounds();
  const url = new URL(`${layerDef.url}/query`);
  url.searchParams.set("where", "1=1");
  url.searchParams.set("geometry", JSON.stringify({
    xmin: bounds.getWest(), ymin: bounds.getSouth(),
    xmax: bounds.getEast(), ymax: bounds.getNorth(),
    spatialReference: { wkid: 4326 }
  }));
  url.searchParams.set("geometryType", "esriGeometryEnvelope");
  url.searchParams.set("outFields", "*");
  url.searchParams.set("f", "geojson");
  url.searchParams.set("resultRecordCount", "500");

  const res = await fetch(url);
  const geojson = await res.json();
  return geojson; // FeatureCollection
}
```

This enables features like:
- **"Select features in view"** button per layer
- **Attribute table** showing all features visible in the current map extent
- **Spatial filter** — draw a polygon, query features within it
- **Cross-layer analysis** — "show me wetlands that overlap with flood zone AE" (client-side geometric intersection using Turf.js)

### 10e. Architecture for AI-Driven Map (Future State)

```
┌────────────────────────────────────┐
│           MAP VIEW                  │
│                                    │
│  ┌──────────┐  ┌────────────────┐  │
│  │ Map Chat  │  │ AI Insight     │  │  ← Generative UI: text cards
│  │ Input     │  │ Cards          │  │     rendered ON the map canvas
│  └──────┬───┘  └───────▲────────┘  │
│         │              │           │
│         ▼              │           │
│  /api/map-query ───────┘           │  ← Lightweight spatial-only route
│  (spatial system prompt,            │     (not the full RAG route)
│   arcgis_query tool only)          │
│         │                          │
│         ├──→ FEMA, NOAA, Thurston  │  ← Direct ArcGIS REST queries
│         │    (server-side fetch)   │
│         │                          │
│         ▼                          │
│  Returns:                          │
│  { text, mapActions, spatial }     │  ← Structured response drives
│         │                          │     both UI and map state
│         ▼                          │
│  mapActions interpreter:           │
│  - activateLayer                   │
│  - fitBounds                       │
│  - addGeoJSON                      │
│  - highlightFeatures               │
│  - showInsight                     │
│  - setSlrScenario                  │
└────────────────────────────────────┘
```

### 10f. What This Unlocks

| Capability | How It Works |
|---|---|
| **"Show me flood risk for this area"** | Agent queries FEMA NFHL, returns GeoJSON, map highlights features, AI summarizes risk |
| **"Compare 3ft vs 6ft sea level rise"** | Agent returns two mapActions: show SLR-3ft, then animate slider to SLR-6ft. Side-by-side or animated comparison |
| **"What's the zoning for 123 Main St?"** | Geocode address → point query against zoning layer → popup with result + AI explanation |
| **"Find all wetlands within 500ft of the shoreline"** | Client-side Turf.js buffer + intersection, or server-side geopandas in Daytona sandbox |
| **"Generate a risk report for this neighborhood"** | Spatial queries + RAG document retrieval + PDF generation → downloadable report with embedded map screenshot |
| **"Alert me when tide level exceeds 8ft"** | NOAA real-time tide API → threshold check → push notification (requires Phase 4 real-time infrastructure) |

---

## 11. How to Add a New Layer (Developer Guide)

1. **Find the endpoint.** Browse ArcGIS REST services directories (e.g., `hazards.fema.gov/arcgis/rest/services`). Test it returns data: `?f=json` for metadata, `/query?where=1=1&f=geojson&resultRecordCount=1` for a sample feature.

2. **Add to registry.** Open `src/lib/map-layers.ts`, add a new object to `MAP_LAYERS`:
   ```typescript
   {
     id: "my-new-layer",
     name: "My Layer Name",
     category: "water",        // pick existing or add new category
     type: "feature",          // dynamic | tiled | feature | wms
     url: "https://...",
     style: { color: "#...", fillColor: "#...", fillOpacity: 0.3, weight: 1 },
     description: "What this layer shows.",
     source: "Data provider name",
   }
   ```

3. **Done.** The layer automatically appears in the Layer Controls panel under its category, with a working toggle switch. No other code changes needed.

4. **Optional: add to a new category.** If the layer doesn't fit existing categories, add the category to `LAYER_CATEGORIES` in the same file:
   ```typescript
   export const LAYER_CATEGORIES = {
     ...existing,
     mynewcat: { label: "My Category", icon: "icon-name" },
   };
   ```
