"use client";

import { useRouter } from "next/navigation";
import { useCopilotChat } from "@copilotkit/react-core";
import { MessageRole, TextMessage } from "@copilotkit/runtime-client-gql";
import { Copy, FileText, GitCompare, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import { fmtMoney, type InputKey } from "@/lib/roi/engine";
import { BASIS_LABEL, inputsFor, type Basis } from "@/lib/roi/defaults";
import { scenarioInputs, scenarioResult, useRoiStore, type Scenario } from "@/lib/roi/store";
import { BasisPill, CostBars, NumberField, Stat, headline, ink } from "@/components/roi/ui";

const STARTERS = [
  "What does Flagstaff get back if the insurance credit is only 2%?",
  "Compare a cautious and an expected case for Hollywood",
  "Build a case for a 60,000-person coastal city with a $1.5M premium",
  "Write a one-page report on the active scenario for a city manager",
  "Who is ecoheart, and where can I watch the explainer?",
];

export default function RoiWorkspace() {
  const scenarios = useRoiStore((s) => s.scenarios);
  const activeId = useRoiStore((s) => s.activeId);
  const compareIds = useRoiStore((s) => s.compareIds);
  const active = scenarios.find((s) => s.id === activeId) ?? scenarios[0];
  const { appendMessage } = useCopilotChat();
  const setChatOpen = useRoiStore((s) => s.setChatOpen);

  const ask = (text: string) => {
    setChatOpen(true);
    appendMessage(new TextMessage({ role: MessageRole.User, content: text }));
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <section className="mb-6">
        <h1 className={`font-serif text-3xl italic md:text-4xl ${ink}`}>What does resilience pay back?</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Ask the Advisor a what-if and it builds the scenario here. Every number comes from one shared calculator and the
          assumption library, so you can check and change anything.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {STARTERS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-left text-xs text-slate-700 shadow-sm hover:border-teal-400 hover:text-teal-800"
            >
              <Sparkles className="h-3 w-3 flex-none text-teal-600" />
              {s}
            </button>
          ))}
        </div>
      </section>

      {compareIds.length >= 2 && <Compare ids={compareIds} />}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Scenarios ({scenarios.length})
          </div>
          {scenarios.map((s) => (
            <ScenarioTile key={s.id} s={s} active={s.id === active?.id} />
          ))}
        </div>
        {active ? (
          <ActiveScenario s={active} />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
            No scenarios yet. Ask the Advisor to build one.
          </div>
        )}
      </div>
    </div>
  );
}

