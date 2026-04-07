# EcoHeart Map View — POC UI Specification

> **Author:** Ahmed (Architect & Lead Developer)
> **Date:** April 6, 2026
> **Status:** Draft — for team review
> **Scope:** Phase 1 POC map integration into existing eco-agent-poc

---

## 1. Design Principles

The map view must feel like a **native extension** of the existing EcoHeart UI, not a bolted-on feature. Three rules:

1. **Chat stays primary.** The map is a response artifact (like charts and CSVs already are), not a separate app. Users don't navigate to a "map page" — the map appears when the agent returns spatial data.
2. **Progressive disclosure.** The map starts hidden. It slides in when relevant. It doesn't clutter the interface when the user is asking about budgets or staffing.
3. **Match the existing design language.** Cream background (`#F8F5F0`), dark teal header (`#1B4332` / `#2D6A4F`), orange accent (`#E8761B`), rounded cards with soft shadows, the same icon sidebar pattern.

---

## 2. Current UI Anatomy (from screenshot)

```
┌──────────────────────────────────────────────────────────┐
│  [EcoHeart logo]              HEADER BAR        [About]  │
├────┬─────────────────────────────────────────────────────┤
│    │                                                     │
│ S  │           MAIN CONTENT AREA                         │
│ I  │                                                     │
│ D  │   "City of Olympia AI Researcher"                   │
│ E  │   [About & Indexed Documents]                       │
│ B  │   "Proof of Concept - Not for Production Use"       │
│ A  │                                                     │
│ R  │   ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│    │   │Climate  │ │Climate  │ │Transport│  Capability   │
│ 🔒 │   │Modeling │ │Goals    │ │Plans    │  Cards        │
│ 🏠 │   └─────────┘ └─────────┘ └─────────┘              │
│ 👥 │   ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│ 💬 │   │Budget   │ │Infra    │ │Doc &    │              │
│ 📄 │   │Analysis │ │Plans    │ │Web Srch │              │
│ ⚙️ │   └─────────┘ └─────────┘ └─────────┘              │
│ [A]│                                                     │
│    │   [Partner logos: EcoHeart, Olympia, NIH]            │
│    │                                                     │
│    │   ┌──────────────────────────────────────┐          │
│    │   │  Ask a question...               [→] │          │
│    │   └──────────────────────────────────────┘          │
│    │                                                     │
│    │   "Powered by EcoHeart"                             │
├────┴─────────────────────────────────────────────────────┤
│                                              [LinkedIn]  │
└──────────────────────────────────────────────────────────┘
```

**Key observations:**
- Sidebar is icon-only (collapsed), ~60px wide, with 7 icons + avatar
- Main content area is centered, max-width container
- Header bar is full-width, dark teal with logo left and "About" button right
- Capability cards are 3-column grid with icon + title + subtitle
- Input bar is fixed at bottom with rounded corners
- Color palette: cream background, dark teal header, orange accents, white cards
- Current chat view (not shown in screenshot but exists in codebase) is a standard streaming message list in the same centered container

---

## 3. Map View Integration — Three Modes

The map view operates in three modes depending on context:

### Mode A: No Map (Default — current behavior)
The chat works exactly as it does today. No map component is loaded. This is the state for all non-spatial queries like "What's the 2025 operating budget?" or "Summarize the climate risk assessment."

### Mode B: Split View (Chat + Map)
Triggered when the agent returns spatial data (GeoJSON payload, map layer references, or spatial query results). The main content area splits into two panels.

### Mode C: Map Explorer (Standalone)
Accessed via a new icon in the sidebar. A dedicated map view with layer controls, where users can browse available GIS layers without going through the chat. Think of it as a lightweight GIS viewer powered by EcoHeart's data catalog.

---

## 4. Layout Specification — Mode B (Split View)

This is the primary new UI state. When the agent returns spatial results, the layout transitions from single-column chat to a split view.

