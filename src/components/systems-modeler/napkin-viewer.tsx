"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const NAPKINS = [
  {
    title: "The Anchor",
    subtitle: "The Load-Bearing Delusion",
    desc: "Identify the comfortable lie — the assumption or 'common wisdom' that holds the status quo together and prevents change.",
    col: 0,
    row: 0,
  },
  {
    title: "The Default",
    subtitle: "The Status Quo",
    desc: "See how the standard, logical path people take inadvertently feeds the Delusion and keeps the system stuck.",
    col: 1,
    row: 0,
  },
  {
    title: "The Bottleneck",
    subtitle: "The Constraint",
    desc: "Forbid the most common tools and concepts. Strip labels — there are no 'things,' only processes. Force new shape.",
    col: 2,
    row: 0,
  },
  {
    title: "The Collision",
    subtitle: "The Isomorph",
    desc: "Find the structural match through collision with a completely unrelated concept. Use Scale-Shift or Biological Shift.",
    col: 0,
    row: 1,
  },
  {
    title: "The Reversal",
    subtitle: "The Truth",
    desc: "Flip the core assumption on its head. Treat the 'truth' as a lie and the 'lie' as the truth.",
    col: 1,
    row: 1,
  },
  {
    title: "The Commitment Filter",
    subtitle: "The Stop Rule",
    desc: "What must you STOP doing immediately to align with this new reality? Trigger the First Domino.",
    col: 2,
    row: 1,
  },
];

// Spotlight center position (% of image) for each napkin in the 3x2 grid
// Image is 2816x1536, each cell ~938x768
function getSpotlightCenter(col: number, row: number) {
  const x = ((col * 938 + 469) / 2816) * 100;
  const y = ((row * 768 + 384) / 1536) * 100;
  return { x, y };
}

export function NapkinViewer() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const goNext = useCallback(() => {
    setActive((prev) => (prev + 1) % NAPKINS.length);
  }, []);

  const goPrev = useCallback(() => {
    setActive((prev) => (prev - 1 + NAPKINS.length) % NAPKINS.length);
  }, []);

  // Auto-advance every 4.5 seconds unless paused
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(goNext, 4500);
    return () => clearInterval(timer);
  }, [paused, goNext]);

  const napkin = NAPKINS[active];
  const spot = getSpotlightCenter(napkin.col, napkin.row);

  return (
    <div
      className="w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Full image with spotlight overlay */}
      <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg">
        {/* Full napkin image — show entire 3x2 grid */}
        <div className="relative w-full" style={{ aspectRatio: "2816 / 1536" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/aha-images/final-full-six-images.png"
            alt="The Aha! Paradox — Six Steps"
            className="w-full h-full object-cover"
          />

          {/* Dark overlay with radial spotlight cutout */}
          <div
            className="absolute inset-0 transition-all duration-1000 ease-in-out"
            style={{
              background: `radial-gradient(ellipse 38% 55% at ${spot.x}% ${spot.y}%, transparent 0%, transparent 60%, rgba(0,0,0,0.75) 100%)`,
            }}
          />

          {/* Subtle glow ring around active napkin */}
          <div
            className="absolute w-[33.33%] h-[50%] transition-all duration-1000 ease-in-out pointer-events-none"
            style={{
              left: `${napkin.col * 33.33}%`,
              top: `${napkin.row * 50}%`,
              boxShadow: "inset 0 0 30px 5px rgba(239,68,68,0.15)",
              borderRadius: "8px",
            }}
          />

          {/* Step number badge */}
          <div
            className="absolute transition-all duration-700 ease-in-out"
            style={{
              left: `${napkin.col * 33.33 + 2}%`,
              top: `${napkin.row * 50 + 4}%`,
            }}
          >
            <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
              {active + 1} / 6
            </div>
          </div>
        </div>

        {/* Navigation arrows */}
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); setPaused(true); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white/90 hover:bg-black/70 transition-colors backdrop-blur-sm"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); setPaused(true); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white/90 hover:bg-black/70 transition-colors backdrop-blur-sm"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Dot indicators at bottom */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-2 py-1">
          {NAPKINS.map((_, i) => (
            <button
              key={i}
              onClick={() => { setActive(i); setPaused(true); }}
              className={`rounded-full transition-all duration-300 ${
                i === active
                  ? "w-5 h-1.5 bg-red-400"
                  : "w-1.5 h-1.5 bg-white/50 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Description card below */}
      <div className="mt-3 p-3 bg-red-50/80 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <p className="text-sm font-semibold text-red-800 dark:text-red-200">
          {napkin.title}{" "}
          <span className="font-normal text-red-600 dark:text-red-400">
            — {napkin.subtitle}
          </span>
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
          {napkin.desc}
        </p>
      </div>
    </div>
  );
}
