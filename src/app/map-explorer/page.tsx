"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Info } from "lucide-react";
import EcoHeartMap from "@/components/map/index";
import LayerControl from "@/components/map/layer-control";
import FeaturePopup from "@/components/map/feature-popup";
import { useMapStore } from "@/lib/stores/use-map-store";
import { Sidebar } from "@/components/sidebar";

export default function MapExplorerPage() {
  const router = useRouter();
  const { setSelectedFeature } = useMapStore();

  // Ensure the map store is in a clean state when visiting this page
  useEffect(() => {
    return () => {
      setSelectedFeature(null);
    };
  }, [setSelectedFeature]);

  const handleAskEcoHeart = (query: string) => {
    // Navigate to chat with the query pre-filled
    router.push(`/?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-[#fcf9f4] flex">
      <Sidebar />

      {/* Main content — full-width map */}
      <div className="flex-1 flex flex-col pt-16 md:pl-24 h-screen overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3 flex items-center justify-between bg-[#fcf9f4]/80 backdrop-blur-md z-10">
          <div>
            <h1 className="text-lg font-bold text-[#1c1c19] font-[Manrope] tracking-tight">
              Map Explorer
            </h1>
            <p className="text-xs text-[#414844]">
              Browse environmental layers for the Olympia region
            </p>
          </div>
          <Link
            href="/spatial-pipeline"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-semibold transition-colors shadow-sm"
          >
            <Info className="w-3.5 h-3.5" />
            How It Works
          </Link>
        </div>

        {/* Map canvas */}
        <div className="flex-1 relative">
          <EcoHeartMap />

          {/* Layer controls — bottom right */}
          <div className="absolute bottom-4 right-4 z-[1000]">
            <LayerControl />
          </div>

          {/* Feature popup — bottom left */}
          <FeaturePopup onAskEcoHeart={handleAskEcoHeart} />

          {/* Attribution */}
          <div className="absolute bottom-2 left-4 z-[999] text-[9px] text-[#414844]/60 font-medium pointer-events-none">
            EcoHeart Earth Ledger
          </div>
        </div>
      </div>
    </div>
  );
}
