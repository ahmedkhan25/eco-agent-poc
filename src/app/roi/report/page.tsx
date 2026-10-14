"use client";

import { Printer } from "lucide-react";
import { EcoheartLogo } from "@/components/ecoheart-logo";
import { fmtMoney } from "@/lib/roi/engine";
import { BASIS_LABEL } from "@/lib/roi/defaults";
import { scenarioInputs, scenarioResult, useRoiStore } from "@/lib/roi/store";
import { CostBars, Stat, headline, ink } from "@/components/roi/ui";

function fmtInput(v: number, unit: string) {
  if (unit === "$") return fmtMoney(v);
  if (unit === "%") return `${v}%`;
  if (unit === "hours") return `${v.toLocaleString()} h`;
  return v.toLocaleString();
}

export default function RoiReport() {
  const st = useRoiStore();
  const scenario =
    st.scenarios.find((s) => s.id === st.report?.scenarioId) ??
    st.scenarios.find((s) => s.id === st.activeId) ??
    st.scenarios[0];

  if (!scenario) {
    return <div className="p-10 text-sm text-slate-500">Create a scenario first, then ask the Advisor for a report.</div>;
  }

  const draft = st.report?.scenarioId === scenario.id ? st.report : null;
  const r = scenarioResult(scenario, st.assumptions);
  const inputs = scenarioInputs(scenario, st.assumptions);
  const h = headline(r);
  const unsure = st.assumptions.filter((a) => a.confidence === "low" && inputs[a.key] !== 0);
  const summary =
    draft?.summary ||
    `For ${scenario.city}, the ${BASIS_LABEL[scenario.basis].toLowerCase()} case shows about ${h.net} in net value in the first year, or ${h.perDollar} back for every dollar spent, paying back in ${h.payback}. The biggest driver is ${r.drivers[0]?.label.toLowerCase()}. The least certain numbers are marked below and should be confirmed with the city before this is shared.`;
  const nextSteps = Array.isArray(draft?.nextSteps) && draft.nextSteps.length
    ? draft.nextSteps
    : ["Confirm the premium, claims and deductible figures with the city's risk manager", "Check the premium credit with the city's broker", "Agree the focus area and success measures for an early partner project"];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 print:max-w-none print:p-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Scenario</span>
          <select
            value={scenario.id}
            onChange={(e) => st.setReport({ scenarioId: e.target.value, audience: "City leadership", summary: "", nextSteps: [], createdAt: Date.now() })}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
          >
            {st.scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          <Printer className="h-4 w-4" /> Print or save as PDF
        </button>
      </div>

      <article className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-10 print:border-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <EcoheartLogo className="h-6 w-6" />
              <span className={`font-bold ${ink}`}>ecoheart</span>
            </div>
            <h1 className={`mt-4 font-serif text-3xl italic ${ink}`}>What resilience pays back</h1>
            <p className="mt-1 text-sm text-slate-500">
              {scenario.city} · {scenario.name} · {BASIS_LABEL[scenario.basis]} case
              {draft?.audience ? ` · prepared for ${draft.audience}` : ""}
            </p>
          </div>
          <div className="text-right text-xs text-slate-400">
            Draft
            <br />
            {new Date(draft?.createdAt || Date.now()).toLocaleDateString()}
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat big label="Net value, year one" value={h.net} />
          <Stat big label="Back per $1 spent" value={h.perDollar} />
          <Stat big label="Payback" value={h.payback} />
          <Stat big label="City spends" value={fmtMoney(r.spent)} />
        </section>

        <section>
          <h2 className={`mb-2 font-serif text-xl ${ink}`}>In short</h2>
          <p className="text-sm leading-relaxed text-slate-700">{summary}</p>
        </section>

        <section>
          <h2 className={`mb-3 font-serif text-xl ${ink}`}>Yearly costs, today and with the Advisor</h2>
          <CostBars r={r} />
          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-1 font-medium">Line</th>
                <th className="py-1 text-right font-medium">Today</th>
                <th className="py-1 text-right font-medium">With Advisor</th>
              </tr>
            </thead>
            <tbody>
              {r.lines.map((l) => (
                <tr key={l.key} className="border-t border-slate-100">
                  <td className="py-1.5 text-slate-700">{l.label}</td>
                  <td className="py-1.5 text-right tabular-nums">{fmtMoney(l.today)}</td>
                  <td className="py-1.5 text-right tabular-nums">{fmtMoney(l.withAdvisor)}</td>
                </tr>
              ))}
              <tr className="border-t border-slate-300">
                <td className="py-1.5 text-slate-700">Staff time freed up</td>
                <td />
                <td className="py-1.5 text-right tabular-nums">−{fmtMoney(r.staffValue)}</td>
              </tr>
              <tr className={`border-t border-slate-300 font-semibold ${ink}`}>
                <td className="py-1.5">Net value</td>
                <td />
                <td className="py-1.5 text-right tabular-nums">{h.net}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div>
            <h2 className={`mb-2 font-serif text-xl ${ink}`}>Still to confirm</h2>
            <ul className="space-y-1.5 text-sm text-slate-700">
              {unsure.map((a) => (
                <li key={a.key}>
                  <b className="font-medium">{a.label}</b>: {fmtInput(inputs[a.key], a.unit)}
                  <span className="block text-xs text-slate-500">
                    {a.source}. Owner: {a.owner}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className={`mb-2 font-serif text-xl ${ink}`}>Next steps</h2>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
              {nextSteps.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ol>
          </div>
        </section>

        <footer className="border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
          These are planning estimates from ecoheart's ROI calculator, built on the assumptions listed. They are not a
          guarantee of savings. City staff make the decisions; the Advisor helps them see the numbers faster.
        </footer>
      </article>
    </div>
  );
}
