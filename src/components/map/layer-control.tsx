"use client";

import { useState } from "react";
import {
  MAP_LAYERS,
  LAYER_CATEGORIES,
  SLR_SCENARIOS,
  SLR_LAYER_IDS,
  type LayerCategory,
} from "@/lib/map-layers";
import { useMapStore } from "@/lib/stores/use-map-store";
import {
  ChevronDown,
  ChevronRight,
  Info,
  Layers,
  X,
} from "lucide-react";

export default function LayerControl() {
  const { activeLayerIds, toggleLayer, slrScenario, setSlrScenario } =
    useMapStore();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<
    Set<LayerCategory>
  >(new Set(["climate", "water"]));
  const [infoLayerId, setInfoLayerId] = useState<string | null>(null);

  const toggleCategory = (cat: LayerCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Check if any SLR layer is active
  const hasSLR = activeLayerIds.some((id) => SLR_LAYER_IDS.includes(id));

  const handleSlrChange = (feet: number) => {
    setSlrScenario(feet);
    const target = SLR_SCENARIOS.find((s) => s.feet === feet);
    if (!target) return;

    // Deactivate all SLR layers, activate the selected one
    for (const slrId of SLR_LAYER_IDS) {
      if (activeLayerIds.includes(slrId) && slrId !== target.layerId) {
        toggleLayer(slrId);
      }
    }
    if (!activeLayerIds.includes(target.layerId)) {
      toggleLayer(target.layerId);
    }
  };

  // Group layers by category
  const categories = Object.keys(LAYER_CATEGORIES) as LayerCategory[];
  const layersByCategory = categories
    .map((cat) => ({
      category: cat,
      ...LAYER_CATEGORIES[cat],
      layers: MAP_LAYERS.filter((l) => l.category === cat),
    }))
    .filter((g) => g.layers.length > 0);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="flex items-center justify-center w-10 h-10 rounded-[16px] bg-[#fcf9f4]/80 backdrop-blur-[24px] shadow-[0px_12px_32px_rgba(28,28,25,0.06)] hover:scale-105 transition-transform"
        title="Show layer controls"
      >
        <Layers className="w-4 h-4 text-[#414844]" />
      </button>
    );
  }

  return (
    <div className="w-64 bg-[#fcf9f4]/80 backdrop-blur-[24px] rounded-[16px] shadow-[0px_12px_32px_rgba(28,28,25,0.06)] p-4 max-h-[70vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-[#414844]" />
          <h3 className="text-[11px] font-extrabold text-[#1c1c19] uppercase tracking-[0.1em] font-[Manrope]">
            Layer Controls
          </h3>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded-lg hover:bg-[#f6f3ee] transition-colors"
        >
          <X className="w-3.5 h-3.5 text-[#414844]" />
        </button>
      </div>

      {/* Category groups */}
      <div className="space-y-2">
        {layersByCategory.map((group) => (
          <div key={group.category}>
            {/* Category header */}
            <button
              onClick={() => toggleCategory(group.category)}
              className="flex items-center gap-1.5 w-full py-1 text-left hover:opacity-80 transition-opacity"
            >
              {expandedCategories.has(group.category) ? (
                <ChevronDown className="w-3 h-3 text-[#414844]" />
              ) : (
                <ChevronRight className="w-3 h-3 text-[#414844]" />
              )}
              <span className="text-[10px] font-bold text-[#414844] uppercase tracking-wider">
                {group.label}
              </span>
            </button>

            {/* Layer toggles */}
            {expandedCategories.has(group.category) && (
              <div className="ml-4 space-y-1.5 mt-1">
                {group.layers.map((layer) => (
                  <div key={layer.id} className="relative">
                    <label className="flex items-center justify-between cursor-pointer group py-0.5">
                      <span
                        className={`text-xs font-medium transition-colors ${
                          activeLayerIds.includes(layer.id)
                            ? "text-[#1c1c19]"
                            : "text-[#414844]"
                        }`}
                      >
                        {layer.name}
                        {layer.caveat && (
                          <span className="text-[9px] text-[#717973]">*</span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setInfoLayerId(
                              infoLayerId === layer.id ? null : layer.id
                            );
                          }}
                          className="p-0.5 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                        >
                          <Info className="w-3 h-3 text-[#414844]" />
                        </button>
                        {/* Toggle switch */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={activeLayerIds.includes(layer.id)}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleLayer(layer.id);
                          }}
                          className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
                            activeLayerIds.includes(layer.id)
                              ? "bg-[#012d1d]"
                              : "bg-[#e5e2dd]"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow-sm transform transition-transform duration-200 translate-y-[2px] ${
                              activeLayerIds.includes(layer.id)
                                ? "translate-x-[18px]"
                                : "translate-x-[2px]"
                            }`}
                          />
                        </button>
                      </div>
                    </label>

                    {/* Info tooltip */}
                    {infoLayerId === layer.id && (
                      <div className="mt-1 mb-2 p-2.5 bg-[#f6f3ee] rounded-[12px] text-[10px] text-[#414844] space-y-1">
                        <p>{layer.description}</p>
                        <p className="text-[#717973]">
                          Source: {layer.source}
                        </p>
                        <p className="text-[#717973] break-all">
                          {layer.url}
                        </p>
                        {layer.caveat && (
                          <p className="text-[#E8761B]">{layer.caveat}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* SLR Slider — appears when any SLR layer is active */}
      {hasSLR && (
        <div className="mt-4 pt-3 border-t border-[#c1c8c2]/15">
          <p className="text-[10px] font-bold text-[#1c1c19] uppercase tracking-wider mb-2">
            Sea Level Rise Scenario
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-[#414844] font-medium">1ft</span>
            <input
              type="range"
              min={0}
              max={3}
              value={SLR_SCENARIOS.findIndex((s) => s.feet === slrScenario)}
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                handleSlrChange(SLR_SCENARIOS[idx].feet);
              }}
              className="flex-1 h-1 appearance-none rounded-full bg-[#c1c8c2]/20 accent-[#012d1d] cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#012d1d]
                [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-[#fcf9f4]
                [&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(0,0,0,0.15)]"
            />
            <span className="text-[9px] text-[#414844] font-medium">10ft</span>
          </div>
          <p className="text-center text-[11px] font-semibold text-[#012d1d] mt-1">
            {slrScenario}ft selected
          </p>
        </div>
      )}

      {/* Caveat footnote */}
      {MAP_LAYERS.some(
        (l) => l.caveat && activeLayerIds.includes(l.id)
      ) && (
        <p className="mt-3 text-[9px] text-[#717973]">
          * County on-prem server — may be unavailable
        </p>
      )}
    </div>
  );
}
