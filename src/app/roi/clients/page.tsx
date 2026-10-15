"use client";

import { useEffect } from "react";
import { Check as CheckIcon, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { fmtMoney, keysFor } from "@/lib/roi/engine";
import { ADJUSTMENT_PRESETS, BASIS_LABEL, DEFAULT_CLIENTS, SME_EXAMPLE } from "@/lib/roi/defaults";
import { CLIENT_TYPES, PAYER_LABEL, SIZES, type Client, type ClientType, type CostLine, type Payer, type Size } from "@/lib/roi/pricing";
import { clientDeal, modelsFor, newId, resolveKey, useRoiStore } from "@/lib/roi/store";
import { validateClient } from "@/lib/roi/validate";
import { ChecksBadge, ChecksList, ExportButtons, NumberField, SourceChip, Stat, WhoPaysBar, ink } from "@/components/roi/ui";
import { clientWorkbook } from "@/lib/roi/export";

const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6";
const label = "text-[11px] font-medium uppercase tracking-wider text-slate-500";
const field = "rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 outline-none focus:border-teal-500";

export default function RoiClients() {
  const st = useRoiStore();
  // Deep link from the Workspace: /roi/clients?id=olympia
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id && st.clients.some((c) => c.id === id)) st.setActiveClient(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const client = st.clients.find((c) => c.id === st.activeClientId) ?? st.clients[0];

  const add = () => {
    const id = newId();
    st.addClient({
      id,
      name: "New client",
      type: "city",
      state: "",
      region: "US",
      modelIds: ["storm"],
      offerId: "early-partner",
      contract: { years: 1, escalatorPct: 3, payments: "annual" },
      costLines: st.offers.find((o) => o.id === "early-partner")?.costTemplate.map((l) => ({ ...l })) ?? [],
      adjustments: [],
      local: {},
      notes: "",
    });
    st.setActiveClient(id);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <section className="mb-6">
        <h1 className={`font-serif text-3xl italic md:text-4xl ${ink}`}>Clients</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Each client keeps its own numbers (with sources), the use cases that fit, what we offer, and who does and pays
          for the work. Clients can be cities, counties, agencies, tribal nations or organizations. Shared with the team.
        </p>
      </section>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="space-y-2">
          <div className={label}>Clients ({st.clients.length})</div>
          {st.clients.map((c) => {
            const d = clientDeal(c.id, st);
            const on = c.id === client?.id;
            return (
              <button
                key={c.id}
                onClick={() => st.setActiveClient(c.id)}
                className={`block w-full rounded-xl border bg-white p-3 text-left transition ${on ? "border-teal-500 ring-1 ring-teal-500" : "border-slate-200 hover:border-slate-300"}`}
              >
                <div className={`truncate text-sm font-semibold ${ink}`}>{c.name}</div>
                <div className="truncate text-xs text-slate-500">
                  {c.type} · {d?.size}
                </div>
                <div className="truncate text-[11px] text-teal-700">{d?.offer?.name}</div>
              </button>
            );
          })}
          <button onClick={add} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500 hover:border-teal-400 hover:text-teal-700">
            <Plus className="h-4 w-4" /> Add a client
          </button>
        </div>
        {client ? <ClientDetail c={client} /> : null}
      </div>
    </div>
  );
}

function ClientDetail({ c }: { c: Client }) {
  const st = useRoiStore();
  const deal = clientDeal(c.id, st)!;
  const checks = validateClient(c, st);
  const y1 = deal.years[0];
  const isDefault = DEFAULT_CLIENTS.some((d) => d.id === c.id);
  const up = (patch: Partial<Client>) => st.updateClient(c.id, patch);

  return (
    <div className="min-w-0 space-y-5">
      {/* Profile */}
      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <input value={c.name} onChange={(e) => up({ name: e.target.value })} className={`min-w-0 flex-1 bg-transparent font-serif text-2xl outline-none ${ink}`} />
          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons label="Cost model" internal get={() => clientWorkbook(c.id, useRoiStore.getState())} />
            <ChecksBadge checks={checks} />
            {isDefault ? (
              <button onClick={() => st.resetClient(c.id)} title="Back to the starting profile" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <RotateCcw className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={() => st.removeClient(c.id)} title="Delete this client" className="rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          <L t="Type">
            <select value={c.type} onChange={(e) => up({ type: e.target.value as ClientType })} className={field}>
              {CLIENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </L>
          <L t="State, country or region">
            <input value={c.state} onChange={(e) => up({ state: e.target.value })} className={field} />
          </L>
          <L t="Rules">
            <select value={c.region} onChange={(e) => up({ region: e.target.value as Client["region"] })} className={field}>
              <option value="US">US</option>
              <option value="EU">EU</option>
            </select>
          </L>
          <L t="People served">
            <NumberField unit="count" value={c.population ?? 0} onChange={(v) => up({ population: v || undefined })} />
          </L>
          <L t={`Size (${c.sizeOverride ? "set by hand" : "from people served"})`}>
            <select value={c.sizeOverride ?? ""} onChange={(e) => up({ sizeOverride: (e.target.value || undefined) as Size | undefined })} className={field}>
              <option value="">Auto: {deal.size}</option>
              {SIZES.map((z) => (
                <option key={z}>{z}</option>
              ))}
            </select>
          </L>
          <L t="Document search">
            <div className="py-1 text-sm text-slate-600">{c.docsIndex ? `${c.name} documents indexed` : "None yet"}</div>
          </L>
        </div>
        <div className="mt-4">
          <div className={`${label} mb-1.5`}>Use cases</div>
          <div className="flex flex-wrap gap-1.5">
            {st.models.map((m) => {
              const on = c.modelIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => up({ modelIds: on ? c.modelIds.filter((x) => x !== m.id) : [...c.modelIds, m.id] })}
                  className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${on ? "bg-teal-600 text-white ring-teal-600" : "bg-white text-slate-600 ring-slate-200 hover:ring-teal-400"}`}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
        </div>
        <textarea
          value={c.notes}
          onChange={(e) => up({ notes: e.target.value })}
          placeholder="Notes"
          rows={2}
          className="mt-4 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-teal-500"
        />
      </div>

      <LocalValues c={c} />

      {/* Deal */}
      <div className={card}>
        <h2 className={`font-serif text-xl ${ink}`}>What we offer</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          <L t="Offer" wide>
            <select value={c.offerId} onChange={(e) => up({ offerId: e.target.value })} className={field}>
              {st.offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </L>
          <L t="Then, from year 2">
            <select value={c.ongoingId ?? ""} onChange={(e) => up({ ongoingId: e.target.value || undefined })} className={field}>
              <option value="">Nothing</option>
              {st.offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </L>
          <L t="Years">
            <NumberField unit="count" value={c.contract.years} onChange={(v) => up({ contract: { ...c.contract, years: Math.max(1, Math.round(v || 1)) } })} />
          </L>
          <L t="Yearly increase">
            <NumberField unit="%" value={c.contract.escalatorPct} onChange={(v) => up({ contract: { ...c.contract, escalatorPct: v || 0 } })} />
          </L>
          <L t="Payments">
            <select value={c.contract.payments} onChange={(e) => up({ contract: { ...c.contract, payments: e.target.value as Client["contract"]["payments"] } })} className={field}>
              <option value="annual">Annual</option>
              <option value="quarterly">Quarterly</option>
              <option value="monthly">Monthly</option>
            </select>
          </L>
        </div>
        {deal.offer && (
          <p className="mt-2 text-xs text-slate-500">
            {deal.offer.length} · {deal.offer.notes}
            {deal.offer.kind === "catalog" && ` · ${deal.items.length} catalog items at ${deal.size} size`}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-5">
          <Stat label="Year-one price" value={fmtMoney(y1.price)} />
          <Stat label={`${c.name.split(",")[0]} pays us, year one`} value={fmtMoney(y1.clientPaysEcoheart)} />
          <Stat label={`Contract (${deal.years.length} yr)`} value={fmtMoney(deal.total.price)} />
          <Stat label="Yearly recurring" value={fmtMoney(deal.arr)} hint={`${fmtMoney(deal.mrr)} a month`} />
          <Stat label="Our margin" value={`${Math.round(deal.total.marginPct * 100)}%`} hint={`${fmtMoney(deal.total.margin)} · internal`} />
        </div>

        <div className="mt-5">
          <div className={`${label} mb-2`}>Who covers year one</div>
          <WhoPaysBar items={deal.whoPaysYear1} />
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-1 font-medium">Year</th>
                <th className="py-1 text-right font-medium">Price</th>
                <th className="py-1 text-right font-medium">Partners cover</th>
                <th className="py-1 text-right font-medium">Client pays us</th>
                <th className="py-1 text-right font-medium">Our cost</th>
                <th className="py-1 text-right font-medium">Margin</th>
              </tr>
            </thead>
            <tbody>
              {deal.years.map((y) => (
                <tr key={y.year} className="border-t border-slate-100 tabular-nums">
                  <td className="py-1.5">Year {y.year}</td>
                  <td className="py-1.5 text-right">{fmtMoney(y.price)}</td>
                  <td className="py-1.5 text-right">{fmtMoney(y.shares.reduce((s, x) => s + x.amount, 0))}</td>
                  <td className="py-1.5 text-right">{fmtMoney(y.clientPaysEcoheart)}</td>
                  <td className="py-1.5 text-right">{fmtMoney(y.ourCost)}</td>
                  <td className={`py-1.5 text-right ${y.margin < 0 ? "text-red-600" : ""}`}>{fmtMoney(y.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {deal.paymentsYear1.length > 1 && (
            <p className="mt-1 text-xs text-slate-500">
              Year one is billed {c.contract.payments}: {deal.paymentsYear1.length} payments of {fmtMoney(deal.paymentsYear1[0].amount)}.
            </p>
          )}
        </div>

        <div className="mt-5">
          <div className={`${label} mb-2`}>Price adjustments</div>
          {c.adjustments.length === 0 && <div className="text-xs text-slate-500">None.</div>}
          {c.adjustments.map((a) => (
            <div key={a.id} className="flex items-center gap-2 border-t border-slate-100 py-1.5 text-sm first:border-0">
              <span className={`font-medium ${ink}`}>{a.label}</span>
              <span className="text-slate-500">
                {a.kind === "pct" ? `${a.value}% off` : `${fmtMoney(a.value)} off`} · {a.appliesTo === "year1" ? "year one" : "every year"}
              </span>
              <span className="truncate text-xs text-slate-400">{a.reason}</span>
              <button onClick={() => st.removeAdjustment(c.id, a.id)} className="ml-auto rounded p-1 text-slate-400 hover:text-red-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ADJUSTMENT_PRESETS.map((p) => (
              <button key={p.label} onClick={() => st.addAdjustment(c.id, { ...p, id: newId() })} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-teal-400">
                + {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <CostLines c={c} />

      <div className={card}>
        <h2 className={`mb-3 font-serif text-xl ${ink}`}>Checks</h2>
        <ChecksList checks={checks} />
      </div>
    </div>
  );
}

function L({ t, children, wide }: { t: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${wide ? "col-span-2 md:col-span-1" : ""}`}>
      <span className="text-[11px] text-slate-500">{t}</span>
      {children}
    </label>
  );
}

function LocalValues({ c }: { c: Client }) {
  const st = useRoiStore();
  const keys = keysFor(modelsFor(c.modelIds, st));
  const set = (k: string, f: "low" | "expected" | "high", v: number) => {
    const rk = resolveKey(k, "expected", c.id, st);
    const cur = c.local[k] ?? {
      low: rk.a?.low ?? 0,
      expected: rk.a?.expected ?? 0,
      high: rk.a?.high ?? 0,
      source: "",
      confidence: "medium" as const,
      owner: rk.a?.owner ?? "",
      status: "confirmed" as const,
      by: "person" as const,
      at: Date.now(),
    };
    st.setLocal(c.id, k, { ...cur, [f]: v, status: "confirmed", by: "person", at: Date.now() });
  };
  const setText = (k: string, f: "source" | "owner", v: string) => {
    const lv = c.local[k];
    if (lv) st.setLocal(c.id, k, { ...lv, [f]: v });
  };
  return (
    <div className={card}>
      <h2 className={`font-serif text-xl ${ink}`}>{c.name}'s own numbers</h2>
      <p className="mt-1 text-xs text-slate-500">
        Anything left as "library" uses the shared starting value (Hollywood's numbers) as a placeholder. Values the
        Advisor found are marked "proposed" until a person confirms them.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-1 font-medium">Value</th>
              {(["low", "expected", "high"] as const).map((b) => (
                <th key={b} className="px-1 py-1 text-right font-medium">
                  {BASIS_LABEL[b]}
                </th>
              ))}
              <th className="px-2 py-1 font-medium">Source</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => {
              const rk = resolveKey(k, "expected", c.id, st);
              const lv = c.local[k];
              const a = rk.a;
              return (
                <tr key={k} className="border-t border-slate-100 align-middle">
                  <td className="py-1.5 pr-2 text-slate-700">
                    {a?.label ?? k} <SourceChip from={rk.from} />
                  </td>
                  {(["low", "expected", "high"] as const).map((f) => (
                    <td key={f} className="px-1 py-1.5">
                      <NumberField className="ml-auto w-28" unit={a?.unit ?? ""} value={lv ? lv[f] : a?.[f] ?? 0} changed={!!lv} onChange={(v) => set(k, f, v)} />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    {lv ? (
                      <input value={lv.source} onChange={(e) => setText(k, "source", e.target.value)} placeholder="Where this came from" className="w-full min-w-[180px] rounded-md border border-transparent px-1 py-1 text-xs text-slate-600 outline-none hover:border-slate-200 focus:border-teal-500" />
                    ) : (
                      <span className="text-xs text-slate-400">{a?.source}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap py-1.5 text-right">
                    {lv?.status === "proposed" && (
                      <button onClick={() => st.confirmLocal(c.id, k)} title="Confirm this value" className="rounded p-1 text-teal-600 hover:bg-teal-50">
                        <CheckIcon className="h-4 w-4" />
                      </button>
                    )}
                    {lv && (
                      <button onClick={() => st.setLocal(c.id, k, null)} title="Back to the library value" className="rounded p-1 text-slate-400 hover:text-slate-700">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PAYERS: Payer[] = ["ecoheart", "client", "partner", "grant"];

function CostLines({ c }: { c: Client }) {
  const st = useRoiStore();
  const upd = (id: string, patch: Partial<CostLine>) => st.updateCostLine(c.id, id, patch);
  const people = c.costLines.filter((l) => l.kind === "people");
  const services = c.costLines.filter((l) => l.kind === "service");
  const shares = c.costLines.filter((l) => l.kind === "share");
  const txt = "w-full min-w-0 rounded-md border border-transparent bg-transparent px-1 py-1 text-sm text-slate-700 outline-none hover:border-slate-200 focus:border-teal-500";
  const payerSel = (l: CostLine) => (
    <select value={l.payer} onChange={(e) => upd(l.id, { payer: e.target.value as Payer })} className="rounded-md border border-slate-200 bg-white px-1 py-1 text-xs">
      {PAYERS.map((p) => (
        <option key={p} value={p}>
          {PAYER_LABEL[p]}
        </option>
      ))}
    </select>
  );
  const del = (l: CostLine) => (
    <button onClick={() => st.removeCostLine(c.id, l.id)} className="rounded p-1 text-slate-300 hover:text-red-600">
      <X className="h-3.5 w-3.5" />
    </button>
  );
  const th = "py-1 text-[11px] font-medium uppercase tracking-wider text-slate-500";

  return (
    <div className={card}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className={`font-serif text-xl ${ink}`}>Who does the work, and who pays</h2>
          <p className="mt-1 text-xs text-slate-500">Internal only. People (our team and SMEs), running services, and partners or grants that cover part of the price.</p>
        </div>
        <button onClick={() => st.applyOfferTemplate(c.id)} className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50" title="Replace the team and services with the offer's standard ones; keeps SMEs and partners">
          <RotateCcw className="h-3.5 w-3.5" /> Use the offer's standard team
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left">
            <tr>
              <th className={th}>People</th>
              <th className={`${th} text-right`}>Hours yr 1</th>
              <th className={`${th} text-right`}>Hours / yr after</th>
              <th className={`${th} text-right`}>Cost $/h</th>
              <th className={`${th} text-right`}>Bill $/h</th>
              <th className={th}>Bill on top</th>
              <th className={th}>Paid by</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {people.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="py-1">
                  <input value={l.label} onChange={(e) => upd(l.id, { label: e.target.value })} className={txt} />
                  {l.personType === "sme" && <span className="ml-1 rounded bg-indigo-50 px-1 text-[10px] text-indigo-700">SME</span>}
                </td>
                <td className="px-1">
                  <NumberField className="ml-auto w-20" unit="hours" value={l.hours ?? 0} onChange={(v) => upd(l.id, { hours: v || 0 })} />
                </td>
                <td className="px-1">
                  <NumberField className="ml-auto w-20" unit="hours" value={l.hoursPerYearAfter ?? 0} onChange={(v) => upd(l.id, { hoursPerYearAfter: v || 0 })} />
                </td>
                <td className="px-1">
                  <NumberField className="ml-auto w-20" unit="$" value={l.costRate ?? 0} onChange={(v) => upd(l.id, { costRate: v || 0 })} />
                </td>
                <td className="px-1">
                  <NumberField className="ml-auto w-20" unit="$" value={l.chargeRate ?? 0} onChange={(v) => upd(l.id, { chargeRate: v || 0 })} />
                </td>
                <td className="px-1 text-center">
                  <input type="checkbox" checked={!!l.addToPrice} onChange={(e) => upd(l.id, { addToPrice: e.target.checked })} className="accent-teal-600" />
                </td>
                <td className="px-1">{payerSel(l)}</td>
                <td>{del(l)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="text-left">
            <tr>
              <th className={th}>Services</th>
              <th className={`${th} text-right`}>One-time</th>
              <th className={`${th} text-right`}>Per month</th>
              <th className={`${th} text-right`}>Months yr 1</th>
              <th className={th}>Keeps running</th>
              <th className={th}>Paid by</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {services.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="py-1">
                  <input value={l.label} onChange={(e) => upd(l.id, { label: e.target.value })} className={txt} />
                </td>
                <td className="px-1">
                  <NumberField className="ml-auto w-24" unit="$" value={l.amount ?? 0} onChange={(v) => upd(l.id, { amount: v || 0 })} />
                </td>
                <td className="px-1">
                  <NumberField className="ml-auto w-24" unit="$" value={l.monthly ?? 0} onChange={(v) => upd(l.id, { monthly: v || 0 })} />
                </td>
                <td className="px-1">
                  <NumberField className="ml-auto w-16" unit="count" value={l.months ?? 0} onChange={(v) => upd(l.id, { months: v || 0 })} />
                </td>
                <td className="px-1 text-center">
                  <input type="checkbox" checked={!!l.ongoing} onChange={(e) => upd(l.id, { ongoing: e.target.checked })} className="accent-teal-600" />
                </td>
                <td className="px-1">{payerSel(l)}</td>
                <td>{del(l)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="text-left">
            <tr>
              <th className={th}>Partners and grants covering the price</th>
              <th className={`${th} text-right`}>Share</th>
              <th className={`${th} text-right`}>or amount</th>
              <th className={th}>Every year</th>
              <th className={th}>Kind</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shares.length === 0 && (
              <tr>
                <td colSpan={6} className="py-1.5 text-xs text-slate-500">
                  None. The client pays the whole price.
                </td>
              </tr>
            )}
            {shares.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="py-1">
                  <input value={l.partner ?? ""} placeholder="Partner name" onChange={(e) => upd(l.id, { partner: e.target.value, label: e.target.value || l.label })} className={txt} />
                </td>
                <td className="px-1">
                  <NumberField className="ml-auto w-20" unit="%" value={l.sharePct ?? 0} onChange={(v) => upd(l.id, { sharePct: v || 0 })} />
                </td>
                <td className="px-1">
                  <NumberField className="ml-auto w-24" unit="$" value={l.shareAmount ?? 0} onChange={(v) => upd(l.id, { shareAmount: v || 0 })} />
                </td>
                <td className="px-1 text-center">
                  <input type="checkbox" checked={!!l.everyYear} onChange={(e) => upd(l.id, { everyYear: e.target.checked })} className="accent-teal-600" />
                </td>
                <td className="px-1">
                  <select value={l.payer === "grant" ? "grant" : "partner"} onChange={(e) => upd(l.id, { payer: e.target.value as Payer })} className="rounded-md border border-slate-200 bg-white px-1 py-1 text-xs">
                    <option value="partner">Partner</option>
                    <option value="grant">Grant</option>
                  </select>
                </td>
                <td>{del(l)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <button onClick={() => st.addCostLine(c.id, { ...SME_EXAMPLE, id: newId(), label: "Subject-matter expert", note: "" })} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-teal-400">
          + SME
        </button>
        <button onClick={() => st.addCostLine(c.id, { id: newId(), kind: "people", personType: "team", label: "Team member", hours: 40, costRate: 100, chargeRate: 200, payer: "ecoheart" })} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-teal-400">
          + Team member
        </button>
        <button onClick={() => st.addCostLine(c.id, { id: newId(), kind: "service", label: "Service", amount: 0, monthly: 0, months: 3, payer: "ecoheart" })} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-teal-400">
          + Service
        </button>
        <button onClick={() => st.addCostLine(c.id, { id: newId(), kind: "share", label: "Partner share", partner: "", sharePct: 25, payer: "partner" })} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-teal-400">
          + Partner or grant share
        </button>
      </div>
    </div>
  );
}
