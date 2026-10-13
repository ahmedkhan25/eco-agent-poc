"use client";

import { useEffect, useState } from "react";

interface ProgressOverlayProps {
  isVisible: boolean;
  message: string;
  percent: number;
}

export function ProgressOverlay({ isVisible, message, percent }: ProgressOverlayProps) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#0f172a]/80 backdrop-blur-sm">
      <div className="w-full max-w-md mx-8">
        {/* Card */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6 shadow-2xl">
          {/* Animated icon */}
          <div className="flex justify-center mb-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-[#334155]" />
              <div
                className="absolute inset-0 rounded-full border-2 border-t-[#2dd4bf] border-r-transparent border-b-transparent border-l-transparent animate-spin"
              />
              <div className="absolute inset-2 rounded-full bg-[#2dd4bf]/10 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[#2dd4bf] animate-pulse" />
              </div>
            </div>
          </div>

          {/* Message */}
          <p className="text-center text-sm text-[#e2e8f0] mb-4 min-h-[20px]">
            {message}{dots}
          </p>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-[#334155] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${percent}%`,
                background: "linear-gradient(90deg, #2dd4bf, #4ecdc4)",
              }}
            />
          </div>

          {/* Percentage */}
          <p className="text-center text-xs text-[#94a3b8] mt-2">
            {Math.round(percent)}%
          </p>
        </div>
      </div>
    </div>
  );
}
