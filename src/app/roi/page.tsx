"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCopilotChat } from "@copilotkit/react-core";
import { MessageRole, TextMessage } from "@copilotkit/runtime-client-gql";
import { Copy, FileText, GitCompare, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import { BLOCK_LABEL, fmtMoney } from "@/lib/roi/engine";
import { BASIS_LABEL, type Basis } from "@/lib/roi/defaults";
import { clientNoun } from "@/lib/roi/pricing";
import {
  clientDeal,
  modelsFor,
  resolveKey,
  scenarioInputs,
  scenarioResult,
  useRoiStore,
  type Scenario,
} from "@/lib/roi/store";
import { validateScenario } from "@/lib/roi/validate";
import { scenarioWorkbook } from "@/lib/roi/export";
import {
  BasisPill,
  ChecksBadge,
  ChecksList,
  CostBars,
  CostLegend,
  ExportButtons,
  NumberField,
  SourceChip,
  Stat,
  WhoPaysBar,
  headline,
  ink,
} from "@/components/roi/ui";

const STARTERS = [
  "What does Flagstaff get back if the insurance credit is only 2%?",
  "Build a scenario for Olympia with storm and insurance plus Grant Finder, and check it",
  "Add 311 complaint triage to Hollywood. What changes?",
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
          Pick a client and the use cases that fit, or ask the Advisor a what-if. Every number comes from one shared
          calculator, the client's own values and the assumption library, so you can check and change anything.{" "}
          <Link href="/roi/explainer" className="whitespace-nowrap font-medium text-teal-700 underline">
            New here? Watch the 4-minute walkthrough
          </Link>
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
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Scenarios ({scenarios.length})</div>
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
  const st = useRoiStore();
  const compare = st.compareIds.includes(s.id);
  const client = st.clients.find((c) => c.id === s.clientId);
  const h = headline(scenarioResult(s, st));
  const useCases = modelsFor(s.modelIds, st).map((m) => m.name).join(" + ");
  return (
    <div
      onClick={() => st.setActive(s.id)}
      className={`cursor-pointer rounded-xl border bg-white p-3 transition ${
        active ? "border-teal-500 shadow-md ring-1 ring-teal-500" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`truncate text-sm font-semibold ${ink}`}>{s.name}</div>
          <div className="truncate text-xs text-slate-500">{client?.name ?? "No client"}</div>
          <div className="truncate text-[11px] text-teal-700">{useCases}</div>
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
        <input type="checkbox" checked={compare} onChange={() => st.toggleCompare(s.id)} className="accent-teal-600" />
        Compare
        {s.createdBy === "agent" && <span className="ml-auto text-[10px] text-teal-700">from chat</span>}
      </label>
    </div>
  );
}

function fmtVal(v: number, unit: string) {
  if (unit === "$") return fmtMoney(v);
  if (unit === "%") return `${v}%`;
  if (unit === "hours") return `${v.toLocaleString()} h`;
  return v.toLocaleString();
}

function ActiveScenario({ s }: { s: Scenario }) {
  const router = useRouter();
  const st = useRoiStore();
  const client = st.clients.find((c) => c.id === s.clientId);
  const noun = clientNoun(client?.type);
  const r = scenarioResult(s, st);
  const inputs = scenarioInputs(s, st);
  const deal = clientDeal(s.clientId, st);
  const checks = validateScenario(s, st);
  const h = headline(r);
  const maxDriver = Math.max(...r.drivers.map((d) => d.value), 1);
  const models = modelsFor(s.modelIds, st);
  const modelName = (id: string) => st.models.find((m) => m.id === id)?.name ?? "";
  const defaultFee = deal?.years[0]?.clientPaysEcoheart ?? 0;

  const toggleModel = (id: string) => {
    const has = s.modelIds.includes(id);
    if (has && s.modelIds.length === 1) return;
    st.updateScenario(s.id, { modelIds: has ? s.modelIds.filter((x) => x !== id) : [...s.modelIds, id] });
  };
  const openReport = () => {
    if (st.report?.scenarioId !== s.id) st.setReport({ scenarioId: s.id, audience: `${client?.name ?? "Client"} leadership`, summary: "", nextSteps: [], createdAt: Date.now() });
    router.push("/roi/report");
  };
  const duplicate = () =>
    st.addScenario({
      name: `${s.name} (copy)`,
      clientId: s.clientId,
      modelIds: [...s.modelIds],
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
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <select
                value={s.clientId}
                onChange={(e) => st.updateScenario(s.id, { clientId: e.target.value })}
                className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-sm text-slate-700"
              >
                {st.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {client && (
                <Link href={`/roi/clients?id=${client.id}`} className="text-xs text-teal-700 hover:underline">
                  {client.type} · {deal?.size} · {deal?.offer?.name ?? "no offer"}
                </Link>
              )}
            </div>
          </div>
          <div className="flex rounded-full bg-slate-100 p-0.5 text-xs">
            {(["low", "expected", "high"] as Basis[]).map((b) => (
              <button
                key={b}
                onClick={() => st.updateScenario(s.id, { basis: b })}
                className={`whitespace-nowrap rounded-full px-3 py-1 font-medium ${s.basis === b ? "bg-white text-[#0F172A] shadow" : "text-slate-500"}`}
              >
                {BASIS_LABEL[b]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {st.models.map((m) => {
            const on = s.modelIds.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleModel(m.id)}
                title={m.description}
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
                  on ? "bg-teal-600 text-white ring-teal-600" : "bg-white text-slate-600 ring-slate-200 hover:ring-teal-400"
                }`}
              >
                {m.name}
                {m.status === "draft" && <span className="ml-1 opacity-70">(draft)</span>}
              </button>
            );
          })}
        </div>
        {s.question && <p className="mt-3 text-sm italic text-slate-600">“{s.question}”</p>}

        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat big label="Net value, year one" value={h.net} />
          <Stat big label="Back per $1 spent" value={h.perDollar} />
          <Stat big label="Payback" value={h.payback} />
          <Stat big label={`The ${noun} spends`} value={fmtMoney(r.spent)} hint={r.clientCosts ? `${fmtMoney(r.fee)} to ecoheart + ${fmtMoney(r.clientCosts)} own` : "payment to ecoheart"} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ChecksBadge checks={checks} />
          <span className="text-xs text-slate-500">Checks run in code on sources, ranges, double counting, price and margin.</span>
        </div>

        <div className="mt-5">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">Yearly costs, today and with the Advisor</div>
          <CostBars r={r} />
          <CostLegend r={r} />
        </div>

        <div className="mt-5">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">Where the value comes from</div>
          <div className="space-y-1.5">
            {r.drivers.map((d) => (
              <div key={`${d.model}-${d.id}`} className="flex items-center gap-2 text-xs">
                <div className="w-48 flex-none text-slate-600">
                  {d.label}
                  {models.length > 1 && <span className="block text-[10px] text-slate-400">{modelName(d.model)}</span>}
                </div>
                <div className="h-2 flex-1 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-teal-500" style={{ width: `${(d.value / maxDriver) * 100}%` }} />
                </div>
                <div className={`w-14 text-right font-medium ${ink}`}>{fmtMoney(d.value)}</div>
              </div>
            ))}
          </div>
        </div>

        {deal && deal.whoPaysYear1.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">Who covers year one</div>
            <WhoPaysBar items={deal.whoPaysYear1} />
          </div>
        )}

        {r.outcomes.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">Other outcomes (not in the dollar figures)</div>
            <div className="flex flex-wrap gap-3">
              {r.outcomes.map((o) => (
                <div key={o.label} className="rounded-lg bg-[#F7F6F2] px-3 py-2">
                  <div className={`font-serif text-lg ${ink}`}>{o.value.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-500">{o.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={openReport} className="flex items-center gap-1.5 rounded-full bg-[#0F172A] px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            <FileText className="h-4 w-4" /> Report
          </button>
          <button onClick={() => st.toggleCompare(s.id)} className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">
            <GitCompare className="h-4 w-4" /> {st.compareIds.includes(s.id) ? "Remove from compare" : "Add to compare"}
          </button>
          <button onClick={duplicate} className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">
            <Copy className="h-4 w-4" /> Duplicate
          </button>
          <span className="self-center">
            <ExportButtons get={() => scenarioWorkbook(s.id, useRoiStore.getState())} />
          </span>
          <button
            onClick={() => st.removeScenario(s.id)}
            className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>

      <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <summary className={`cursor-pointer font-serif text-lg ${ink}`}>
          Checks <span className="ml-2 align-middle"><ChecksBadge checks={checks} /></span>
        </summary>
        <div className="mt-4">
          <ChecksList checks={checks} />
        </div>
      </details>

      <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6" open>
        <summary className={`cursor-pointer font-serif text-lg ${ink}`}>
          Tune this scenario
          <span className="ml-2 font-sans text-xs text-slate-500">
            Values come from {client?.name ?? "the client"}'s own numbers where it has them, otherwise the{" "}
            {BASIS_LABEL[s.basis].toLowerCase()} column of the library. Changes here only affect this scenario.
          </span>
        </summary>
        <div className="mt-4 space-y-5">
          <div>
            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">Price</div>
            <div className="flex items-center gap-3 py-1.5">
              <div className="min-w-0 flex-1 text-sm text-slate-700">
                Year-one payment to ecoheart
                <span className="block text-[11px] text-slate-400">
                  From {client?.name}'s deal: {fmtMoney(defaultFee)}
                  {deal && deal.years[0].shares.length > 0 ? " after partner shares" : ""}
                </span>
              </div>
              <NumberField className="w-32 flex-none" unit="$" value={r.fee} changed={"fee" in s.overrides} onChange={(v) => st.setOverride(s.id, "fee", v)} />
              <button
                title={`Back to the deal price (${fmtMoney(defaultFee)})`}
                onClick={() => st.setOverride(s.id, "fee", null)}
                className={`flex-none rounded p-1 ${"fee" in s.overrides ? "text-teal-600 hover:bg-teal-50" : "invisible"}`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {models.map((m) => {
            const keys = [...new Set([...m.lines.flatMap((l) => Object.values(l.keys)), ...m.clientCosts.flatMap((c) => [c.count, c.unitCost]), ...m.outcomes.map((o) => o.key)])].filter(Boolean) as string[];
            return (
              <div key={m.id}>
                <div className="mb-1.5 flex items-baseline gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{m.name}</span>
                  <span className="text-[10px] text-slate-400">{[...new Set(m.lines.map((l) => BLOCK_LABEL[l.block]))].join(", ")}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {keys.map((k) => {
                    const rk = resolveKey(k, s.basis, s.clientId, st);
                    const a = rk.a;
                    const changed = k in s.overrides;
                    return (
                      <div key={k} className="flex items-center gap-3 py-1.5">
                        <div className="min-w-0 flex-1 text-sm text-slate-700">
                          {a?.label ?? k}
                          <span className="ml-1.5">
                            <SourceChip from={rk.from} />
                          </span>
                          {rk.confidence === "low" && <span className="ml-1 rounded bg-amber-50 px-1 text-[10px] text-amber-700">estimate</span>}
                        </div>
                        <NumberField className="w-32 flex-none" unit={a?.unit ?? ""} value={inputs[k] ?? 0} changed={changed} onChange={(v) => st.setOverride(s.id, k, v)} />
                        <button
                          title={`Back to ${rk.from === "library" ? "the library" : "the client's"} value (${fmtVal(rk.value, a?.unit ?? "")})`}
                          onClick={() => st.setOverride(s.id, k, null)}
                          className={`flex-none rounded p-1 ${changed ? "text-teal-600 hover:bg-teal-50" : "invisible"}`}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <textarea
            value={s.notes}
            onChange={(e) => st.updateScenario(s.id, { notes: e.target.value })}
            placeholder={`Notes: where the numbers came from, what to confirm with the ${noun}`}
            className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-teal-500"
            rows={3}
          />
        </div>
      </details>
    </div>
  );
}

function Compare({ ids }: { ids: string[] }) {
  const st = useRoiStore();
  const rows = ids
    .map((id) => st.scenarios.find((s) => s.id === id))
    .filter((s): s is Scenario => !!s)
    .map((s) => ({ s, r: scenarioResult(s, st) }));
  const maxNet = Math.max(...rows.map((x) => Math.abs(x.r.net)), 1);
  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className={`font-serif text-xl ${ink}`}>Side by side</h2>
        <button onClick={() => st.setCompare([])} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
          <X className="h-3.5 w-3.5" /> Clear
        </button>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
        {rows.map(({ s, r }) => {
          const h = headline(r);
          return (
            <div key={s.id} className="min-w-0">
              <div className={`truncate text-sm font-semibold ${ink}`}>{s.name}</div>
              <div className="truncate text-xs text-slate-500">{st.clients.find((c) => c.id === s.clientId)?.name}</div>
              <div className="mb-2 mt-1">
                <BasisPill basis={s.basis} />
              </div>
              <div className="flex h-24 items-end">
                <div className={`w-full rounded-t-md ${r.net >= 0 ? "bg-teal-500" : "bg-red-400"}`} style={{ height: `${Math.max(4, (Math.abs(r.net) / maxNet) * 100)}%` }} />
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
