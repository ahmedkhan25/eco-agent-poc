# EcoHeart Map Plugin — Implementation Plan

> **Date:** April 6, 2026
> **Author:** Ahmed + Claude
> **Status:** Ready for implementation
> **Codebase:** eco-agent-poc (Next.js 15, React 19, Tailwind v4)

---

## Architecture Summary

The map plugin adds spatial intelligence to EcoHeart through three integration points:

1. **New AI tool** (`arcgis_query`) — the agent queries public ArcGIS REST endpoints and returns GeoJSON + text summary
2. **New UI layer** — a Leaflet map component that renders spatial results in a split-view layout alongside chat
3. **New standalone page** — a Map Explorer (`/map-explorer`) for browsing GIS layers without the agent

All target data endpoints (FEMA, NOAA, Thurston County) are **public and require zero API keys**. The basemap uses CARTO Positron (free, no auth). No backend proxy needed for Phase 1.

---

## Phase 1: Foundation (Map Container + Layer Registry)

### 1A. Install dependencies

```bash
npm install leaflet esri-leaflet
npm install -D @types/leaflet
```

Create type stub for esri-leaflet since `@types/esri-leaflet` may be incomplete:

**New file: `src/types/esri-leaflet.d.ts`**
```typescript
declare module "esri-leaflet" {
  import * as L from "leaflet";
  export function featureLayer(options: any): L.Layer;
  export function dynamicMapLayer(options: any): L.Layer;
  export function tiledMapLayer(options: any): L.Layer;
}
```

### 1B. Layer catalog registry

**New file: `src/lib/map-layers.ts`**

This is the single source of truth for all available GIS layers. Each entry defines how to render the layer (esri method, URL, styling) and metadata for the UI (name, category, description).

```typescript
export interface MapLayer {
  id: string;
  name: string;
  category: "climate" | "water" | "infrastructure" | "boundaries" | "realtime";
  type: "dynamic" | "tiled" | "feature" | "wms" | "geojson";
  url: string;
  layers?: number[];           // for dynamicMapLayer sublayer selection
  style?: L.PathOptions;       // for feature/geojson layers
  opacity?: number;
  description: string;
  source: string;
  defaultVisible?: boolean;
  caveat?: string;             // e.g. "City on-prem server (may be unavailable)"
}
```

**MVP layer stack (10 layers):**

| ID | Name | Type | Source |
|----|------|------|--------|
| `fema-flood` | FEMA Flood Zones | dynamic (layer 28) | hazards.fema.gov |
| `slr-1ft` | Sea Level Rise 1ft | tiled | coast.noaa.gov |
| `slr-3ft` | Sea Level Rise 3ft | tiled | coast.noaa.gov |
| `slr-6ft` | Sea Level Rise 6ft | tiled | coast.noaa.gov |
| `slr-10ft` | Sea Level Rise 10ft | tiled | coast.noaa.gov |
| `fema-risk` | FEMA National Risk Index | dynamic | hazards.fema.gov |
| `wetlands` | Thurston Wetlands | feature | map.co.thurston.wa.us |
| `wetland-buffers` | Wetland Buffers (300ft) | feature | map.co.thurston.wa.us |
| `aquifer` | Critical Aquifer Recharge | feature | map.co.thurston.wa.us |
| `streams` | Thurston Streams | feature | map.co.thurston.wa.us |

Layer styling follows the UI spec palette — flood zones blue, SLR teal, wetlands green, aquifer red/amber, agent results always EcoHeart orange (`#E8761B`).

### 1C. Map container component

**New file: `src/components/map/map-container.tsx`**

Core Leaflet wrapper using the vanilla Leaflet + dynamic import pattern (not react-leaflet). This is critical for Next.js 15 SSR compatibility.

**Architecture decisions:**
- Use `useEffect` + dynamic `import("leaflet")` — Leaflet requires `window`/`document` at import time
- Use `useRef` for the map instance — avoids React re-render issues with imperative Leaflet API
- Expose map instance via `useImperativeHandle` so parent components can add/remove layers
- CARTO Positron basemap (free, professional, no API key)
- Default center: `[47.0379, -122.9007]` (downtown Olympia), zoom 12

**Props interface:**
```typescript
interface MapContainerProps {
  geojsonData?: GeoJSON.FeatureCollection;  // from agent spatial results
  activeLayers?: string[];                   // layer IDs from registry
  onFeatureClick?: (feature: GeoJSON.Feature, layerName: string) => void;
  className?: string;
}
```

**Dynamic wrapper** — `src/components/map/index.tsx` uses `next/dynamic` with `ssr: false` and a loading skeleton matching the design system (cream background, subtle dot grid pattern from the mockup).

