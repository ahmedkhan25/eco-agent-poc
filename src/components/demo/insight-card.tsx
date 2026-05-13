"use client";

import { Sparkles, ExternalLink } from "lucide-react";
import { useState } from "react";

interface Source {
  doc: string;
  section?: string;
  page?: string;
  quote?: string;
}

interface Props {
  headline: string;
  body?: React.ReactNode;
  sources?: Source[];
  badge?: string;
  variant?: "default" | "teal" | "coral" | "amber";
}

export function InsightCard({
  headline,
  body,
  sources,
  badge = "RAG-cited",
  variant = "default",
}: Props) {
  const [open, setOpen] = useState(false);

  const accent =
    variant === "teal"
      ? "var(--hw-teal)"
      : variant === "coral"
        ? "var(--hw-coral)"
        : variant === "amber"
          ? "var(--hw-amber)"
          : "var(--hw-slate-700)";

  return (
    <div className="demo-card p-4">
      <div className="flex items-start gap-3">
        <div
          className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: accent + "1a", color: accent }}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="demo-chip"
              style={{
                backgroundColor: accent + "1a",
                color: accent,
                borderColor: "transparent",
              }}
            >
              {badge}
            </span>
            {sources && sources.length > 0 && (
              <button
                onClick={() => setOpen((o) => !o)}
                className="text-[11px] text-[var(--hw-slate-500)] hover:text-[var(--hw-teal)] inline-flex items-center gap-1"
              >
                {sources.length} source{sources.length > 1 ? "s" : ""}
                <ExternalLink className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
          <h4 className="demo-display text-sm font-semibold leading-snug">
            {headline}
          </h4>
          {body && <div className="mt-1.5 text-xs text-[var(--hw-slate-700)] leading-relaxed">{body}</div>}
          {open && sources && (
            <div className="mt-3 pt-3 border-t border-[var(--hw-slate-200)] space-y-2">
              {sources.map((s, i) => (
                <div key={i} className="text-xs">
                  <div className="font-medium text-[var(--hw-slate-900)]">
                    {s.doc}
                    {s.section && (
                      <span className="text-[var(--hw-slate-500)] font-normal">
                        {" "}· {s.section}
                      </span>
                    )}
                    {s.page && (
                      <span className="text-[var(--hw-slate-500)] font-normal">
                        {" "}· p. {s.page}
                      </span>
                    )}
                  </div>
                  {s.quote && (
                    <div className="mt-1 text-[var(--hw-slate-700)] italic">
                      "{s.quote}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
