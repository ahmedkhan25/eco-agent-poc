"use client";

import { useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import EcoHeartMap from "@/components/map/index";
import LayerControl from "@/components/map/layer-control";
import FeaturePopup from "@/components/map/feature-popup";
import { useMapStore } from "@/lib/stores/use-map-store";
import type { MapHandle } from "@/components/map/map-container";

interface SplitViewProps {
  children: ReactNode;
  /** Called when user clicks "Ask EcoHeart" from a feature popup */
  onAskQuery?: (query: string) => void;
}

export default function SplitView({ children, onAskQuery }: SplitViewProps) {
  const { isMapVisible, hideMap } = useMapStore();
  const mapRef = useRef<MapHandle>(null);

  return (
    <div className="flex-1 flex flex-row h-full min-h-0 overflow-hidden">
      {/* Chat panel */}
      <motion.div
        className="flex flex-col min-w-0 overflow-hidden"
        animate={{
          width: isMapVisible ? "45%" : "100%",
          minWidth: isMapVisible ? "380px" : undefined,
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {children}
      </motion.div>

      {/* Map panel */}
      <AnimatePresence>
        {isMapVisible && (
          <motion.div
            className="relative flex-1 min-w-[480px] hidden md:flex"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "55%", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
          >
            {/* Map canvas */}
            <div className="absolute inset-0">
              <EcoHeartMap ref={mapRef} />
            </div>

            {/* Close button */}
            <button
              onClick={hideMap}
              className="absolute top-4 right-4 z-[1000] w-10 h-10 bg-[#fcf9f4]/70 backdrop-blur-[24px] rounded-full flex items-center justify-center text-[#1c1c19] hover:bg-[#fcf9f4] transition-all shadow-[0px_12px_32px_rgba(28,28,25,0.06)]"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Layer controls — bottom right */}
            <div className="absolute bottom-4 right-4 z-[1000]">
              <LayerControl />
            </div>

            {/* Feature popup — bottom left */}
            <FeaturePopup onAskEcoHeart={onAskQuery} />

            {/* Map attribution overlay */}
            <div className="absolute bottom-2 left-4 z-[999] text-[9px] text-[#414844]/60 font-medium pointer-events-none">
              EcoHeart Earth Ledger
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile: map as slide-up drawer */}
      <AnimatePresence>
        {isMapVisible && (
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 md:hidden"
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ height: "70vh" }}
          >
            <div className="h-full bg-[#fcf9f4] rounded-t-[24px] shadow-[0px_-12px_32px_rgba(28,28,25,0.1)] overflow-hidden relative">
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-[#c1c8c2] rounded-full" />
              </div>

              {/* Close */}
              <button
                onClick={hideMap}
                className="absolute top-3 right-4 z-[1000] w-8 h-8 bg-[#fcf9f4]/70 backdrop-blur-[24px] rounded-full flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5 text-[#1c1c19]" />
              </button>

              {/* Map */}
              <div className="h-full">
                <EcoHeartMap ref={mapRef} />
              </div>

              {/* Layer controls — bottom right */}
              <div className="absolute bottom-4 right-4 z-[1000]">
                <LayerControl />
              </div>

              <FeaturePopup onAskEcoHeart={onAskQuery} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