**Leaflet CSS** — import `leaflet/dist/leaflet.css` dynamically inside `useEffect`, plus override Leaflet's default popup/control styles to match the EcoHeart design system (cream backgrounds, Manrope/Inter fonts, no hard borders, Natural Bloom shadows).

---

## Phase 2: Split View Layout (Chat + Map)

### 2A. Split view wrapper

**New file: `src/components/map/split-view.tsx`**

This component wraps the existing `ChatInterface` and the new `MapContainer` in a resizable two-panel layout.

**Layout logic:**
- **No spatial data** → chat at 100% width (current behavior, map not loaded)
- **Spatial data arrives** → animate to 45% chat / 55% map split
- **User closes map** → animate back to 100% chat

**Responsive behavior:**
- `>= 900px` — side-by-side panels with 4px draggable resize handle
- `640px – 899px` — vertical stack (chat top, map bottom at 50vh)
- `< 640px` — map becomes a slide-up drawer (70vh) with drag-to-dismiss

**Animation spec (from UI spec):**
- Chat compresses: 300ms ease-out
- Map slides in from right: 300ms ease-out, 50ms delay
- GeoJSON features fade in: 200ms after map loads
- Close: map slides right 200ms ease-in, chat expands 200ms ease-in

Use `framer-motion` (already installed) for the layout animations. The `layout` prop on `motion.div` handles the panel resizing smoothly.

**State management:** Create a lightweight Zustand store (`src/lib/stores/use-map-store.ts`) to manage:
- `isMapVisible: boolean`
- `activeLayerIds: string[]`
- `spatialPayload: FeatureCollection | null` (from agent response)
- `selectedFeature: Feature | null` (from map click)
- `slrScenario: number` (1–10 for SLR slider)

### 2B. Integrate split view into page.tsx

**Modified file: `src/app/page.tsx`**

Replace the direct `<ChatInterface>` render with `<SplitView>` which internally renders `<ChatInterface>` and conditionally renders `<MapContainer>`.

The key detection logic: when `ChatInterface` receives a message containing a `spatial` key in the tool result, it calls `useMapStore.getState().setSpatialPayload(data)` which triggers the split view transition.

### 2C. Detect spatial payload in chat-interface.tsx

**Modified file: `src/components/chat-interface.tsx`**

Add a detection hook that watches for tool results containing spatial data. When the `arcgis_query` tool returns, the response includes a structured `spatial` object. The chat interface:

1. Extracts the `spatial` payload from the tool result
2. Pushes it to the map store
3. The split view component reacts to the store change and slides in the map

**Location in the code:** This goes near the existing tool result rendering logic (where charts/CSVs are already detected and rendered). Follow the same pattern — the spatial payload is just another renderable tool output type.

---

## Phase 3: Map Interactivity

### 3A. Feature popup component

**New file: `src/components/map/feature-popup.tsx`**

Styled as an EcoHeart card (matching the design system):
- White background, 8px border-radius, Natural Bloom shadow
- Layer name in muted small text at top
- Key-value attribute pairs from GeoJSON properties
- Two action buttons at bottom: "Ask EcoHeart" (primary) and "Copy" (secondary)
- Max-width 300px

**"Ask EcoHeart" flow:**
1. Clicking constructs a contextual query from feature attributes (e.g., "What does the Sea Level Rise Response Plan say about areas in flood zone AE near downtown Olympia?")
2. Closes the map explorer (if in Mode C) or keeps split view (if in Mode B)
3. Pre-fills the chat input with the query
4. This bridges spatial exploration → document-grounded AI analysis

### 3B. Layer control panel

**New file: `src/components/map/layer-control.tsx`**

Renders the layer catalog from `map-layers.ts` grouped by category. Each layer has:
- Checkbox toggle (on/off)
- Info tooltip icon — shows source, endpoint URL, last update
- Glassmorphism styling (surface at 70% opacity + 24px backdrop-blur)

**Position:**
- Mode B (split view): bottom-right of map panel, floating over the map
- Mode C (explorer): left sidebar panel

### 3C. SLR scenario slider

**New file: `src/components/map/slr-slider.tsx`**

Appears when any Sea Level Rise layer is checked. Dragging the slider swaps the tiled map layer between `slr_1ft` through `slr_10ft` NOAA endpoints in real time.

