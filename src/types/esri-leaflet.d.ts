declare module "esri-leaflet" {
  import * as L from "leaflet";

  interface EsriLayerOptions extends L.LayerOptions {
    url: string;
    token?: string;
    proxy?: string;
  }

  interface DynamicMapLayerOptions extends EsriLayerOptions {
    layers?: number[];
    layerDefs?: Record<number, string>;
    opacity?: number;
    transparent?: boolean;
    format?: string;
    f?: string;
  }

  interface TiledMapLayerOptions extends EsriLayerOptions {
    opacity?: number;
    zoomOffsetAllowAdjustment?: boolean;
  }

  interface FeatureLayerOptions extends EsriLayerOptions {
    where?: string;
    fields?: string[];
    style?: (feature: GeoJSON.Feature) => L.PathOptions;
    onEachFeature?: (feature: GeoJSON.Feature, layer: L.Layer) => void;
    pointToLayer?: (feature: GeoJSON.Feature, latlng: L.LatLng) => L.Layer;
    minZoom?: number;
    maxZoom?: number;
  }

  export function dynamicMapLayer(options: DynamicMapLayerOptions): L.Layer;
  export function tiledMapLayer(options: TiledMapLayerOptions): L.Layer;
  export function featureLayer(options: FeatureLayerOptions): L.Layer;
  export function imageMapLayer(options: EsriLayerOptions): L.Layer;
}