```
┌──────────────────────────────────────────────────────────┐
│  [EcoHeart logo]              HEADER BAR        [About]  │
├────┬──────────────────────┬──────────────────────────────┤
│    │                      │                              │
│ S  │   CHAT PANEL (45%)   │     MAP PANEL (55%)          │
│ I  │                      │                              │
│ D  │  [Agent message]     │  ┌────────────────────────┐  │
│ E  │  "There are 47       │  │                        │  │
│ B  │   properties in      │  │    LEAFLET / MAPLIBRE   │  │
│ A  │   flood zone AE      │  │    MAP CANVAS           │  │
│ R  │   near downtown..."  │  │                        │  │
│    │                      │  │   [Flood zone polygons  │  │
│ 🔒 │  [Source citations]  │  │    rendered as colored  │  │
│ 🏠 │                      │  │    overlays]            │  │
│ 👥 │                      │  │                        │  │
│ 💬 │                      │  │                        │  │
│ 📄 │                      │  └────────────────────────┘  │
│ ⚙️ │                      │                              │
│ 🗺️ │                      │  ┌──────────────────────┐    │
│ [A]│                      │  │ LAYER CONTROLS       │    │
│    │                      │  │ ☑ FEMA Flood Zones   │    │
│    │ ┌──────────────────┐ │  │ ☐ Sea Level Rise 3ft │    │
│    │ │ Ask a question [→]│ │  │ ☐ Wetlands           │    │
│    │ └──────────────────┘ │  └──────────────────────┘    │
├────┴──────────────────────┴──────────────────────────────┤
└──────────────────────────────────────────────────────────┘
```

### Panel Sizing
- **Chat panel:** 45% width, minimum 380px
- **Map panel:** 55% width, minimum 480px
- **Divider:** 4px draggable resize handle (like VS Code split panes)
- **Breakpoint:** Below 900px viewport width, stack vertically (chat on top, map below at 50vh)
- **Mobile (<640px):** Map becomes a slide-up drawer from the bottom, 70% viewport height, with a drag handle to dismiss

### Transition Animation
When spatial results arrive:
1. Chat panel smoothly compresses from 100% to 45% width (300ms ease-out)
2. Map panel slides in from the right edge (300ms ease-out, 50ms delay)
3. Map initializes with OpenStreetMap basemap, auto-zooms to Olympia bbox
4. GeoJSON features render with a 200ms fade-in after the map loads
5. A small "✕ Close map" button appears at the top-right corner of the map panel

When the user closes the map:
1. Map panel slides out to the right (200ms ease-in)
2. Chat panel expands back to 100% (200ms ease-in)

---

## 5. Layout Specification — Mode C (Map Explorer)

Accessed via a new **map icon** (🗺️) added to the sidebar, between the documents icon (📄) and settings icon (⚙️).

```
┌──────────────────────────────────────────────────────────┐
│  [EcoHeart logo]              HEADER BAR        [About]  │
├────┬─────────────────────────────────────────────────────┤
│    │                                                     │
│ S  │  ┌─────────────────────────────────────────────┐    │
│ I  │  │                                             │    │
│ D  │  │          FULL-WIDTH MAP CANVAS               │    │
│ E  │  │                                             │    │
│ B  │  │     (Leaflet/MapLibre, Olympia centered)     │    │
│ A  │  │                                             │    │
│ R  │  │                                             │    │
│    │  │                                             │    │
│    │  └─────────────────────────────────────────────┘    │
│    │                                                     │
│    │  ┌──────────┐  ┌────────────────────────────────┐   │
│    │  │ LAYER    │  │ FEATURE INSPECTOR              │   │
│    │  │ CATALOG  │  │                                │   │
│    │  │          │  │ (Click a feature on the map    │   │
│    │  │ Climate  │  │  to see its attributes here)   │   │
│    │  │  ☑ Flood │  │                                │   │
│    │  │  ☐ SLR   │  │  Zone: AE                      │   │
│    │  │  ☐ Storm │  │  BFE: 12ft                     │   │
│    │  │ Environ  │  │  Source: FEMA NFHL              │   │
│    │  │  ☐ Wetl  │  │  Last updated: 2024-03-15      │   │
│    │  │  ☐ Aquif │  │                                │   │
│    │  │ Infra    │  │  [Ask EcoHeart about this →]   │   │
│    │  │  ☐ Roads │  │                                │   │
│    │  └──────────┘  └────────────────────────────────┘   │
├────┴─────────────────────────────────────────────────────┤
└──────────────────────────────────────────────────────────┘
```