**Slider styling (from design system):**
- Track: `outline-variant` at 20% opacity
- Thumb: `primary` (#012d1d) solid circle with 4px `surface` stroke
- Labels at each end: "1ft" and "10ft"
- Current value displayed above thumb

This is the highest-impact demo feature — visually showing how Olympia's waterfront changes at each sea level increment.

---

## Phase 4: Agent Integration (AI Tool)

### 4A. Spatial tool definition

**New file: `src/lib/spatial-tools.ts`**

Defines the `arcgis_query` tool following the existing `healthcareTools` pattern in `tools.ts`:

```typescript
arcgis_query: tool({
  description: "Query ArcGIS Feature Services for geospatial data about Olympia. Use when the user asks about locations, flood zones, sea level rise, wetlands, infrastructure, zoning, or any spatial/geographic question. Returns GeoJSON features with attributes.",
  inputSchema: z.object({
    service_url: z.string().describe("The ArcGIS REST endpoint URL"),
    where_clause: z.string().describe("SQL WHERE clause for filtering features"),
    geometry: z.object({
      xmin: z.number(),
      ymin: z.number(),
      xmax: z.number(),
      ymax: z.number(),
    }).optional().describe("Bounding box for spatial filter"),
    out_fields: z.string().default("*").describe("Comma-separated attribute fields to return"),
    max_features: z.number().default(100).describe("Maximum features to return"),
  }),
  execute: async ({ service_url, where_clause, geometry, out_fields, max_features }) => {
    // Direct fetch to public ArcGIS REST endpoint
    // Returns GeoJSON FeatureCollection
    // Includes metadata (source, query, bbox, feature_count)
    // Includes style object for map rendering
  }
})
```

**GeoJSON truncation strategy (from UI spec open question #5):**
- If query returns > 200 features, send full GeoJSON to the map but only send a **statistical summary** to the LLM (feature count, attribute distributions, bounding box)
- The map shows everything; the AI summarizes it
- This prevents blowing the context window with massive GeoJSON payloads

### 4B. Register tool in route.ts

**Modified file: `src/app/api/chat/route.ts`**

- Import `spatialTools` from `spatial-tools.ts`
- Spread into the tools object alongside existing `healthcareTools`
- Add a system prompt section that tells GPT about available spatial layers and when to use `arcgis_query`

**System prompt addition:**
```
You have access to geospatial data for Olympia, WA through public ArcGIS REST services. 
When users ask about locations, flood risks, sea level rise, wetlands, or spatial analysis, 
use the arcgis_query tool. Available data sources include:
- FEMA NFHL (flood zones): hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer
- NOAA Sea Level Rise: coast.noaa.gov/arcgis/rest/services/dc_slr/
- Thurston County Wetlands, Streams, Aquifer Recharge: map.co.thurston.wa.us
Return both a text summary and the spatial data for map visualization.
```

### 4C. Spatial response rendering in chat

**Modified file: `src/components/chat-interface.tsx`**

When a tool result from `arcgis_query` is received:
1. Parse the spatial payload (GeoJSON + metadata + style)
2. Render the text summary in the chat panel (as a normal message)
3. Render source citations below the text (matching existing citation pattern)
4. Push spatial data to the map store → triggers split view
5. Add a small "View on map" chip in the chat message that scrolls/zooms the map to the relevant bbox

Follow the exact same rendering pattern used for `createChart` tool results — the spatial result is just another tool output type rendered inline.

---

## Phase 5: Map Explorer (Standalone Page)

### 5A. Map explorer page

**New file: `src/app/map-explorer/page.tsx`**

Full-width map canvas with:
- Layer catalog sidebar (left panel, collapsible)
- Feature inspector panel (bottom or right, shows attributes of clicked feature)
- "Ask EcoHeart about this" button that bridges to chat

This page uses the same `MapContainer` component but in full-screen mode with different surrounding chrome.

### 5B. Sidebar navigation update

**Modified file: `src/components/sidebar.tsx`**

Add a new navigation item between Documents (description icon) and Settings:
- Icon: `Map` from lucide-react
- Tooltip: "Map Explorer"
- Links to `/map-explorer`
- Active state: same orange pill treatment as other icons

Add to both the desktop dock layout and the mobile drawer.

### 5C. Homepage capability card

**Modified file: `src/app/page.tsx`**

Add a 7th capability card to the grid:
- Icon: Map icon
- Title: "Spatial Explorer"
- Subtitle: "Flood zones, sea level rise maps & environmental layers"
- Click action: navigates to `/map-explorer`

---

## File Change Summary

### New Files (10)

| File | Phase | Purpose |
|------|-------|---------|
| `src/types/esri-leaflet.d.ts` | 1 | Type stubs for esri-leaflet |
| `src/lib/map-layers.ts` | 1 | Layer catalog registry (URLs, styles, categories) |
| `src/components/map/map-container.tsx` | 1 | Leaflet map wrapper with Olympia defaults |
| `src/components/map/index.tsx` | 1 | Dynamic import wrapper (SSR: false) |
| `src/components/map/split-view.tsx` | 2 | Chat + Map resizable layout |
| `src/lib/stores/use-map-store.ts` | 2 | Zustand store for map state |
| `src/components/map/feature-popup.tsx` | 3 | Styled popup for clicked features |
| `src/components/map/layer-control.tsx` | 3 | Layer catalog UI with checkboxes |
| `src/components/map/slr-slider.tsx` | 3 | Sea level rise scenario slider |
| `src/lib/spatial-tools.ts` | 4 | arcgis_query tool definition |
| `src/app/map-explorer/page.tsx` | 5 | Standalone map explorer route |

### Modified Files (5)

| File | Phase | Change |
|------|-------|--------|
| `package.json` | 1 | Add leaflet, esri-leaflet, @types/leaflet |
| `src/app/page.tsx` | 2, 5 | Wrap chat in SplitView, add capability card |
| `src/components/chat-interface.tsx` | 4 | Detect spatial payload, trigger map |
| `src/app/api/chat/route.ts` | 4 | Register spatial tools, add spatial system prompt |
| `src/components/sidebar.tsx` | 5 | Add Map Explorer icon |

---

## Implementation Order

The phases are designed so each one produces a demoable result:

| Phase | What you can demo after | Effort |
|-------|------------------------|--------|
| **Phase 1** | Leaflet map renders in isolation with FEMA + NOAA layers visible | 4–5 hrs |
| **Phase 2** | Map slides in next to chat when triggered (hardcoded trigger for testing) | 4–5 hrs |
| **Phase 3** | Click features, see popups, toggle layers, drag SLR slider | 5–7 hrs |
| **Phase 4** | Ask the AI "show me flood zones downtown" and the map appears with results | 6–8 hrs |
| **Phase 5** | Browse layers independently from sidebar, bridge back to chat | 4–5 hrs |

**Total: ~25–30 hrs for full POC**

Phase 1–2 alone (~9 hrs) gets you a working split view with real FEMA/NOAA data rendering — enough for a compelling demo.

---

## Design System Compliance Checklist

Every map component must follow the Earth's Ledger design system:

- [ ] **No 1px borders** — use background color shifts and tonal transitions
- [ ] **Natural Bloom shadows** — `0px 12px 32px rgba(28, 28, 25, 0.06)`
- [ ] **Glassmorphism** on map overlays — surface at 70% opacity + 24px backdrop-blur
- [ ] **Softened geometry** — 2rem (`lg`) and 1.5rem (`md`) corner radii
- [ ] **Text color** — `#1c1c19` (on-surface), never pure black
- [ ] **Font stack** — Manrope for headlines, Inter for body
- [ ] **Orange accent** — `#E8761B` only for critical insights and agent-generated features
- [ ] **Override Leaflet defaults** — popups, controls, attribution all restyled
- [ ] **Loading state** — cream background with subtle dot-grid pattern (from mockup)

---

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Leaflet CSS conflicts with Tailwind v4 | Broken map controls | Scope Leaflet CSS overrides to `.leaflet-container` class; import CSS only inside map component |
| Large GeoJSON payloads crash LLM context | Agent errors on spatial queries | Truncation strategy: full data to map, summary stats to LLM (Phase 4A) |
| Thurston County servers down | Empty layers in demo | Graceful fallback: show layer as "unavailable" with retry button; FEMA/NOAA are highly available |
| Bundle size increase (~150KB for Leaflet) | Slower initial load | `next/dynamic` with `ssr: false` — map code only loads when needed |
| SLR slider swapping tiles causes flicker | Janky demo | Preload adjacent scenario tiles, crossfade with opacity transition |
| esri-leaflet types incomplete | TypeScript errors | Custom `esri-leaflet.d.ts` stub (Phase 1A) |

---

## Open Decisions

1. **Leaflet vs MapLibre GL?** — Plan assumes Leaflet for Phase 1 (simpler API, mature esri-leaflet plugin). If we hit performance issues with large feature sets, MapLibre swap is straightforward since the layer registry abstracts the rendering engine.

2. **Map state persistence?** — Should the map remember which layers were active across sessions? For POC, no — reset on page load. For production, store in Supabase user preferences.

3. **Server-side proxy?** — All Phase 1 endpoints are public. If we later add authenticated ESRI services (post-Startup Program), we'll need an `/api/map-proxy` route. Not needed now.
