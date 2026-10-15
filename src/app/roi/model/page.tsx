"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { BLOCK_LABEL, formulaText, type Block } from "@/lib/roi/engine";
import { DEFAULT_MODELS, type Confidence } from "@/lib/roi/defaults";
import { changesFromOriginal, originalAssumption, useRoiStore } from "@/lib/roi/store";
import { checkModel } from "@/lib/roi/validate";
import { ChecksBadge, ChecksList, ExportButtons, NumberField, ink } from "@/components/roi/ui";
import { useCaseWorkbook } from "@/lib/roi/export";

const CONF: Confidence[] = ["low", "medium", "high"];
const confTone: Record<Confidence, string> = {
  low: "bg-amber-50 text-amber-800",
  medium: "bg-slate-100 text-slate-700",
  high: "bg-teal-50 text-teal-800",
};
const BLOCK_TONE: Record<Block, string> = {
  costAvoided: "bg-slate-100 text-slate-700",
  eventsAvoided: "bg-cyan-50 text-cyan-800",
  timeSaved: "bg-teal-50 text-teal-800",
  newMoney: "bg-indigo-50 text-indigo-800",
};
const BLOCK_HELP: Record<Block, string> = {
  costAvoided: "a yearly cost × share avoided",
  eventsAvoided: "events a year × cost per event × share avoided",
  timeSaved: "staff hours saved × hourly rate",
  newMoney: "dollars at stake × improvement",
};

export default function RoiUseCases() {
  const st = useRoiStore();
  const groups = Array.from(new Set(st.assumptions.map((a) => a.group)));
  const changes = changesFromOriginal(st).filter((c) => c.where === "assumption" || c.where === "use case").length;
  const labelOf = (k: string) => st.assumptions.find((a) => a.key === k)?.label ?? k;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-8">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className={`font-serif text-3xl italic ${ink}`}>Use cases</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Each use case is a short list of savings built from four blocks, so a new kind of saving never needs new
              math. Pick any mix for a client on the Workspace, or ask the Advisor to draft a new one.
            </p>
          </div>
          <button onClick={st.resetModels} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
            <RotateCcw className="h-3.5 w-3.5" /> Reset starter use cases
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {(Object.keys(BLOCK_LABEL) as Block[]).map((b) => (
            <div key={b} className="rounded-xl border border-slate-200 bg-white p-3">
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${BLOCK_TONE[b]}`}>{BLOCK_LABEL[b]}</span>
              <div className="mt-1.5 text-xs text-slate-500">{BLOCK_HELP[b]}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {st.models.map((m) => {
            const checks = checkModel(m, st);
            const starter = DEFAULT_MODELS.some((d) => d.id === m.id);
            return (
              <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className={`font-serif text-xl ${ink}`}>{m.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {m.superSystem} · {m.status === "draft" ? `draft by ${m.createdBy === "advisor" ? "the Advisor" : "a person"}` : "starter"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <ChecksBadge checks={checks} />
                    {!starter && (
                      <button onClick={() => st.removeModel(m.id)} title="Delete this use case" className="rounded p-1 text-slate-300 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-600">{m.description}</p>
                <ul className="mt-3 space-y-2">
                  {m.lines.map((l) => (
                    <li key={l.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${BLOCK_TONE[l.block]}`}>{BLOCK_LABEL[l.block]}</span>
                        <span className={`font-medium ${ink}`}>{l.driver}</span>
                        {l.overlap && (
                          <span title="Lines with the same tag in other use cases may count the same saving" className="rounded bg-amber-50 px-1 text-[10px] text-amber-700">
                            overlaps: {l.overlap}
                          </span>
                        )}
                      </div>
                      <div className="ml-1 mt-0.5 text-xs text-slate-500">= {formulaText(l, labelOf)}</div>
                    </li>
                  ))}
                  {m.clientCosts.map((c) => (
                    <li key={c.id} className="text-sm">
                      <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">Client spends</span>{" "}
                      <span className={`font-medium ${ink}`}>{c.label}</span>
                      <div className="ml-1 mt-0.5 text-xs text-slate-500">
                        = {labelOf(c.count)} × {labelOf(c.unitCost)}
                      </div>
                    </li>
                  ))}
                  {m.outcomes.map((o) => (
                    <li key={o.id} className="text-sm">
                      <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">Outcome</span>{" "}
                      <span className="text-slate-700">{o.label}</span> <span className="text-xs text-slate-400">(not in dollars)</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3">
                  <ExportButtons get={() => useCaseWorkbook(m.id, useRoiStore.getState())} />
                </div>
                {checks.some((c) => c.level !== "pass") && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <ChecksList checks={checks} showPass={false} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className={`font-serif text-2xl italic ${ink}`}>Assumption library</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Starting values every client uses until it has its own (set those on the Clients tab). The storm values are
              Hollywood's numbers from Jerid's business case; the rest are ecoheart estimates to confirm. Teal fields differ
              from the original (hover to see it).
            </p>
            {changes > 0 && (
              <p className="mt-1 text-xs font-medium text-teal-700">
                {changes} change{changes === 1 ? "" : "s"} from the original
              </p>
            )}
          </div>
          <button onClick={st.resetAssumptions} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
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
                  .map((a) => {
                    const orig = originalAssumption(a.key);
                    return (
                      <tr key={a.key} className="border-t border-slate-100 align-middle">
                        <td className="px-4 py-2 text-slate-700">
                          {a.label}
                          {a.createdBy === "advisor" && <span className="ml-1.5 rounded bg-teal-50 px-1 text-[10px] text-teal-700">by the Advisor</span>}
                          {orig && JSON.stringify(a) !== JSON.stringify(orig) && (
                            <button onClick={() => st.resetAssumption(a.key)} title="Back to the original values" className="ml-1.5 inline-flex align-middle text-teal-600 hover:text-teal-800">
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                        {(["low", "expected", "high"] as const).map((f) => (
                          <td key={f} className="px-2 py-2">
                            <div title={orig ? `Original: ${orig[f]}` : "Added after the start"}>
                              <NumberField className="ml-auto w-28" unit={a.unit} value={a[f]} changed={orig ? orig[f] !== a[f] : true} onChange={(v) => st.setAssumption(a.key, f, v)} />
                            </div>
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
                    );
                  })}
              </tbody>
            ))}
          </table>
        </div>
      </section>
    </div>
  );
}