### Key Feature: "Ask EcoHeart about this"
When a user clicks a feature on the map and inspects its attributes, there's a button: **"Ask EcoHeart about this →"**. Clicking it:
1. Switches to Mode B (split view)
2. Pre-fills the chat input with a contextual query, e.g.: *"What does the Sea Level Rise Response Plan say about areas in flood zone AE near downtown Olympia?"*
3. This is the bridge between spatial exploration and document-grounded AI analysis — the unique EcoHeart value proposition.

---

## 6. Map Component Specification

### Technology
- **Primary:** Leaflet 1.9+ with `esri-leaflet` plugin for ArcGIS REST integration
- **Alternative:** MapLibre GL JS (swap-in if we need vector tile performance)
- **Basemaps:** OpenStreetMap (Phase 1), ESRI basemaps (Phase 2 after Startup Program)

### Default Map State
- **Center:** `[47.0379, -122.9007]` (downtown Olympia)
- **Zoom:** 12 (city-wide view)
- **Bounds:** `[[-123.1, 46.95], [-122.75, 47.15]]` (Olympia metro bbox)
- **Controls:** Zoom buttons (top-left), scale bar (bottom-left), attribution (bottom-right)

### Layer Rendering

Each data source type maps to a Leaflet layer method:

| Source Type | Leaflet Method | Example |
|-------------|---------------|---------|
| ArcGIS tiled MapServer | `L.esri.tiledMapLayer` | NOAA SLR inundation |
| ArcGIS dynamic MapServer | `L.esri.dynamicMapLayer` | FEMA NFHL, emap_permitting |
| ArcGIS FeatureServer | `L.esri.featureLayer` | Thurston wetlands, parcels |
| WMS endpoint | `L.tileLayer.wms` | NWI wetlands, SSURGO soils |
| GeoJSON (agent-generated) | `L.geoJSON` | Spatial query results, overlays |
| JSON API (real-time) | Custom marker + popup | NOAA tide station data |

### Layer Styling

Apply styling consistent with the EcoHeart palette:

| Layer | Fill Color | Opacity | Border |
|-------|-----------|---------|--------|
| FEMA Flood Zone AE | `#2563EB` (blue) | 0.25 | `#1E40AF` 2px |
| FEMA Flood Zone X | `#93C5FD` (light blue) | 0.15 | `#60A5FA` 1px |
| SLR Inundation | `#0891B2` (teal) | 0.35 | none (raster) |
| Wetlands | `#059669` (green) | 0.3 | `#047857` 1px |
| Aquifer Recharge (Extreme) | `#DC2626` (red) | 0.25 | `#B91C1C` 1.5px |
| Aquifer Recharge (High) | `#F59E0B` (amber) | 0.2 | `#D97706` 1px |
| Stormwater system | `#6B7280` (gray) | 0.4 | `#4B5563` 1.5px |
| Agent query results | `#E8761B` (EcoHeart orange) | 0.35 | `#C45A15` 2px |

The **agent query results** layer (features returned from spatial queries via the chat) always uses the EcoHeart orange to visually distinguish AI-generated selections from background reference layers.

### Feature Popups

When a user clicks a map feature, show a popup styled as an EcoHeart card:

```
┌──────────────────────────────┐
│  FEMA Flood Zone             │  ← layer name (muted, small)
│  ──────────────────────────  │
│  Zone:        AE             │  ← key-value pairs
│  BFE:         12 ft          │     from feature attributes
│  Panel:       53067C0150D    │
│  Source:      FEMA NFHL      │
│  ──────────────────────────  │
│  [🤖 Ask EcoHeart]  [📋 Copy]│  ← action buttons
└──────────────────────────────┘
```

