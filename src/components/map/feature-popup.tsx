"use client";

import { useMapStore } from "@/lib/stores/use-map-store";
import { X, MessageCircle, Copy, Check } from "lucide-react";
import { useState } from "react";

interface FeaturePopupProps {
  /** Called when user clicks "Ask EcoHeart" — receives a pre-built contextual query */
  onAskEcoHeart?: (query: string) => void;
}

export default function FeaturePopup({ onAskEcoHeart }: FeaturePopupProps) {
  const { selectedFeature, selectedFeatureLayer, setSelectedFeature } =
    useMapStore();
  const [copied, setCopied] = useState(false);

  if (!selectedFeature) return null;

  const props = selectedFeature.properties ?? {};
  const entries = Object.entries(props).filter(
    ([key, val]) =>
      val !== null &&
      val !== undefined &&
      val !== "" &&
      !key.startsWith("OBJECTID") &&
      !key.startsWith("Shape") &&
      key !== "FID"
  );

  const handleCopy = async () => {
    const text = entries.map(([k, v]) => `${k}: ${v}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleAsk = () => {
    // Build a contextual query from the feature attributes
    const layerContext = selectedFeatureLayer ?? "this location";
    const keyAttrs = entries
      .slice(0, 5)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");

    const query = `What do the Olympia city plans and documents say about areas with these characteristics: ${layerContext} — ${keyAttrs}?`;
    onAskEcoHeart?.(query);
    setSelectedFeature(null);
  };

  return (
    <div className="absolute bottom-20 left-4 z-[1000] w-72 bg-white rounded-[12px] shadow-[0px_12px_32px_rgba(28,28,25,0.1)] overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-[10px] font-medium text-[#717973] uppercase tracking-wider">
          {selectedFeatureLayer ?? "Feature"}
        </span>
        <button
          onClick={() => setSelectedFeature(null)}
          className="p-1 rounded-lg hover:bg-[#f6f3ee] transition-colors"
        >
          <X className="w-3 h-3 text-[#414844]" />
        </button>
      </div>

      {/* Attribute table */}
      <div className="px-4 pb-3 max-h-48 overflow-y-auto">
        <div className="space-y-1.5">
          {entries.slice(0, 12).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-3">
              <span className="text-[11px] text-[#717973] truncate shrink-0 max-w-[40%]">
                {formatKey(key)}
              </span>
              <span className="text-[11px] text-[#1c1c19] font-medium text-right truncate">
                {String(value)}
              </span>
            </div>
          ))}
          {entries.length > 12 && (
            <p className="text-[10px] text-[#717973] text-center pt-1">
              +{entries.length - 12} more attributes
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#f6f3ee]">
        <button
          onClick={handleAsk}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-br from-[#012d1d] to-[#1b4332] text-white text-[11px] font-semibold rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          <MessageCircle className="w-3 h-3" />
          Ask EcoHeart
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-1 py-2 px-3 bg-[#e5e2dd] text-[#1c1c19] text-[11px] font-medium rounded-full hover:bg-[#dcdad5] transition-colors"
        >
          {copied ? (
            <Check className="w-3 h-3 text-[#059669]" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

/** Convert SCREAMING_CASE or camelCase keys to readable labels */
function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
