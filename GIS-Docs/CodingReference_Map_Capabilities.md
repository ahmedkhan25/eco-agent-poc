# Building web maps with ArcGIS REST services — no account required

**Public ArcGIS REST endpoints work with Leaflet and MapLibre without any API key, paid account, or authentication token.** The esri-leaflet plugin's `featureLayer`, `dynamicMapLayer`, and `tiledMapLayer` classes all treat authentication as optional — keys are only required for Esri's own hosted basemaps and location services (geocoding, routing), not for consuming third-party public endpoints like FEMA, NOAA, or county GIS services. This guide covers every layer of the stack needed to build a working climate decision intelligence map POC on Next.js 15, targeting Olympia, WA, at zero licensing cost.

---

## esri-leaflet works with public endpoints — no key needed

The esri-leaflet FAQ states explicitly: **"Accessing public services hosted on ArcGIS Online or ArcGIS Enterprise does not require authentication."** The `token` and `apiKey` parameters on all layer classes default to empty/null and are only needed when a service is secured. Here's what works without any credentials:

| Class | Works without key? | Notes |
|---|---|---|
| `L.esri.featureLayer` | ✅ Yes | For any public FeatureServer or MapServer layer URL |
| `L.esri.dynamicMapLayer` | ✅ Yes | Server-side rendered map images from public MapServer |
| `L.esri.tiledMapLayer` | ✅ Yes | Pre-cached tile layers from public MapServer |
| `L.esri.imageMapLayer` | ✅ Yes | For public ImageServer endpoints |
| `L.esri.Vector.vectorBasemapLayer` | ❌ Requires key | Esri-hosted basemaps only |

The API key requirement was introduced in **esri-leaflet-vector v3.x** (2021–2022) and applies solely to Esri's Basemap Styles API. When Esri deprecated legacy raster basemap services (April 2022), they pushed developers toward `vectorBasemapLayer` with mandatory authentication. But this has nothing to do with consuming public government ArcGIS services — those remain completely open.

```typescript
// This works with zero configuration, zero API key
import { dynamicMapLayer, featureLayer } from "esri-leaflet";

// FEMA flood zones — server-rendered image overlay
dynamicMapLayer({
  url: "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer",
  layers: [28],
  opacity: 0.5,
}).addTo(map);

// Thurston County wetlands — individual vector features
featureLayer({
  url: "https://map.co.thurston.wa.us/arcgis/rest/services/Thurston/Thurston_Wetlands/FeatureServer/0",
}).addTo(map);
```

---

## All target endpoints are confirmed public

Each of the four target endpoints was tested and returns full service metadata without authentication. The key diagnostic: a public ArcGIS service responds to `?f=json` with a `currentVersion` field and full layer metadata. A secured service returns `{"error":{"code":499,"message":"Token Required"}}`.

| Endpoint | Type | Auth? | Details |
|---|---|---|---|
| **FEMA NFHL** `hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer` | MapServer | **No** | Dozens of layers including Flood Hazard Zones (layer 28). Also exposes WMS at `/WMSServer` |
| **NOAA SLR 3ft** `coast.noaa.gov/arcgis/rest/services/dc_slr/slr_3ft/MapServer` | MapServer (cached) | **No** | Two layers: Low-lying Areas, Depth. Full series available (`slr_1ft` through `slr_10ft`). WMTS endpoint available |
| **Thurston County Wetlands** `map.co.thurston.wa.us/.../Thurston_Wetlands/FeatureServer` | FeatureServer | **No** | Version 10.81. Polygon layer with NWI classification codes. Updated 2017 |
| **NOAA CO-OPS** `api.tidesandcurrents.noaa.gov/api/prod/datagetter` | REST API (non-ArcGIS) | **No** | Station 9446484 (Tacoma, WA). Returns water levels, predictions, temperature. Rate-limited by data interval |

**How to check any ArcGIS endpoint yourself:** Fetch `https://<host>/arcgis/rest/info?f=json` and look at the `authInfo` object. If `isTokenBasedSecurity` is `false`, the entire server is unsecured. If `true`, test individual services with `?f=json` — they can still be public even when the server uses token-based security. Additional useful public endpoints for the Olympia area include Washington State DNR's wetlands and forest practices services at `gis.dnr.wa.gov`, the Puget Sound Partnership Spatial Hub, and Thurston County's streams FeatureServer.

---

## Free basemaps that work without any API key

For a government demo where you need a professional-looking basemap but cannot create any account, **CARTO Positron** is the strongest option — clean, minimal, and widely used in data visualization. Here are the tested options ranked by visual quality for a government context:

**CARTO Positron** (light, professional, best for overlaying data):
```typescript
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 20,
});
```

**CARTO Voyager** (colored, detailed, good for context-heavy maps):
```typescript
L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; OpenStreetMap &copy; CARTO',
  subdomains: "abcd",
  maxZoom: 20,
});
```

**OpenStreetMap** (reliable, universally recognized):
```typescript
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
});
```