- Background: white
- Border: 1px `#E5E7EB`
- Border-radius: 8px (match existing card style)
- Shadow: `0 2px 8px rgba(0,0,0,0.1)`
- Max-width: 300px
- Font: system font stack matching existing UI (Inter or similar)

---

## 7. Layer Control Panel

The layer control panel appears in Mode B (bottom-right of map panel) and Mode C (left sidebar of map explorer).

### Structure

```
LAYER CONTROLS                              [−] collapse
─────────────────────────────────────────────
🔍 Search layers...

▼ Climate & Hazards
  ☑ FEMA Flood Zones                    [ℹ]
  ☐ Sea Level Rise 1ft                  [ℹ]
  ☐ Sea Level Rise 3ft                  [ℹ]
  ☐ Sea Level Rise 6ft                  [ℹ]
  ☐ Sea Level Rise 10ft                 [ℹ]
  ☐ FEMA National Risk Index            [ℹ]

▼ Water & Environment
  ☐ Thurston Wetlands                    [ℹ]
  ☐ Wetland Buffers (300ft)             [ℹ]
  ☐ Critical Aquifer Recharge           [ℹ]
  ☐ Thurston Streams                     [ℹ]
  ☐ National Wetlands Inventory          [ℹ]

▼ Infrastructure & Utilities
  ☐ Stormwater System*                   [ℹ]
  ☐ Impervious Surfaces*                 [ℹ]
  ☐ Drinking Water Protection*           [ℹ]
  ☐ WSDOT Climate Vulnerability          [ℹ]

▼ Boundaries & Planning
  ☐ City Limits & UGA                    [ℹ]
  ☐ Zoning                               [ℹ]
  ☐ Thurston Parcels                      [ℹ]
  ☐ Neighborhood Sub-areas               [ℹ]

▼ Real-Time
  ☐ NOAA Tide Station (Budd Inlet)       [ℹ]

─────────────────────────────────────────────
* = City on-prem server (may be unavailable)
```

### Info Tooltip [ℹ]
Clicking the info icon shows: source agency, REST endpoint URL, last update date, and data format. This helps the team verify data provenance during demos.

### SLR Slider (Special Control)
When any Sea Level Rise layer is checked, a **scenario slider** appears below the checkboxes:

```
Sea Level Rise Scenario
[1ft]──●───────────────────[10ft]
         ↑ 3ft selected
```

Dragging the slider swaps the tiled map layer between `slr_1ft` through `slr_10ft` endpoints in real time. This is the highest-impact demo feature — visually showing how Olympia's waterfront disappears at each increment.

---

## 8. Agent Integration — New Tool Definition

Add a new tool to `src/lib/tools.ts` for spatial queries:

### Tool: `arcgis_query`

```typescript
{
  name: "arcgis_query",
  description: "Query ArcGIS Feature Services for geospatial data about Olympia. Use this when the user asks about locations, flood zones, sea level rise, wetlands, infrastructure, zoning, or any spatial/geographic question. Returns GeoJSON features with attributes.",
  parameters: {
    service_url: "The ArcGIS REST endpoint URL",
    where_clause: "SQL WHERE clause for filtering (e.g., 'FLD_ZONE = AE')",
    geometry: "Optional bounding box or point for spatial filter",
    out_fields: "Comma-separated list of attribute fields to return",
    max_features: "Maximum number of features to return (default 100)"
  }
}
```

### Agent Response Format (Spatial)

When the agent uses `arcgis_query`, the response includes a structured spatial payload alongside the text:

```json
{
  "text": "I found 47 properties in FEMA flood zone AE near downtown Olympia...",
  "spatial": {
    "type": "FeatureCollection",
    "features": [...],
    "metadata": {
      "source": "FEMA NFHL",
      "endpoint": "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer",
      "query": "FLD_ZONE = 'AE'",
      "feature_count": 47,
      "bbox": [-122.91, 47.03, -122.89, 47.05]
    },
    "style": {
      "fillColor": "#2563EB",
      "fillOpacity": 0.25,
      "color": "#1E40AF",
      "weight": 2
    }
  },
  "citations": [...]
}
```

