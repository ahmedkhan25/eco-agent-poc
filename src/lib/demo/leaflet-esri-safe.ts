import type * as Leaflet from "leaflet";

// --------------------------------------------------------------------------
// esri-leaflet teardown-race fix.
//
// esri-leaflet's RasterLayer._renderImage attaches a one-shot "error" handler
// to each export-image overlay:
//
//     const onOverlayError = function () {
//       this._map.removeLayer(image);   // <-- this._map can be null
//       ...
//     };
//
// If the FEMA/NOAA export request ERRORS *after* the layer (or whole map) has
// already been removed — which happens routinely with React 18 Strict Mode's
// dev double-mount, or when navigating away mid-request — `this._map` is null
// and the handler throws:
//
//     TypeError: Cannot read properties of null (reading 'removeLayer')
//
// We replace _renderImage on the shared RasterLayer prototype with a faithful
// copy that guards every `_map` access. Applied once, feature-detected, so it
// degrades to a no-op if esri-leaflet's internals change.
// --------------------------------------------------------------------------

let patched = false;

export function patchEsriRasterLayer(L: typeof Leaflet, esri: any): void {
  if (patched) return;

  const dynamicProto = esri?.DynamicMapLayer?.prototype;
  // RasterLayer is not exported; reach it via the DynamicMapLayer prototype
  // chain so the fix also covers ImageMapLayer (both extend RasterLayer).
  const rasterProto = dynamicProto && Object.getPrototypeOf(dynamicProto);
  if (!rasterProto || typeof rasterProto._renderImage !== "function") return;

  // Mirror esri-leaflet's internal ImageOverlay subclass (handles non-3857 CRS).
  const Overlay = (L.ImageOverlay as any).extend({
    onAdd(map: any) {
      this._topLeft = map.getPixelBounds().min;
      (L.ImageOverlay as any).prototype.onAdd.call(this, map);
    },
    _reset() {
      if (this._map.options.crs === L.CRS.EPSG3857) {
        (L.ImageOverlay as any).prototype._reset.call(this);
      } else {
        L.DomUtil.setPosition(
          this._image,
          this._topLeft.subtract(this._map.getPixelOrigin()),
        );
      }
    },
  });

  rasterProto._renderImage = function (
    url: string,
    bounds: any,
    contentType?: string,
  ) {
    // GUARD: nothing to do once the layer is detached.
    if (!this._map) return;

    if (contentType) url = `data:${contentType};base64,${url}`;
    if (!url) return;

    const image = new Overlay(url, bounds, {
      opacity: 0,
      crossOrigin: this.options.withCredentials
        ? "use-credentials"
        : this.options.useCors,
      alt: this.options.alt,
      pane: this.options.pane || this.getPane(),
      interactive: this.options.interactive,
    }).addTo(this._map);

    let onOverlayLoad: (e: any) => void;

    const onOverlayError = () => {
      // GUARD: the map/layer may already be gone when the request errors.
      if (this._map) this._map.removeLayer(image);
      this.fire("error");
      image.off("load", onOverlayLoad, this);
    };

    onOverlayLoad = (e: any) => {
      image.off("error", onOverlayError, this);
      if (!this._map) {
        this.fire("load", { bounds });
        return;
      }
      const newImage = e.target;
      const oldImage = this._currentImage;

      if (
        newImage._bounds.equals(bounds) &&
        newImage._bounds.equals(this._map.getBounds())
      ) {
        this._currentImage = newImage;

        if (this.options.position === "front") this.bringToFront();
        else if (this.options.position === "back") this.bringToBack();
        if (this.options.zIndex) this.setZIndex(this.options.zIndex);

        if (this._map && this._currentImage._map) {
          this._currentImage.setOpacity(this.options.opacity);
        } else if (this._currentImage._map) {
          this._currentImage._map.removeLayer(this._currentImage);
        }

        if (oldImage && this._map) this._map.removeLayer(oldImage);
        if (oldImage && oldImage._map) oldImage._map.removeLayer(oldImage);
      } else {
        this._map.removeLayer(newImage);
      }

      this.fire("load", { bounds });
    };

    image.once("error", onOverlayError, this);
    image.once("load", onOverlayLoad, this);
  };

  patched = true;
}