A few caveats worth knowing. **CARTO** tiles currently work without authentication, but CARTO's license restricts free public use — for a demo or POC this is fine, but production commercial deployment technically requires an Enterprise license. **Stamen tiles** (Toner, Terrain, Watercolor) migrated to Stadia Maps in 2023 and now require an API key for production use (free for localhost development only). **Esri legacy raster basemaps** (`server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`) still work without a key but are deprecated and could be shut down without notice.

For the safest long-term approach, sign up for a **free ArcGIS Location Platform account** (no credit card required) — this provides **2 million free basemap tiles per month** with full support.

---

## Three ways to consume ArcGIS services without esri-leaflet

If you want to avoid the esri-leaflet dependency entirely, three approaches work with plain Leaflet:

**1. WMS with `L.tileLayer.wms()`** — When the ArcGIS server exposes WMS (many do), this is the simplest zero-dependency approach. FEMA NFHL has a dedicated WMS endpoint:

```typescript
L.tileLayer.wms(
  "https://hazards.fema.gov/gis/nfhl/services/public/NFHLWMS/MapServer/WMSServer",
  {
    layers: "28",
    format: "image/png",
    transparent: true,
    attribution: "FEMA NFHL",
  }
).addTo(map);
```

**2. Direct `fetch()` with GeoJSON** — Query the ArcGIS REST API directly with `f=geojson` and render with Leaflet's native `L.geoJSON()`. This gives you full control over styling and interactivity:

```typescript
const response = await fetch(
  "https://map.co.thurston.wa.us/arcgis/rest/services/Thurston/Thurston_Wetlands/FeatureServer/0/query?" +
  "where=1%3D1&outFields=*&f=geojson&returnGeometry=true"
);
const data = await response.json();
L.geoJSON(data, {
  style: { color: "#2e7d32", weight: 1, fillOpacity: 0.3 },
}).addTo(map);
```

The main limitation is the **`maxRecordCount`** — most servers cap results at 1,000–2,000 features per request, so large datasets require pagination. The `f=geojson` parameter requires ArcGIS Server 10.4+; for older servers, use `f=json` and convert with the `@esri/arcgis-to-geojson-utils` library.

**3. MapServer export as image overlay** — The `/MapServer/export` endpoint returns a rendered PNG for a given bounding box. This is what `L.esri.dynamicMapLayer` uses internally. The lightweight `EsriRest-leaflet` plugin wraps this pattern, or you can construct the URLs manually with Leaflet's `L.ImageOverlay`.

---

## MapLibre GL JS offers a compelling WebGL alternative

MapLibre GL JS can consume public ArcGIS REST services through native GeoJSON and raster/vector tile sources, plus a growing plugin ecosystem. The key advantage over Leaflet is **WebGL-based rendering** — MapLibre handles tens of thousands of features smoothly where Leaflet's DOM-based rendering starts to struggle above ~1,000 features. The main tradeoff is a **5× larger bundle** (~220 KB gzipped vs Leaflet's ~42 KB) and a steeper learning curve with its style-specification-driven API.

**Esri now maintains an official plugin**: `@esri/maplibre-arcgis` (Apache 2.0 license, released 2025) supports FeatureLayer, VectorTileLayer, and MapTileLayer. For public services, the FeatureLayer class works without authentication:

```typescript
import maplibreArcGIS from "@esri/maplibre-arcgis";

const wetlands = await maplibreArcGIS.FeatureLayer.fromUrl(
  "https://map.co.thurston.wa.us/arcgis/rest/services/Thurston/Thurston_Wetlands/FeatureServer/0"
);
wetlands.addSourcesAndLayersTo(map);
```

For free basemaps with MapLibre, **OpenFreeMap** is the standout — zero API keys, zero registration, no request limits, production-quality vector tiles:

```typescript
const map = new maplibregl.Map({
  style: "https://tiles.openfreemap.org/styles/positron",
  center: [-122.9007, 47.0379], // Olympia, WA
  zoom: 12,
  container: "map",
});
```