The frontend detects the `spatial` key in the response and triggers the Mode B split view transition.

---

## 9. Sidebar Update

Add one new icon to the existing sidebar, positioned between 📄 (documents) and ⚙️ (settings):

```
Current sidebar:        Updated sidebar:
  🔒  Auth                🔒  Auth
  🏠  Home                🏠  Home
  👥  Community(?)        👥  Community(?)
  💬  Chat                💬  Chat
  📄  Documents           📄  Documents
  ⚙️  Settings            🗺️  Map Explorer  ← NEW
                           ⚙️  Settings
  [A]  Avatar             [A]  Avatar
```

The map icon uses the same sizing and hover behavior as existing icons. Tooltip on hover: "Map Explorer". Active state: orange left border (matching existing active icon treatment).

---

## 10. Capability Card Addition

Add a new capability card to the home screen grid:

```
┌─────────────────────┐
│  [🗺️]               │
│  Spatial Explorer    │
│  Flood zones, sea   │
│  level rise maps... │
└─────────────────────┘
```

Clicking this card either:
- Opens the Map Explorer (Mode C), or
- Pre-fills the chat with a spatial prompt like: *"Show me the flood zones in downtown Olympia"*

Place it in the grid as a 7th card, creating a new row or replacing the "Doc & Web Search" card position depending on layout priority.

---

## 11. Data Flow Architecture

```
USER INTERACTION                  FRONTEND                    BACKEND / EXTERNAL
─────────────────                ──────────                  ──────────────────

User types:                      chat-interface.tsx
"Show me flood zones             sends to /api/chat
 near downtown"                         │
                                        ▼
                                 route.ts (streaming)
                                 GPT sees arcgis_query tool
                                        │
                                        ▼
                                 Tool execution:
                                 fetch() to FEMA NFHL ──────→ hazards.fema.gov
                                 MapServer REST API           /arcgis/rest/services/
                                        │                     public/NFHL/MapServer
                                        │                     /query?where=...
                                        │                     &f=geojson
                                        ▼
                                 Agent receives GeoJSON
                                 Summarizes attributes
                                 Returns text + spatial payload
                                        │
                                        ▼
                                 chat-interface.tsx
                                 detects spatial key
                                        │
                                 ┌──────┴──────┐
                                 ▼             ▼
                           Chat panel    Map panel
                           renders       initializes Leaflet
                           text +        renders GeoJSON
                           citations     auto-zooms to bbox
```

### Map Panel Direct Layer Loading (Mode C)

In Map Explorer mode, layers load directly from external services without going through the agent:

```
User toggles                     map-explorer.tsx
"FEMA Flood Zones"                      │
checkbox                                ▼
                                 L.esri.dynamicMapLayer({
                                   url: FEMA_NFHL_URL
                                 }).addTo(map)
                                        │
                                        ▼
                                 Browser fetches tiles ──────→ hazards.fema.gov
                                 directly from FEMA             (no backend proxy)
```

This means **no backend load** for layer rendering — the browser talks directly to federal/county REST endpoints. The backend is only involved when the user asks the AI agent a question.

---

## 12. File Changes Required

### New Files

