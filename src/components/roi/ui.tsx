"use client";

import { ArrowRight, ExternalLink } from "lucide-react";
import { EcoheartLogo } from "@/components/ecoheart-logo";
import type { Resource } from "@/lib/roi/about";
import type { GuideStep } from "@/lib/roi/guide";
import { fmtMoney, type RoiResult } from "@/lib/roi/engine";
import { BASIS_LABEL, type Basis } from "@/lib/roi/defaults";

export const ink = "text-[#0F172A]";

export function BasisPill({ basis }: { basis: Basis }) {
  const tone =
    basis === "low"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : basis === "high"
        ? "bg-indigo-50 text-indigo-800 ring-indigo-200"
        : "bg-teal-50 text-teal-800 ring-teal-200";
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${tone}`}>
      {BASIS_LABEL[basis]}
    </span>
  );
}

export function Stat({ label, value, hint, big }: { label: string; value: string; hint?: string; big?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`${ink} font-serif ${big ? "text-3xl" : "text-xl"} leading-tight`}>{value}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function headline(r: RoiResult) {
  return {
    net: fmtMoney(r.net),
    perDollar: `$${r.returnPerDollar.toFixed(1)}`,
    payback: r.paybackMonths ? `${r.paybackMonths} mo` : "n/a",
  };
}

/** Today vs with the Advisor, as two stacked bars. */
export function CostBars({ r }: { r: RoiResult }) {
  const max = Math.max(r.today, r.withAdvisor, 1);
  const colors: Record<string, string> = {
    prem: "bg-slate-700",
    claims: "bg-slate-500",
    ded: "bg-slate-400",
    ot: "bg-slate-300",
    fee: "bg-teal-600",
    grants: "bg-teal-300",
  };
  const row = (label: string, which: "today" | "withAdvisor", total: number) => (
    <div className="flex items-center gap-2">
      <div className="w-24 flex-none text-xs text-slate-500">{label}</div>
      <div className="flex h-4 flex-1 overflow-hidden rounded-sm bg-slate-100">
        {r.lines.map((l) =>
          l[which] > 0 ? (
            <div
              key={l.key}
              title={`${l.label}: ${fmtMoney(l[which])}`}
              className={colors[l.key]}
              style={{ width: `${(l[which] / max) * 100}%` }}
            />
          ) : null
        )}
      </div>
      <div className={`w-14 flex-none text-right text-xs font-medium ${ink}`}>{fmtMoney(total)}</div>
    </div>
  );
  return (
    <div className="space-y-1.5">
      {row("Today", "today", r.today)}
      {row("With Advisor", "withAdvisor", r.withAdvisor)}
    </div>
  );
}

/** Compact card used inside the chat (generative UI). */
export function MiniScenario({
  name,
  city,
  basis,
  r,
  onOpen,
}: {
  name: string;
  city?: string;
  basis: Basis;
  r: RoiResult;
  onOpen?: () => void;
}) {
  const h = headline(r);
  return (
    <div className="my-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`truncate text-sm font-semibold ${ink}`}>{name}</div>
          {city && <div className="text-xs text-slate-500">{city}</div>}
        </div>
        <BasisPill basis={basis} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Net year one" value={h.net} />
        <Stat label="Back per $1" value={h.perDollar} />
        <Stat label="Payback" value={h.payback} />
      </div>
      <div className="mt-2">
        <CostBars r={r} />
      </div>
      {onOpen && (
        <button onClick={onOpen} className="mt-2 text-xs font-medium text-teal-700 hover:underline">
          Open on canvas
        </button>
      )}
    </div>
  );
}

export function Working({ text }: { text: string }) {
  return (
    <div className="my-1 flex items-center gap-2 text-xs text-slate-500">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500" />
      {text}
    </div>
  );
}

export function NumberField({
  value,
  onChange,
  unit,
  className = "",
  changed,
}: {
  value: number;
  onChange: (v: number) => void;
  unit: string;
  className?: string;
  changed?: boolean;
}) {
  return (
    <div className={`flex items-center rounded-md border ${changed ? "border-teal-500 bg-teal-50/50" : "border-slate-200 bg-white"} px-2 ${className}`}>
      {unit === "$" && <span className="text-xs text-slate-400">$</span>}
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full min-w-0 bg-transparent py-1 text-right text-sm tabular-nums outline-none ${ink}`}
      />
      {unit === "%" && <span className="text-xs text-slate-400">%</span>}
      {unit === "hours" && <span className="ml-1 text-xs text-slate-400">h</span>}
    </div>
  );
}

/** Link cards the agent shares in the chat, with the ecoheart mark. */
export function LinkCards({ items, note }: { items: Resource[]; note?: string }) {
  return (
    <div className="my-2 space-y-2">
      {note && <div className="text-xs text-slate-500">{note}</div>}
      {items.map((r) => {
        const body = (
          <>
            <EcoheartLogo className="h-6 w-6 flex-none" />
            <div className="min-w-0 flex-1">
              <div className={`text-sm font-semibold ${ink}`}>{r.title}</div>
              <div className="text-xs text-slate-500">{r.description}</div>
            </div>
            {r.ready === false ? (
              <span className="flex-none rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-amber-200">
                Coming soon
              </span>
            ) : r.external ? (
              <ExternalLink className="h-4 w-4 flex-none text-slate-400" />
            ) : (
              <ArrowRight className="h-4 w-4 flex-none text-slate-400" />
            )}
          </>
        );
        const cls = "flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm";
        if (r.ready === false) return <div key={r.id} className={cls}>{body}</div>;
        return (
          <a
            key={r.id}
            href={r.href}
            target={r.external ? "_blank" : undefined}
            rel={r.external ? "noopener noreferrer" : undefined}
            className={`${cls} transition hover:border-teal-400`}
          >
            {body}
          </a>
        );
      })}
    </div>
  );
}

/** Step-by-step how-to card the agent shows in the chat. */
export function GuideCard({ steps }: { steps: GuideStep[] }) {
  return (
    <div className="my-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <EcoheartLogo className="h-5 w-5" />
        <div className={`text-sm font-semibold ${ink}`}>
          How to use the <span className="font-serif italic text-teal-700">ROI Advisor</span>
        </div>
      </div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-teal-600 text-[11px] font-semibold text-white">
              {i + 1}
            </span>
            <div className="min-w-0 text-xs leading-relaxed text-slate-600">
              <b className={`font-semibold ${ink}`}>{s.title}.</b> {s.body}
              {s.href && (
                <a href={s.href} className="ml-1 text-teal-700 hover:underline">
                  Open
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
