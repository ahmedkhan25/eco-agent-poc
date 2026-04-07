# EcoHearts × ESRI GIS Integration Roadmap

## Current Architecture Summary

The EcoHearts eco-agent MVP is a RAG-powered AI decision intelligence platform built on:

| Layer | Components |
|-------|-----------|
| **Frontend** | Next.js 15 + TypeScript, Recharts visualizations, Vercel AI SDK streaming |
| **Intelligence** | OpenAI GPT with function calling, agentic RAG pipeline, Daytona sandboxed Python execution |
| **Data** | Supabase PostgreSQL (RLS), Valyu API, web search RAG, CSV/PDF ingestion |
| **Deployment** | Cloud (Render/Vercel/AWS) or on-prem, optional Ollama for local LLMs |

**Current flow:** User query → Agent reasons → Searches sources (web, docs, databases) → Synthesizes → Generates charts/reports → Delivers answer with citations.

**What's missing:** The platform currently lacks native geospatial capabilities — no spatial queries, no map rendering, no GIS-aware analysis. This roadmap addresses that gap by integrating ESRI ArcGIS data and services.

---

## Why ESRI for EcoHearts

Miami-Dade County — the primary target customer — runs its entire GIS infrastructure on ESRI:

- **Open Data Hub** at `gis-mdc.opendata.arcgis.com` hosts 826+ datasets across 18 categories
- Geographic data stored in **ArcSDE** (ESRI's spatial database engine) and **ArcGIS Online (AGOL)**
- County departments publish via ESRI Feature Services with REST endpoints
- Key climate datasets (sea level rise, FEMA flood zones, flood criteria) are all ArcGIS-hosted

Integrating ESRI means speaking the county's native GIS language — dramatically reducing friction for pilot deployment.

---

## Miami-Dade Priority Datasets

These are the highest-value ArcGIS-hosted datasets for the EcoHearts climate/resilience use case:

| Dataset | Category | Relevance |
|---------|----------|-----------|
| Sea Level Rise Impacts | Environment | Inundation projections, adaptation planning |
| Sea Level Rise Strategy | Environment | County adaptation approaches, action areas |
| FEMA Flood Zones | Hydrology | Base flood elevation, risk zones |
| County Flood Criteria 2022 | Hydrology | Stormwater design standards |
| Municipal Boundaries | Boundaries | Jurisdictional analysis |
| Evacuation Zones | Public Safety | Emergency response planning |
| LiDAR/Elevation Data | Imagery | Terrain analysis, flood modeling |
| Transportation Network | Transportation | Emergency route optimization |
| Critical Infrastructure | Infrastructure | Vulnerability assessment |

---

## Phased Roadmap

### Phase 1: Data Ingestion & RAG Enhancement (Weeks 1–4)

**Goal:** Make ESRI data queryable through the existing eco-agent chat interface.

**1.1 — ArcGIS REST API Connector**

Build a new tool in the function-calling toolkit that queries ArcGIS Feature Services:

```
User: "What areas in Miami-Dade are in FEMA flood zone AE?"
Agent → calls arcgis_query tool → queries Feature Service REST endpoint
     → returns GeoJSON features → agent summarizes results
```

Technical implementation:
- Use `@esri/arcgis-rest-request` and `@esri/arcgis-rest-feature-service` npm packages (lightweight JS wrappers around ArcGIS REST APIs)
- Register as new function tools alongside existing Valyu/web-search tools
- Endpoints follow pattern: `https://gis-mdc.opendata.arcgis.com/datasets/{id}/FeatureServer/0/query`
- Support parameters: `where`, `geometry`, `outFields`, `returnGeometry`, `f=geojson`

**1.2 — GeoJSON → RAG Pipeline**

Extend the existing RAG pipeline to handle spatial data:
- Parse GeoJSON responses and extract attribute tables for LLM context
- Chunk large feature sets (e.g., 10K+ parcels) with spatial partitioning
- Store spatial metadata (bounding box, feature count, CRS) as retrieval context
- Add coordinate-aware summarization prompts

**1.3 — Spatial Awareness in Agent Prompts**

Update system prompts so the agent understands it can perform spatial queries:
- Add tool descriptions for ArcGIS query, geocoding, and GeoEnrichment
- Include Miami-Dade geographic context (municipalities, districts, zip codes)
- Teach the agent to decompose spatial questions into REST API parameters

**Deliverable:** User can ask "Show me properties in flood zone AE near Little Havana" and get a data-backed answer with feature counts and attribute summaries.

---

### Phase 2: Map Visualization (Weeks 5–8)

**Goal:** Render spatial query results as interactive maps in the UI.

**2.1 — Map Component in Next.js**

Add a map rendering layer to the frontend:
- Use **ArcGIS Maps SDK for JavaScript** (Esri's official web mapping library) OR **MapLibre GL JS** with ArcGIS basemaps (lighter weight, open source)
- Render agent-returned GeoJSON as map layers
- Include ESRI vector tile basemaps (streets, satellite, topographic)
- Support click-to-inspect feature attributes

**2.2 — Agent → Map Pipeline**

When the agent determines a query has spatial results:
- Return structured response with both text summary AND GeoJSON payload
- Frontend detects spatial payload → renders split view (chat + map)
- Map auto-zooms to result extent
- Layer styling based on attribute values (e.g., color-code by flood risk level)

**2.3 — Geocoding Integration**

Enable location-based queries using ESRI Geocoding Service:
- User says "near Brickell" → geocode to coordinates → use as spatial filter
- Reverse geocode coordinates in results to human-readable addresses
- Endpoint: `https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer`

**Deliverable:** Interactive map appears alongside agent responses, showing flood zones, sea level rise projections, and other spatial data overlaid on Miami-Dade basemap.

---

### Phase 3: Spatial Analysis & Scenario Engine (Weeks 9–14)

**Goal:** Enable "what-if" spatial analysis through the agent.

**3.1 — GeoEnrichment for Context**

Integrate ESRI's GeoEnrichment service to automatically enrich any location with:
- Demographics (population, income, age distribution)
- Housing data (home values, units, vacancy)
- Risk indicators (flood insurance claims, storm surge exposure)
- Endpoint: `https://geoenrich.arcgis.com/arcgis/rest/services/World/geoenrichmentserver`

Example flow:
```
User: "What's the socioeconomic profile of areas affected by 2ft sea level rise?"
Agent → queries sea level rise layer → gets affected geometries
     → sends geometries to GeoEnrichment → gets demographics
     → synthesizes: "23,400 residents affected, median income $42K,
        68% renter-occupied, disproportionately impacts Little Haiti
        and Liberty City communities"
```

**3.2 — Scenario Modeling via Daytona Sandbox**

Leverage the existing Daytona sandboxed Python execution for spatial analysis:
- Install `geopandas`, `shapely`, `rasterio` in sandbox
- Agent generates Python code for spatial operations (buffer, intersect, overlay)
- Run flood scenario models: "What if sea level rises 3ft AND a Category 3 hurricane?"
- Return results as GeoJSON + statistical summaries

**3.3 — Multi-Layer Overlay Analysis**

Enable cross-dataset queries:
- Intersect flood zones with critical infrastructure
- Overlay sea level rise projections with evacuation routes
- Combine demographic data with vulnerability indices
- Agent automatically selects and combines relevant layers

**Deliverable:** User can ask complex scenario questions and receive spatially-grounded analysis with maps, statistics, and actionable recommendations.

---

### Phase 4: Real-Time Data & Citizen Engagement (Weeks 15–20)

**Goal:** Integrate live data streams and enable bidirectional citizen input.

**4.1 — Real-Time Data Feeds**

Connect to live ArcGIS services:
- NOAA weather/tide stations via ArcGIS Stream Services
- Miami-Dade 311 service requests (live reporting)
- Traffic/transit real-time feeds
- Use Supabase real-time subscriptions to push updates to the UI

**4.2 — Citizen Reporting Integration**

Build a spatial input interface:
- Citizens can drop pins on the map to report flooding, infrastructure issues
- Reports stored as features in Supabase with geometry
- Agent can query citizen reports alongside official data
- Supports the "voice of the citizen" value proposition

**4.3 — ArcGIS Hub Integration**

Connect to Miami-Dade's ArcGIS Hub for:
- Accessing curated initiative datasets (Sea Level Rise Strategy hub)
- Publishing EcoHearts analysis results back as ArcGIS items
- Enabling collaborative data sharing with county staff

**Deliverable:** Live dashboard combining official ESRI data, real-time feeds, and citizen reports — all queryable through the eco-agent.

---

## Technical Architecture (Post-Integration)

```
┌─────────────────────────────────────────────────────┐
│                    USER INTERFACE                     │
│  Next.js 15 + MapLibre/ArcGIS JS + Recharts         │
│  [Chat Panel]  [Map Panel]  [Dashboard Panel]        │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│              INTELLIGENCE LAYER                      │
│  OpenAI GPT / Ollama (function calling)              │
│  ┌────────────────────────────────────────────┐      │
│  │           TOOL REGISTRY                     │      │
│  │  • web_search    • valyu_api               │      │
│  │  • arcgis_query  ← NEW                     │      │
│  │  • arcgis_geocode ← NEW                    │      │
│  │  • arcgis_geoenrich ← NEW                  │      │
│  │  • daytona_exec  (geopandas enabled)       │      │
│  │  • chart_gen     • csv_export              │      │
│  └────────────────────────────────────────────┘      │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│                   DATA LAYER                         │
│                                                      │
│  ┌─────────────┐  ┌──────────────────────────────┐  │
│  │  Supabase    │  │  ESRI ArcGIS Services        │  │
│  │  PostgreSQL  │  │  • Feature Services (REST)   │  │
│  │  (RLS)       │  │  • Geocoding Service         │  │
│  │             │  │  • GeoEnrichment Service     │  │
│  │  + citizen   │  │  • Vector Tile Basemaps      │  │
│  │    reports   │  │  • Stream Services (live)    │  │
│  └─────────────┘  └──────────────────────────────┘  │
│                                                      │
│  ┌─────────────────────────────────────────────────┐│
│  │  Miami-Dade Open Data Hub (ArcGIS)              ││
│  │  gis-mdc.opendata.arcgis.com                    ││
│  │  826+ datasets: flood, SLR, boundaries, infra   ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

## Implementation Dependencies

| Dependency | Purpose | Cost |
|-----------|---------|------|
| `@esri/arcgis-rest-request` | Auth + REST API wrapper | Free (open source) |
| `@esri/arcgis-rest-feature-service` | Feature queries | Free (open source) |
| `@esri/arcgis-rest-geocoding` | Address search | Free (open source lib); API calls require ArcGIS Developer account |
| ArcGIS Developer Account | API keys for premium services | Free tier: 2M basemap tiles/mo, 20K geocodes/mo, 100 GeoEnrichment |
| MapLibre GL JS | Map rendering (alternative to ArcGIS JS) | Free (open source) |
| `geopandas` + `shapely` | Spatial analysis in Daytona sandbox | Free (open source) |
| ArcGIS Location Platform | Production-scale premium services | ~$175/mo (Essentials plan) for higher limits |

**Note:** Miami-Dade's Open Data Hub Feature Services are free and require no authentication — Phase 1 can start with zero ESRI licensing cost.

---

## Success Metrics

| Phase | Metric | Target |
|-------|--------|--------|
| Phase 1 | Spatial queries answerable via chat | 90%+ of common flood/SLR questions |
| Phase 2 | Map render time from query | < 3 seconds |
| Phase 3 | Scenario analysis accuracy vs. manual GIS | Within 5% of ArcGIS Pro results |
| Phase 4 | Citizen reports ingested | 100+ in first pilot month |
| Overall | Time to answer spatial decision questions | 80%+ reduction vs. manual GIS workflow |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| ArcGIS API rate limits on free tier | Cache frequently-accessed layers in Supabase; use Open Data Hub (no auth) for static data |
| Large GeoJSON payloads overwhelming LLM context | Spatial chunking + attribute summarization before sending to GPT |
| Map rendering performance on mobile | Use vector tiles (lighter) over raster; lazy-load non-visible layers |
| ESRI licensing complexity for on-prem | Use open source stack (MapLibre + direct REST calls) for self-hosted deployments |
| Data freshness of cached layers | Implement ETL pipeline with configurable refresh intervals per dataset |

---

## Alignment with Miami-Dade Application

This roadmap directly strengthens the four key areas from the Miami-Dade application:

- **Operational Efficiency:** GIS queries that took hours in ArcGIS Pro can be answered in seconds via natural language
- **Situational Awareness:** Real-time spatial data feeds + scenario modeling provide dynamic risk assessment
- **Improved Decision Making:** Multi-layer spatial analysis with demographic enrichment enables evidence-based policy
- **Community Resilience:** Citizen reporting + public-facing maps create feedback loops between government and residents
