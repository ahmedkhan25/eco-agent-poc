"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

// Image intrinsic aspect ratio: 2816x1536
const IMG_W = 2816;
const IMG_H = 1536;
const CELL_W = IMG_W / 3;
const CELL_H = IMG_H / 2;

export function NapkinViewer() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgBounds, setImgBounds] = useState<{ offsetX: number; offsetY: number; width: number; height: number } | null>(null);

  const goNext = useCallback(() => {
    setActive((prev) => (prev + 1) % NAPKINS.length);
  }, []);

  const goPrev = useCallback(() => {
    setActive((prev) => (prev - 1 + NAPKINS.length) % NAPKINS.length);
  }, []);

  // Compute where the image actually renders inside the object-contain container
  const updateBounds = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (cw === 0 || ch === 0) return;

    const containerAR = cw / ch;
    const imageAR = IMG_W / IMG_H;

    let renderW: number, renderH: number, offsetX: number, offsetY: number;
    if (containerAR > imageAR) {
      // Container is wider than image — letterboxed on sides
      renderH = ch;
      renderW = ch * imageAR;
      offsetX = (cw - renderW) / 2;
      offsetY = 0;
    } else {
      // Container is taller than image — letterboxed on top/bottom
      renderW = cw;
      renderH = cw / imageAR;
      offsetX = 0;
      offsetY = (ch - renderH) / 2;
    }
    setImgBounds({ offsetX, offsetY, width: renderW, height: renderH });
  }, []);

  useEffect(() => {
    updateBounds();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateBounds);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateBounds]);

  // Auto-advance every 8 seconds unless paused
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(goNext, 8000);
    return () => clearInterval(timer);
  }, [paused, goNext]);

  const napkin = NAPKINS[active];

  // Compute cell position relative to the container (in px), accounting for object-contain offset
  function getCellRect(col: number, row: number) {
    if (!imgBounds) return { left: 0, top: 0, width: 0, height: 0 };
    const cellW = imgBounds.width / 3;
    const cellH = imgBounds.height / 2;
    return {
      left: imgBounds.offsetX + col * cellW,
      top: imgBounds.offsetY + row * cellH,
      width: cellW,
      height: cellH,
    };
  }

  // Spotlight center as % of container
  function getSpotlightCenter(col: number, row: number) {
    if (!imgBounds || !containerRef.current) {
      const x = ((col * CELL_W + CELL_W / 2) / IMG_W) * 100;
      const y = ((row * CELL_H + CELL_H / 2) / IMG_H) * 100;
      return { x, y };
    }
    const rect = getCellRect(col, row);
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    return {
      x: ((rect.left + rect.width / 2) / cw) * 100,
      y: ((rect.top + rect.height / 2) / ch) * 100,
    };
  }

  const spot = getSpotlightCenter(napkin.col, napkin.row);
  const cellRect = getCellRect(napkin.col, napkin.row);

  return (
    <div
      className="w-full h-full flex flex-col"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Image with spotlight and overlaid description */}
      <div className="relative w-full flex-1 flex flex-col rounded-xl overflow-hidden border border-emerald-300/30 dark:border-emerald-700/30 shadow-lg">
        {/* Image + spotlight layer */}
        <div ref={containerRef} className="relative w-full flex-1 min-h-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/aha-images/final-full-six-images.png"
            alt="The Aha! Paradox — Six Steps"
            className="w-full h-full object-contain block"
            onLoad={updateBounds}
          />

          {/* Dark overlay with radial spotlight cutout */}
          <div
            className="absolute inset-0 transition-all duration-1000 ease-in-out"
            style={{
              background: `radial-gradient(ellipse 38% 55% at ${spot.x}% ${spot.y}%, transparent 0%, transparent 60%, rgba(0,0,0,0.65) 100%)`,
            }}
          />

          {/* Border around active napkin cell */}
          {imgBounds && (
            <div
              className="absolute transition-all duration-1000 ease-in-out pointer-events-none border-2 border-emerald-400/60"
              style={{
                left: `${cellRect.left}px`,
                top: `${cellRect.top}px`,
                width: `${cellRect.width}px`,
                height: `${cellRect.height}px`,
                boxShadow: "inset 0 0 30px 6px rgba(16,185,129,0.1)",
                borderRadius: "6px",
              }}
            />
          )}

          {/* Navigation arrows */}
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); setPaused(true); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white/90 hover:bg-black/70 transition-colors backdrop-blur-sm z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); setPaused(true); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white/90 hover:bg-black/70 transition-colors backdrop-blur-sm z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Description bar — below image, inside the border */}
        <div className="bg-slate-900 px-8 py-5 flex-shrink-0">
          <div className="flex items-center gap-5">
            <div className="flex gap-2 items-center flex-shrink-0">
              {NAPKINS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setActive(i); setPaused(true); }}
                  className={`rounded-full transition-all duration-300 ${
                    i === active
                      ? "w-8 h-3 bg-emerald-400"
                      : "w-3 h-3 bg-white/30 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>
            <div className="h-8 w-px bg-slate-700 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xl font-bold text-white leading-tight">
                Step {active + 1}: {napkin.title}
                <span className="font-medium text-emerald-400 ml-2">
                  — {napkin.subtitle}
                </span>
              </p>
              <p className="text-lg text-white/70 mt-1.5 leading-relaxed">
                {napkin.desc}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
