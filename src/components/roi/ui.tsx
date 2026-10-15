"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, Download, ExternalLink, XCircle } from "lucide-react";
import { EcoheartLogo } from "@/components/ecoheart-logo";
import type { Resource } from "@/lib/roi/about";
import type { GuideStep } from "@/lib/roi/guide";
import { fmtMoney, type RoiResult } from "@/lib/roi/engine";
import { BASIS_LABEL, type Basis } from "@/lib/roi/defaults";
import { PAYER_LABEL, type Payer } from "@/lib/roi/pricing";
import type { Check } from "@/lib/roi/validate";
import { download, type Workbook } from "@/lib/roi/export";

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

const COST_SHADES = ["bg-slate-700", "bg-slate-500", "bg-slate-400", "bg-slate-300", "bg-slate-600", "bg-slate-200"];
const SPEND_SHADES = ["bg-teal-300", "bg-teal-200", "bg-cyan-300"];

/** Colour for each bar segment: client costs in slate, what the client spends in teal. */
export function barColors(r: RoiResult) {
  const colors: Record<string, string> = {};
  let c = 0;
  let s = 0;
  for (const l of r.lines) {
    if (l.key === "fee") colors[l.key] = "bg-teal-600";
    else if (l.today > 0) colors[l.key] = COST_SHADES[c++ % COST_SHADES.length];
    else colors[l.key] = SPEND_SHADES[s++ % SPEND_SHADES.length];
  }
  return colors;
}

/** Today vs with the Advisor, as two stacked bars. */
export function CostBars({ r }: { r: RoiResult }) {
  const max = Math.max(r.today, r.withAdvisor, 1);
  const colors = barColors(r);
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

export function CostLegend({ r }: { r: RoiResult }) {
  const colors = barColors(r);
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
      {r.lines
        .filter((l) => l.today > 0 || l.withAdvisor > 0)
        .map((l) => (
          <span key={l.key} className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-sm ${colors[l.key]}`} />
            {l.label}
          </span>
        ))}
    </div>
  );
}

const PAYER_TONE: Record<Payer, string> = {
  client: "bg-slate-600",
  ecoheart: "bg-teal-600",
  partner: "bg-amber-400",
  grant: "bg-indigo-400",
};

/** Who covers the year-one cost: client, partners, grants. */
export function WhoPaysBar({ items }: { items: { payer: Payer; label: string; amount: number }[] }) {
  const total = items.reduce((s, x) => s + x.amount, 0) || 1;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
        {items.map((x, i) => (
          <div key={i} className={PAYER_TONE[x.payer]} style={{ width: `${(x.amount / total) * 100}%` }} title={`${x.label}: ${fmtMoney(x.amount)}`} />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
        {items.map((x, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-sm ${PAYER_TONE[x.payer]}`} />
            {PAYER_LABEL[x.payer]}
            {x.payer !== "client" ? ` (${x.label})` : ""}: <b className={`font-medium ${ink}`}>{fmtMoney(x.amount)}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

const LEVEL_ICON = {
  pass: <CheckCircle2 className="h-4 w-4 flex-none text-teal-600" />,
  warn: <AlertTriangle className="h-4 w-4 flex-none text-amber-500" />,
  fail: <XCircle className="h-4 w-4 flex-none text-red-500" />,
};

/** List of validation checks, problems first. */
export function ChecksList({ checks, showPass = true, compact }: { checks: Check[]; showPass?: boolean; compact?: boolean }) {
  const order = { fail: 0, warn: 1, pass: 2 };
  const list = [...checks].filter((c) => showPass || c.level !== "pass").sort((a, b) => order[a.level] - order[b.level]);
  if (!list.length) return <div className="text-xs text-slate-500">Nothing to flag.</div>;
  return (
    <ul className={compact ? "space-y-1" : "space-y-2"}>
      {list.map((c) => (
        <li key={c.id} className="flex gap-2 text-xs">
          {LEVEL_ICON[c.level]}
          <div className="min-w-0">
            <div className={`${c.level === "pass" ? "text-slate-600" : `font-medium ${ink}`}`}>{c.title}</div>
            {!compact && c.detail && <div className="text-slate-500">{c.detail}</div>}
            {!compact && c.fix && c.level !== "pass" && <div className="text-teal-700">Fix: {c.fix}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ChecksBadge({ checks }: { checks: Check[] }) {
  const fail = checks.filter((c) => c.level === "fail").length;
  const warn = checks.filter((c) => c.level === "warn").length;
  if (!fail && !warn)
    return <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800 ring-1 ring-teal-200">All checks pass</span>;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${fail ? "bg-red-50 text-red-700 ring-red-200" : "bg-amber-50 text-amber-800 ring-amber-200"}`}>
      {fail ? `${fail} to fix` : ""}
      {fail && warn ? " · " : ""}
      {warn ? `${warn} to check` : ""}
    </span>
  );
}

/** Where a value comes from for a client. */
export function SourceChip({ from }: { from: "library" | "client" | "proposed" }) {
  if (from === "client") return <span className="rounded bg-teal-50 px-1 text-[10px] text-teal-800">client's own</span>;
  if (from === "proposed") return <span className="rounded bg-amber-50 px-1 text-[10px] text-amber-800">proposed, to confirm</span>;
  return <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-500">library</span>;
}

/** Compact card used inside the chat (generative UI). */
export function MiniScenario({
  name,
  city,
  basis,
  r,
  onOpen,
  useCases,
}: {
  name: string;
  city?: string;
  basis: Basis;
  r: RoiResult;
  onOpen?: () => void;
  useCases?: string;
}) {
  const h = headline(r);
  return (
    <div className="my-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`truncate text-sm font-semibold ${ink}`}>{name}</div>
          {city && <div className="text-xs text-slate-500">{city}</div>}
          {useCases && <div className="text-[11px] text-teal-700">{useCases}</div>}
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

/** CSV and Excel download buttons for a table set from lib/roi/export. */
export function ExportButtons({ get, label = "Export", internal }: { get: () => Workbook | null; label?: string; internal?: boolean }) {
  const run = async (format: "csv" | "xlsx") => {
    const wb = get();
    if (wb) await download(wb, format);
  };
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500" title={internal ? "Internal: includes our costs and margin" : undefined}>
      <Download className="h-3.5 w-3.5" />
      {label}
      <button onClick={() => run("csv")} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 hover:border-teal-400 hover:text-teal-800">
        CSV
      </button>
      <button onClick={() => run("xlsx")} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 hover:border-teal-400 hover:text-teal-800">
        Excel
      </button>
    </span>
  );
}
