"use client";

import { Printer } from "lucide-react";
import { EcoheartLogo } from "@/components/ecoheart-logo";
import { fmtMoney, keysFor } from "@/lib/roi/engine";
import { BASIS_LABEL } from "@/lib/roi/defaults";
import { clientNoun } from "@/lib/roi/pricing";
import { clientDeal, modelsFor, resolveKey, scenarioInputs, scenarioResult, useRoiStore } from "@/lib/roi/store";
import { validateScenario } from "@/lib/roi/validate";
import { ChecksBadge, ChecksList, CostBars, CostLegend, Stat, WhoPaysBar, headline, ink } from "@/components/roi/ui";

function fmtInput(v: number, unit: string) {
  if (unit === "$") return fmtMoney(v);
  if (unit === "%") return `${v}%`;
  if (unit === "hours") return `${v.toLocaleString()} h`;
  return v.toLocaleString();
}

export default function RoiReport() {
  const st = useRoiStore();
  const scenario = st.scenarios.find((s) => s.id === st.report?.scenarioId) ?? st.scenarios.find((s) => s.id === st.activeId) ?? st.scenarios[0];

  if (!scenario) return <div className="p-10 text-sm text-slate-500">Create a scenario first, then ask the Advisor for a report.</div>;

  const draft = st.report?.scenarioId === scenario.id ? st.report : null;
  const client = st.clients.find((c) => c.id === scenario.clientId);
  const noun = clientNoun(client?.type);
  const models = modelsFor(scenario.modelIds, st);
  const r = scenarioResult(scenario, st);
  const inputs = scenarioInputs(scenario, st);
  const deal = clientDeal(scenario.clientId, st);
  const checks = validateScenario(scenario, st);
  const h = headline(r);
  const keys = keysFor(models);
  const toConfirm = keys
    .map((k) => ({ k, rk: resolveKey(k, scenario.basis, scenario.clientId, st) }))
    .filter(({ k, rk }) => !(k in scenario.overrides) && inputs[k] !== 0 && (rk.confidence === "low" || rk.from === "proposed" || (rk.from === "library" && client?.id !== "hollywood" && rk.a?.unit === "$")));
  const useCaseNames = models.map((m) => m.name.toLowerCase()).join(" and ");
  const summary =
    draft?.summary ||
    `For ${client?.name ?? "the client"}, the ${BASIS_LABEL[scenario.basis].toLowerCase()} case for ${useCaseNames} shows about ${h.net} in net value in the first year, or ${h.perDollar} back for every dollar spent, paying back in ${h.payback}. The biggest driver is ${r.drivers[0]?.label.toLowerCase()}. The least certain numbers are listed below and should be confirmed with the ${noun} before this is shared.`;
  const nextSteps =
    Array.isArray(draft?.nextSteps) && draft.nextSteps.length
      ? draft.nextSteps
      : [`Confirm the numbers listed under "still to confirm" with the ${noun}'s staff`, "Agree the focus area and how success will be measured", "Shape an early partner project together"];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 print:max-w-none print:p-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Scenario</span>
          <select
            value={scenario.id}
            onChange={(e) => st.setReport({ scenarioId: e.target.value, audience: "Leadership", summary: "", nextSteps: [], createdAt: Date.now() })}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
          >
            {st.scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <ChecksBadge checks={checks} />
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
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
              {client?.name} · {models.map((m) => m.name).join(" + ")} · {BASIS_LABEL[scenario.basis]} case
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
          <Stat big label={`The ${noun} spends`} value={fmtMoney(r.spent)} />
        </section>

        <section>
          <h2 className={`mb-2 font-serif text-xl ${ink}`}>In short</h2>
          <p className="text-sm leading-relaxed text-slate-700">{summary}</p>
        </section>

        <section>
          <h2 className={`mb-3 font-serif text-xl ${ink}`}>Yearly costs, today and with the Advisor</h2>
          <CostBars r={r} />
          <CostLegend r={r} />
          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-1 font-medium">Where the value comes from</th>
                <th className="py-1 font-medium">Use case</th>
                <th className="py-1 text-right font-medium">Year one</th>
              </tr>
            </thead>
            <tbody>
              {r.drivers.map((d) => (
                <tr key={`${d.model}-${d.id}`} className="border-t border-slate-100">
                  <td className="py-1.5 text-slate-700">{d.label}</td>
                  <td className="py-1.5 text-xs text-slate-500">{models.find((m) => m.id === d.model)?.name}</td>
                  <td className="py-1.5 text-right tabular-nums">{fmtMoney(d.value)}</td>
                </tr>
              ))}
              <tr className="border-t border-slate-300">
                <td className="py-1.5 text-slate-700">Total value</td>
                <td />
                <td className="py-1.5 text-right tabular-nums">{fmtMoney(r.saved)}</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="py-1.5 text-slate-700">What the {noun} spends</td>
                <td className="py-1.5 text-xs text-slate-500">{r.clientCosts ? `${fmtMoney(r.fee)} ecoheart + ${fmtMoney(r.clientCosts)} own` : "ecoheart"}</td>
                <td className="py-1.5 text-right tabular-nums">−{fmtMoney(r.spent)}</td>
              </tr>
              <tr className={`border-t border-slate-300 font-semibold ${ink}`}>
                <td className="py-1.5">Net value</td>
                <td />
                <td className="py-1.5 text-right tabular-nums">{h.net}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {deal && deal.whoPaysYear1.some((x) => x.payer !== "client") && (
          <section>
            <h2 className={`mb-3 font-serif text-xl ${ink}`}>Who covers year one</h2>
            <WhoPaysBar items={deal.whoPaysYear1} />
          </section>
        )}

        {r.outcomes.length > 0 && (
          <section>
            <h2 className={`mb-2 font-serif text-xl ${ink}`}>Other outcomes</h2>
            <ul className="space-y-1 text-sm text-slate-700">
              {r.outcomes.map((o) => (
                <li key={o.label}>
                  <b className="font-medium">{o.value.toLocaleString()}</b> {o.label.toLowerCase()} (not counted in the dollar figures)
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="grid gap-6 md:grid-cols-2">
          <div>
            <h2 className={`mb-2 font-serif text-xl ${ink}`}>Still to confirm</h2>
            {toConfirm.length === 0 && <p className="text-sm text-slate-500">Nothing flagged.</p>}
            <ul className="space-y-1.5 text-sm text-slate-700">
              {toConfirm.map(({ k, rk }) => (
                <li key={k}>
                  <b className="font-medium">{rk.a?.label ?? k}</b>: {fmtInput(inputs[k], rk.a?.unit ?? "")}
                  {rk.from === "proposed" && <span className="ml-1 text-xs text-amber-700">(found by the Advisor, to confirm)</span>}
                  {rk.from === "library" && client?.id !== "hollywood" && <span className="ml-1 text-xs text-amber-700">(placeholder)</span>}
                  <span className="block text-xs text-slate-500">
                    {rk.source || "No source yet"}. Owner: {rk.owner || "to assign"}
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
          guarantee of savings. The {noun}'s staff make the decisions; the Advisor helps them see the numbers faster.
        </footer>
      </article>

      <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-5 print:hidden">
        <div className="mb-2 flex items-center gap-2">
          <h2 className={`font-serif text-lg ${ink}`}>Team checks</h2>
          <span className="text-xs text-slate-500">Not printed. Fix or explain these before sending.</span>
        </div>
        <ChecksList checks={checks} showPass={false} />
      </section>
    </div>
  );
}
