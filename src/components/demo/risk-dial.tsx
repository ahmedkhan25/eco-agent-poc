"use client";

import { motion } from "framer-motion";

interface Props {
  label: string;
  score: number; // 0-100
  blurb?: string;
}

function colorFor(score: number) {
  if (score >= 80) return "#e11d48";
  if (score >= 60) return "#F4A261";
  if (score >= 30) return "#f59e0b";
  return "#10b981";
}

function tierFor(score: number) {
  if (score >= 80) return "Extreme";
  if (score >= 60) return "Severe";
  if (score >= 30) return "Major";
  return "Minor";
}

export function RiskDial({ label, score, blurb }: Props) {
  const color = colorFor(score);
  const tier = tierFor(score);
  // SVG circle: r=42, circumference ≈ 263.9
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="demo-card p-4 flex flex-col items-center">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-2">
        {label}
      </div>
      <div className="relative w-28 h-28">
        <svg width={112} height={112} viewBox="0 0 112 112">
          <circle
            cx={56}
            cy={56}
            r={r}
            fill="none"
            stroke="var(--hw-slate-200)"
            strokeWidth={10}
          />
          <motion.circle
            cx={56}
            cy={56}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            transform="rotate(-90 56 56)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="demo-display text-2xl font-semibold">{score}</span>
          <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color }}>
            {tier}
          </span>
        </div>
      </div>
      {blurb && (
        <p className="mt-2 text-xs text-[var(--hw-slate-500)] text-center leading-snug">
          {blurb}
        </p>
      )}
    </div>
  );
}
