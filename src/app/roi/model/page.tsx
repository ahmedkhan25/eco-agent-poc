"use client";

import { RotateCcw } from "lucide-react";
import { fmtMoney } from "@/lib/roi/engine";
import type { Confidence } from "@/lib/roi/defaults";
import { costTotals, useRoiStore } from "@/lib/roi/store";
import { NumberField, Stat, ink } from "@/components/roi/ui";

const CONF: Confidence[] = ["low", "medium", "high"];
const confTone: Record<Confidence, string> = {
  low: "bg-amber-50 text-amber-800",
  medium: "bg-slate-100 text-slate-700",
  high: "bg-teal-50 text-teal-800",
};

export default function RoiModel() {
  const st = useRoiStore();
  const groups = Array.from(new Set(st.assumptions.map((a) => a.group)));
  const t = costTotals(st.roles, st.run, st.offers);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-8">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className={`font-serif text-3xl italic ${ink}`}>Model & assumptions</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              The shared library every scenario starts from. Edit a value and every scenario that uses it updates. Low
              confidence means an estimate to confirm with the city, broker or insurer.
            </p>
          </div>
          <button
            onClick={st.resetAssumptions}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset to starting values
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Assumption</th>
                <th className="px-2 py-2 text-right font-medium">Cautious</th>
                <th className="px-2 py-2 text-right font-medium">Expected</th>
                <th className="px-2 py-2 text-right font-medium">Business case</th>
                <th className="px-2 py-2 font-medium">Confidence</th>
                <th className="px-2 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium">Owner</th>
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g}>
                <tr>
                  <td colSpan={7} className={`bg-[#F7F6F2] px-4 py-1.5 font-serif text-sm italic ${ink}`}>
                    {g}
                  </td>
                </tr>
                {st.assumptions
                  .filter((a) => a.group === g)
                  .map((a) => (
                    <tr key={a.key} className="border-t border-slate-100 align-middle">
                      <td className="px-4 py-2 text-slate-700">{a.label}</td>
                      {(["low", "expected", "high"] as const).map((f) => (
                        <td key={f} className="px-2 py-2">
                          <NumberField className="ml-auto w-28" unit={a.unit} value={a[f]} onChange={(v) => st.setAssumption(a.key, f, v)} />
                        </td>
                      ))}
                      <td className="px-2 py-2">
                        <select
                          value={a.confidence}
                          onChange={(e) => st.setAssumption(a.key, "confidence", e.target.value as Confidence)}
                          className={`rounded-md px-2 py-1 text-xs outline-none ${confTone[a.confidence]}`}
                        >
                          {CONF.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          value={a.source}
                          onChange={(e) => st.setAssumption(a.key, "source", e.target.value)}
                          className="w-full min-w-[200px] rounded-md border border-transparent bg-transparent px-1 py-1 text-xs text-slate-600 outline-none hover:border-slate-200 focus:border-teal-500"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={a.owner}
                          onChange={(e) => st.setAssumption(a.key, "owner", e.target.value)}
                          className="w-full min-w-[110px] rounded-md border border-transparent bg-transparent px-1 py-1 text-xs text-slate-600 outline-none hover:border-slate-200 focus:border-teal-500"
                        />
                      </td>
                    </tr>
                  ))}
              </tbody>
            ))}
          </table>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className={`font-serif text-2xl italic ${ink}`}>Our cost model</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Internal only. What an early partner project costs us to deliver, and the margin at the price we quote.
            </p>
          </div>
          <button
            onClick={st.resetCosts}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset costs
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4">
          <Stat big label="Team hours" value={t.hours.toLocaleString()} hint="12-week project" />
          <Stat big label="Team cost to us" value={fmtMoney(t.teamCost)} hint={`${fmtMoney(t.listValue)} at list rates`} />
          <Stat big label="Running cost" value={`$${t.runMonthly.toLocaleString()}/mo`} hint={`${fmtMoney(t.runYearly)} a year`} />
          <Stat
            big
            label="Margin at quoted price"
            value={`${Math.round(t.marginPct * 100)}%`}
            hint={`${fmtMoney(t.margin)} on ${fmtMoney(t.partnerPrice)}`}
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-2 py-2 text-right font-medium">Hours</th>
                  <th className="px-2 py-2 text-right font-medium">List $/h</th>
                  <th className="px-2 py-2 text-right font-medium">Our $/h</th>
                  <th className="px-4 py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {st.roles.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-700">{r.role}</td>
                    <td className="px-2 py-2">
                      <NumberField className="ml-auto w-20" unit="hours" value={r.hours} onChange={(v) => st.setRole(i, { hours: v || 0 })} />
                    </td>
                    <td className="px-2 py-2">
                      <NumberField className="ml-auto w-20" unit="$" value={r.listRate} onChange={(v) => st.setRole(i, { listRate: v || 0 })} />
                    </td>
                    <td className="px-2 py-2">
                      <NumberField className="ml-auto w-20" unit="$" value={r.internalRate} onChange={(v) => st.setRole(i, { internalRate: v || 0 })} />
                    </td>
                    <td className={`px-4 py-2 text-right tabular-nums ${ink}`}>{fmtMoney(r.hours * r.internalRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Running costs per month
              </div>
              {st.run.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-1.5 first:border-0">
                  <span className="text-sm text-slate-700">{r.item}</span>
                  <NumberField className="w-24" unit="$" value={r.monthly} onChange={(v) => st.setRun(i, { monthly: v || 0 })} />
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                What we offer
              </div>
              {st.offers.map((o, i) => (
                <div key={i} className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2 first:border-0">
                  <div className="min-w-0">
                    <div className={`text-sm font-medium ${ink}`}>{o.name}</div>
                    <div className="text-xs text-slate-500">
                      {o.weeks} · {o.notes}
                    </div>
                  </div>
                  <NumberField className="w-28 flex-none" unit="$" value={o.price} onChange={(v) => st.setOffer(i, { price: v || 0 })} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Margin = early partner project price − team cost − three months of running costs. Edits are saved in this browser
          for now; shared team storage comes next.
        </p>
      </section>
    </div>
  );
}
