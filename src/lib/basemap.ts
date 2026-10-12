import type * as Leaflet from "leaflet";

// CARTO's basemaps.cartocdn.com tiles now require an API key and render an
// "API KEY REQUIRED" watermark without one. Default to Esri's Light Gray
// Canvas, which is keyless and looks close to CARTO Positron.
// Set NEXT_PUBLIC_BASEMAP_URL (an XYZ template) to override.
const ESRI_CANVAS =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";

const ESRI_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com">Esri</a> &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';

export function addBasemap(L: typeof Leaflet, map: Leaflet.Map) {
  const customUrl = process.env.NEXT_PUBLIC_BASEMAP_URL;
  if (customUrl) {
    L.tileLayer(customUrl, {
      attribution:
        process.env.NEXT_PUBLIC_BASEMAP_ATTRIBUTION ||
        '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 20,
    }).addTo(map);
    return;
  }

  L.tileLayer(`${ESRI_CANVAS}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
    attribution: ESRI_ATTRIBUTION,
    maxNativeZoom: 16,
    maxZoom: 20,
  }).addTo(map);

  // Labels sit in their own pane above data overlays so they stay readable.
  if (!map.getPane("basemapLabels")) {
    const pane = map.createPane("basemapLabels");
    pane.style.zIndex = "450";
    pane.style.pointerEvents = "none";
  }
  L.tileLayer(`${ESRI_CANVAS}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, {
    pane: "basemapLabels",
    maxNativeZoom: 16,
    maxZoom: 20,
  }).addTo(map);
}
