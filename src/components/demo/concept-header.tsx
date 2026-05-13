"use client";

import { Sparkles } from "lucide-react";

interface Props {
  tag: string;
  title: string;
  subtitle: string;
  badge?: string;
  right?: React.ReactNode;
}

export function ConceptHeader({ tag, title, subtitle, badge = "Phase-2 concept · seeded data", right }: Props) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)]">
            {tag}
          </span>
          <span className="demo-chip demo-chip-coral inline-flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5" />
            {badge}
          </span>
        </div>
        <h1 className="demo-display text-3xl font-semibold leading-tight">{title}</h1>
        <p className="text-sm text-[var(--hw-slate-700)] mt-1.5 max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