Community plugins include `mapbox-gl-arcgis-featureserver` (makes tiled requests to FeatureServer, works with MapLibre) and `esri-gl` (TypeScript library replicating esri-leaflet's architecture for WebGL maps, including DynamicMapService support). The official `@esri/maplibre-arcgis` does not yet support DynamicMapService — a gap if you need server-side rendered map images from complex MapServer endpoints like FEMA NFHL.

**Recommendation for this POC**: Leaflet + esri-leaflet is the pragmatic choice. The esri-leaflet ecosystem is far more mature for ArcGIS integration (maintained by Esri since 2014), and the POC's data volumes won't stress Leaflet's rendering. MapLibre becomes the better choice if you later need to render large vector datasets or want 3D map capabilities.

---

## The free ArcGIS account you probably don't need (but might want)

The **ArcGIS Location Platform** (formerly ArcGIS Developer Account, renamed June 2024) offers a free tier with no credit card requirement. Sign up at **https://location.arcgis.com**. The free tier includes **2 million basemap tiles/month**, 20,000 geocode operations, 20,000 simple routes, and 250 MB of feature service storage. Beyond the free tier, services pause until the next billing cycle unless you enable pay-as-you-go.

The account type landscape is confusing. An **ArcGIS Public Account** (free at arcgis.com) is for personal, non-commercial use — you can create web maps but cannot generate API keys or deploy applications. The **ArcGIS Location Platform** account is the developer-focused product with API keys, a free tier, and commercial deployment rights. **ArcGIS Online** is the enterprise organizational product with credit-based pricing and multi-user management.

For this POC, you likely don't need any Esri account at all — all target data services are public, and free basemaps (CARTO, OSM) work without authentication. But if you want Esri's high-quality basemaps, the free Location Platform tier is more than sufficient.

---

## Next.js 15 implementation with TypeScript

Leaflet's requirement for browser APIs (`window`, `document`) at import time means it cannot be imported during server-side rendering. The recommended pattern for Next.js 15 App Router uses **vanilla Leaflet with dynamic imports inside `useEffect`** — this is cleaner than react-leaflet for esri-leaflet integration because both libraries share an imperative API style.

**Install dependencies:**
```bash
npm install leaflet esri-leaflet
npm install -D @types/leaflet @types/esri-leaflet
```

Current versions: `leaflet@1.9.4`, `esri-leaflet@3.0.12+`, `@types/leaflet@1.9.21`, `@types/esri-leaflet@3.0.4`. If using react-leaflet instead, install `react-leaflet@5.0.0` (requires React 19, which Next.js 15 ships with).

**The map component** (`src/components/Map/LeafletMap.tsx`):

```typescript
"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

interface MapProps {
  center: [number, number];
  zoom?: number;
}

export default function LeafletMapComponent({ center, zoom = 12 }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const init = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      // Fix default marker icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!).setView(center, zoom);
      mapRef.current = map;

      // Free basemap — no API key
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 20,
        }
      ).addTo(map);

      // Load esri-leaflet dynamically
      const esri = await import("esri-leaflet");

      // FEMA Flood Zones — no API key needed
      esri
        .dynamicMapLayer({
          url: "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer",
          layers: [28],
          opacity: 0.5,
        })
        .addTo(map);

      // Thurston County Wetlands — no API key needed
      esri
        .featureLayer({
          url: "https://map.co.thurston.wa.us/arcgis/rest/services/Thurston/Thurston_Wetlands/FeatureServer/0",
          style: () => ({ color: "#2e7d32", weight: 1, fillOpacity: 0.3 }),
        })
        .addTo(map);

      // NOAA Sea Level Rise — no API key needed
      esri
        .tiledMapLayer({
          url: "https://coast.noaa.gov/arcgis/rest/services/dc_slr/slr_3ft/MapServer",
          opacity: 0.6,
        })
        .addTo(map);
    };

    init();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [center, zoom]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}
```

**The dynamic wrapper** (`src/components/Map/index.tsx`):

```typescript
import dynamic from "next/dynamic";

const Map = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "600px",
        background: "#f5f5f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      Loading map…
    </div>
  ),
});

export default Map;
```

**Usage in a page** (`src/app/page.tsx`) — the page itself can be a Server Component:

```typescript
import Map from "@/components/Map";

export default function HomePage() {
  return (
    <main>
      <h1>Olympia Climate Intelligence</h1>
      <div style={{ height: "600px" }}>
        <Map center={[47.0379, -122.9007]} zoom={12} />
      </div>
    </main>
  );
}
```

**Critical gotchas:** The `ssr: false` flag on `next/dynamic` is mandatory — without it, Next.js will attempt to render Leaflet server-side and crash. Marker icons break in bundled environments because Leaflet's default icon URL resolution fails; the `L.Icon.Default.mergeOptions` fix or the `leaflet-defaulticon-compatibility` package resolves this. If you use react-leaflet instead of vanilla Leaflet, version 5.0.0 works with Next.js 15's React 19, but note that react-leaflet is currently inactive (no releases in 12+ months) and does not provide any SSR solution — you still need `next/dynamic` with `ssr: false`. For esri-leaflet plugin type definitions that don't exist on DefinitelyTyped, create a `src/types/esri-leaflet-plugins.d.ts` file with `declare module "esri-leaflet-vector"` stubs.

---

## Conclusion

The entire stack works at zero cost. Public government ArcGIS REST endpoints — FEMA NFHL, NOAA Sea Level Rise, Thurston County GIS, NOAA tides — require no authentication whatsoever. esri-leaflet's `featureLayer`, `dynamicMapLayer`, and `tiledMapLayer` consume these endpoints without any API key configuration. CARTO Positron provides a professional basemap without registration. The vanilla Leaflet + dynamic import pattern handles Next.js 15's SSR constraints cleanly.

The only scenario requiring an Esri account is if you want Esri's own basemaps (sign up free at location.arcgis.com — no credit card, 2M tiles/month). For everything else in this POC — flood zones, sea level rise projections, wetland boundaries, tidal data — authentication is not a factor. If you later need to render large datasets with better performance, MapLibre GL JS with OpenFreeMap basemaps and the `@esri/maplibre-arcgis` plugin offers a WebGL-powered path forward that is equally free.