function ScenarioTile({ s, active }: { s: Scenario; active: boolean }) {
  const assumptions = useRoiStore((st) => st.assumptions);
  const setActive = useRoiStore((st) => st.setActive);
  const compare = useRoiStore((st) => st.compareIds.includes(s.id));
  const toggleCompare = useRoiStore((st) => st.toggleCompare);
  const h = headline(scenarioResult(s, assumptions));
  return (
    <div
      onClick={() => setActive(s.id)}
      className={`cursor-pointer rounded-xl border bg-white p-3 transition ${
        active ? "border-teal-500 shadow-md ring-1 ring-teal-500" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`truncate text-sm font-semibold ${ink}`}>{s.name}</div>
          <div className="truncate text-xs text-slate-500">{s.city}</div>
        </div>
        <BasisPill basis={s.basis} />
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div className={`font-serif text-xl ${ink}`}>{h.net}</div>
        <div className="text-xs text-slate-500">
          {h.perDollar} per $1 · {h.payback}
        </div>
      </div>
      <label className="mt-2 flex items-center gap-1.5 text-xs text-slate-500" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={compare} onChange={() => toggleCompare(s.id)} className="accent-teal-600" />
        Compare
        {s.createdBy === "agent" && <span className="ml-auto text-[10px] text-teal-700">from chat</span>}
      </label>
    </div>
  );
}

function ActiveScenario({ s }: { s: Scenario }) {
  const router = useRouter();
  const st = useRoiStore();
  const r = scenarioResult(s, st.assumptions);
  const inputs = scenarioInputs(s, st.assumptions);
  const library = inputsFor(st.assumptions, s.basis);
  const h = headline(r);
  const maxDriver = Math.max(...r.drivers.map((d) => d.value), 1);
  const groups = Array.from(new Set(st.assumptions.map((a) => a.group)));

  const openReport = () => {
    if (st.report?.scenarioId !== s.id)
      st.setReport({ scenarioId: s.id, audience: "City leadership", summary: "", nextSteps: [], createdAt: Date.now() });
    router.push("/roi/report");
  };
  const duplicate = () =>
    st.addScenario({
      name: `${s.name} (copy)`,
      city: s.city,
      question: s.question,
      basis: s.basis,
      overrides: { ...s.overrides },
      notes: s.notes,
      createdBy: "person",
    });

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <input
              value={s.name}
              onChange={(e) => st.updateScenario(s.id, { name: e.target.value })}
              className={`w-full bg-transparent font-serif text-2xl outline-none ${ink}`}
            />
            <input
              value={s.city}
              onChange={(e) => st.updateScenario(s.id, { city: e.target.value })}
              className="w-full bg-transparent text-sm text-slate-500 outline-none"
            />
          </div>
          <div className="flex rounded-full bg-slate-100 p-0.5 text-xs">
            {(["low", "expected", "high"] as Basis[]).map((b) => (
              <button
                key={b}
                onClick={() => st.updateScenario(s.id, { basis: b })}
                className={`whitespace-nowrap rounded-full px-3 py-1 font-medium ${
                  s.basis === b ? "bg-white text-[#0F172A] shadow" : "text-slate-500"
                }`}
              >
                {BASIS_LABEL[b]}
              </button>
            ))}
          </div>
        </div>
        {s.question && <p className="mt-2 text-sm italic text-slate-600">“{s.question}”</p>}

        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat big label="Net value, year one" value={h.net} />
          <Stat big label="Back per $1 spent" value={h.perDollar} />
          <Stat big label="Payback" value={h.payback} />
          <Stat big label="City spends" value={fmtMoney(r.spent)} hint="fee + grants" />
        </div>

        <div className="mt-5">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Yearly storm and insurance costs
          </div>
          <CostBars r={r} />
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
            {[
              ["bg-slate-700", "Premium"],
              ["bg-slate-500", "Small claims"],
              ["bg-slate-400", "Deductibles"],
              ["bg-slate-300", "Overtime"],
              ["bg-teal-600", "ecoheart fee"],
              ["bg-teal-300", "Grants"],
            ].map(([c, l]) => (
              <span key={l} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-sm ${c}`} />
                {l}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Where the value comes from
          </div>
          <div className="space-y-1.5">
            {r.drivers.map((d) => (
              <div key={d.label} className="flex items-center gap-2 text-xs">
                <div className="w-40 flex-none text-slate-600">{d.label}</div>
                <div className="h-2 flex-1 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-teal-500" style={{ width: `${(d.value / maxDriver) * 100}%` }} />
                </div>
                <div className={`w-14 text-right font-medium ${ink}`}>{fmtMoney(d.value)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={openReport}
            className="flex items-center gap-1.5 rounded-full bg-[#0F172A] px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            <FileText className="h-4 w-4" /> Report
          </button>
          <button
            onClick={() => st.toggleCompare(s.id)}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
          >
            <GitCompare className="h-4 w-4" /> {st.compareIds.includes(s.id) ? "Remove from compare" : "Add to compare"}
          </button>
          <button
            onClick={duplicate}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
          >
            <Copy className="h-4 w-4" /> Duplicate
          </button>
          <button
            onClick={() => st.removeScenario(s.id)}
            className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>

      <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6" open>
        <summary className={`cursor-pointer font-serif text-lg ${ink}`}>
          Tune this scenario
          <span className="ml-2 font-sans text-xs text-slate-500">
            Starts from the {BASIS_LABEL[s.basis].toLowerCase()} column of the library. Changes here only affect this
            scenario.
          </span>
        </summary>
        <div className="mt-4 space-y-5">
          {groups.map((g) => (
            <div key={g}>
              <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">{g}</div>
              <div className="divide-y divide-slate-100">
                {st.assumptions
                  .filter((a) => a.group === g)
                  .map((a) => {
                    const changed = a.key in s.overrides;
                    return (
                      <div key={a.key} className="flex items-center gap-3 py-1.5">
                        <div className="min-w-0 flex-1 text-sm text-slate-700">
                          {a.label}
                          {a.confidence === "low" && (
                            <span className="ml-1.5 rounded bg-amber-50 px-1 text-[10px] text-amber-700">estimate</span>
                          )}
                        </div>
                        <NumberField
                          className="w-32 flex-none"
                          unit={a.unit}
                          value={inputs[a.key as InputKey]}
                          changed={changed}
                          onChange={(v) => st.setOverride(s.id, a.key, v)}
                        />
                        <button
                          title={`Back to library value (${library[a.key]})`}
                          onClick={() => st.setOverride(s.id, a.key, null)}
                          className={`flex-none rounded p-1 ${changed ? "text-teal-600 hover:bg-teal-50" : "invisible"}`}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
          <textarea
            value={s.notes}
            onChange={(e) => st.updateScenario(s.id, { notes: e.target.value })}
            placeholder="Notes: where the numbers came from, what to confirm with the city"
            className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-teal-500"
            rows={3}
          />
        </div>
      </details>
    </div>
  );
}

function Compare({ ids }: { ids: string[] }) {
  const scenarios = useRoiStore((s) => s.scenarios);
  const assumptions = useRoiStore((s) => s.assumptions);
  const setCompare = useRoiStore((s) => s.setCompare);
  const rows = ids
    .map((id) => scenarios.find((s) => s.id === id))
    .filter((s): s is Scenario => !!s)
    .map((s) => ({ s, r: scenarioResult(s, assumptions) }));
  const maxNet = Math.max(...rows.map((x) => Math.abs(x.r.net)), 1);
  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className={`font-serif text-xl ${ink}`}>Side by side</h2>
        <button onClick={() => setCompare([])} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
          <X className="h-3.5 w-3.5" /> Clear
        </button>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
        {rows.map(({ s, r }) => {
          const h = headline(r);
          return (
            <div key={s.id} className="min-w-0">
              <div className={`truncate text-sm font-semibold ${ink}`}>{s.name}</div>
              <div className="mb-2">
                <BasisPill basis={s.basis} />
              </div>
              <div className="flex h-24 items-end">
                <div
                  className={`w-full rounded-t-md ${r.net >= 0 ? "bg-teal-500" : "bg-red-400"}`}
                  style={{ height: `${Math.max(4, (Math.abs(r.net) / maxNet) * 100)}%` }}
                />
              </div>
              <div className={`mt-2 font-serif text-2xl ${ink}`}>{h.net}</div>
              <div className="text-xs text-slate-500">
                {h.perDollar} per $1 · payback {h.payback}
              </div>
              <div className="mt-1 text-xs text-slate-500">Biggest driver: {r.drivers[0]?.label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