| File | Purpose |
|------|---------|
| `src/components/map/map-container.tsx` | Leaflet map wrapper with Olympia defaults |
| `src/components/map/layer-control.tsx` | Layer catalog with checkboxes and categories |
| `src/components/map/feature-popup.tsx` | Styled popup for clicked features |
| `src/components/map/slr-slider.tsx` | Sea level rise scenario slider |
| `src/components/map/map-explorer.tsx` | Full-page map explorer (Mode C) |
| `src/components/map/split-view.tsx` | Chat + Map split layout wrapper |
| `src/app/map-explorer/page.tsx` | Route for standalone map explorer |
| `src/lib/map-layers.ts` | Layer catalog registry (URLs, styles, categories) |
| `src/lib/spatial-tools.ts` | arcgis_query tool definition + helpers |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/tools.ts` | Add `arcgis_query` tool definition |
| `src/app/api/chat/route.ts` | Handle spatial tool results, include GeoJSON in response |
| `src/components/chat-interface.tsx` | Detect spatial payload, trigger split view |
| `src/components/sidebar.tsx` | Add map explorer icon |
| `src/app/page.tsx` | Add spatial explorer capability card |
| `package.json` | Add `leaflet`, `esri-leaflet`, `@types/leaflet` |

### NPM Dependencies

```bash
npm install leaflet esri-leaflet @types/leaflet
# Optional for vector tiles:
npm install maplibre-gl
```

---

## 13. POC Scope Boundaries

### In Scope (Phase 1 POC)
- Split view layout (Mode B) triggered by spatial responses
- Map Explorer page (Mode C) with layer catalog
- 5-10 pre-configured layers from the MVP layer stack
- Feature click popups with attribute display
- SLR scenario slider
- "Ask EcoHeart about this" bridge from map to chat
- `arcgis_query` tool in the agent tool registry
- OpenStreetMap basemap (free, no license needed)

### Out of Scope (Future Phases)
- Drawing / sketching tools on the map
- Citizen reporting (pin drop + form submission)
- Geocoding search bar ("search for an address")
- ESRI premium basemaps (requires Startup Program)
- GeoEnrichment integration
- Spatial analysis via geopandas in Daytona
- Print / export map as image
- Saved map views / bookmarks
- Multi-layer overlay analysis in the agent
- Mobile-optimized map gestures
- Real-time streaming data (NOAA tide updates)

---

## 14. Implementation Priority

| Order | Task | Effort | Impact |
|-------|------|--------|--------|
| 1 | `map-container.tsx` — basic Leaflet wrapper | 2-3 hrs | Foundation |
| 2 | `map-layers.ts` — layer catalog registry | 1-2 hrs | Foundation |
| 3 | `split-view.tsx` — chat + map layout | 3-4 hrs | Core UX |
| 4 | Wire NOAA SLR tiled layers | 1 hr | Highest demo impact |
| 5 | Wire FEMA NFHL dynamic layer | 1 hr | Core climate layer |
| 6 | `feature-popup.tsx` — click-to-inspect | 2-3 hrs | Interactivity |
| 7 | `layer-control.tsx` — checkbox panel | 2-3 hrs | Usability |
| 8 | `slr-slider.tsx` — scenario control | 2 hrs | Demo wow factor |
| 9 | `spatial-tools.ts` — agent tool | 3-4 hrs | AI integration |
| 10 | Update `route.ts` + `chat-interface.tsx` | 4-6 hrs | Full pipeline |
| 11 | `map-explorer.tsx` — Mode C page | 3-4 hrs | Standalone view |
| 12 | Sidebar + home screen updates | 1-2 hrs | Navigation |

**Total estimated effort:** 25-35 development hours for a working POC.

---

## 15. Open Questions

1. **Leaflet vs MapLibre GL?** Leaflet has simpler API and better `esri-leaflet` plugin support. MapLibre has better vector tile performance and smoother interactions. Recommendation: start with Leaflet for speed, migrate to MapLibre if performance becomes an issue.

2. **Server-side proxy for REST queries?** Currently spec'd as client-side direct fetch. If we need to add caching, rate limiting, or API key injection (post-Startup Program), we'll need a `/api/map-proxy` route. Not needed for Phase 1 since all endpoints are public.

3. **Lazy loading the map bundle?** Leaflet + esri-leaflet adds ~150KB to the JS bundle. Use `next/dynamic` with `ssr: false` to lazy-load only when the map is needed. This prevents the map code from slowing down initial page load for non-spatial queries.

4. **Layer performance limits?** Thurston County's `emap_permitting` has 48+ layers. Need to test whether `L.esri.dynamicMapLayer` handles this gracefully or if we should expose individual sublayers as separate toggle controls.

5. **How much GeoJSON is too much for the LLM context?** If a spatial query returns 500+ features, we can't send all of it to GPT. Need a truncation/summarization strategy: send attribute summary + statistics to the LLM, but render all features on the map. The map shows everything; the AI summarizes it.
