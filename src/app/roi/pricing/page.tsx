"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Plus, RotateCcw, X } from "lucide-react";
import { fmtMoney } from "@/lib/roi/engine";
import { DEFAULT_CATALOG, DEFAULT_OFFERS } from "@/lib/roi/defaults";
import { STATE_CITY_COUNTS } from "@/lib/roi/data/state-counts";
import { bundleSummary, itemPrice, offerCostYear1, offerPrice, offersWithItem, offerYears, SIZES, type Size } from "@/lib/roi/pricing";
import { pricingWorkbook } from "@/lib/roi/export";
import { newId, useRoiStore } from "@/lib/roi/store";
import { ExportButtons, NumberField, Stat, ink } from "@/components/roi/ui";

const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6";
const th = "py-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500";

export default function RoiPricing() {
  const st = useRoiStore();
  const [size, setSize] = useState<Size>("Mid-size");
  const [esc, setEsc] = useState(3);
  const [open, setOpen] = useState<string | null>(null);
  const categories = Array.from(new Set(st.catalog.map((c) => c.category)));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={`font-serif text-3xl italic md:text-4xl ${ink}`}>Pricing</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Sandrine's catalog by client size, our offers (including the CitySense pilot tiers), volume discounts and
            state bundles. Internal only: behind the team password and never shown to clients. Shared with the team.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons label="Price list" internal get={() => pricingWorkbook(useRoiStore.getState(), esc)} />
          <div className="flex rounded-full bg-slate-100 p-0.5 text-xs">
            {SIZES.map((z) => (
              <button key={z} onClick={() => setSize(z)} className={`rounded-full px-3 py-1 font-medium ${size === z ? "bg-white text-[#0F172A] shadow" : "text-slate-500"}`}>
                {z}
              </button>
            ))}
          </div>
          <button onClick={st.resetPricing} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      </section>

      {/* Offers */}
      <section className={card}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className={`font-serif text-xl ${ink}`}>What each offer bills a {size} client</h2>
            <p className="mt-1 max-w-3xl text-xs text-slate-500">
              The menu of offers. A client buys one of them (and can add the Ongoing service from year two on the Clients
              tab). One-time work bills in year one only; yearly items bill every year, with the yearly increase from year
              two. Click a row to see what it is made of.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            Yearly increase
            <NumberField className="w-20" unit="%" value={esc} onChange={(v) => setEsc(v || 0)} />
          </label>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left">
              <tr>
                <th className={th}>Offer</th>
                <th className={`${th} px-1 text-right`}>One-time</th>
                <th className={`${th} px-1 text-right`}>Yearly</th>
                <th className={`${th} px-2 text-right`}>Year 1</th>
                <th className={`${th} px-2 text-right`}>Year 2</th>
                <th className={`${th} px-2 text-right`}>Year 3</th>
                <th className={`${th} px-2 text-right`}>3 years</th>
                <th className={`${th} px-2 text-right`} title="Price band published in the CitySense pilot brochure">CitySense range</th>
                <th className={`${th} px-2 text-right`} title="Internal: ecoheart-paid lines of the offer's delivery plan, year one">Our cost yr 1</th>
                <th className={`${th} px-2 text-right`}>Margin</th>
              </tr>
            </thead>
            <tbody>
              {st.offers.map((o) => {
                const p = offerPrice(o, size, "US", st.catalog);
                const ys = offerYears(o, size, "US", st.catalog, 3, esc);
                const y1 = ys[0].total;
                const out = o.range && (y1 < o.range[0] || y1 > o.range[1]);
                const d = DEFAULT_OFFERS.find((x) => x.id === o.id);
                const cost = offerCostYear1(o);
                const margin = y1 > 0 ? (y1 - cost) / y1 : 0;
                const isOpen = open === o.id;
                return (
                  <Fragment key={o.id}>
                    <tr className="border-t border-slate-100 align-middle">
                      <td className="py-2 pr-2">
                        <button onClick={() => setOpen(isOpen ? null : o.id)} className="flex items-start gap-1 text-left">
                          {isOpen ? <ChevronDown className="mt-0.5 h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="mt-0.5 h-3.5 w-3.5 text-slate-400" />}
                          <span>
                            <span className={`block font-medium ${ink}`}>{o.name}</span>
                            <span className="block text-xs text-slate-500">
                              {o.length} · {o.kind === "catalog" ? `${p.items.length} catalog items` : "fixed price"} · {o.useCases[0]}
                              {o.useCases[1] !== o.useCases[0] ? `–${o.useCases[1]}` : ""} use case{o.useCases[1] === 1 ? "" : "s"}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-1 text-right tabular-nums">
                        {o.kind === "fixed" ? (
                          <NumberField className="ml-auto w-24" unit="$" value={o.oneTime} changed={d?.oneTime !== o.oneTime} onChange={(v) => st.updateOffer(o.id, { oneTime: v || 0 })} />
                        ) : (
                          fmtMoney(p.oneTime)
                        )}
                      </td>
                      <td className="px-1 text-right tabular-nums">
                        {o.kind === "fixed" ? (
                          <NumberField className="ml-auto w-24" unit="$" value={o.yearly} changed={d?.yearly !== o.yearly} onChange={(v) => st.updateOffer(o.id, { yearly: v || 0 })} />
                        ) : (
                          fmtMoney(p.yearly)
                        )}
                      </td>
                      <td className={`px-2 text-right font-medium tabular-nums ${out ? "text-amber-700" : ink}`}>{fmtMoney(y1)}</td>
                      <td className="px-2 text-right tabular-nums text-slate-600">{fmtMoney(ys[1].total)}</td>
                      <td className="px-2 text-right tabular-nums text-slate-600">{fmtMoney(ys[2].total)}</td>
                      <td className={`px-2 text-right tabular-nums ${ink}`}>{fmtMoney(ys.reduce((s, y) => s + y.total, 0))}</td>
                      <td className="px-2 text-right text-xs text-slate-500">{o.range ? `${fmtMoney(o.range[0])}–${fmtMoney(o.range[1])}` : "—"}</td>
                      <td className="px-2 text-right text-xs tabular-nums text-slate-500">{fmtMoney(cost)}</td>
                      <td className={`px-2 text-right text-xs tabular-nums ${margin * 100 < st.marginFloorPct ? "text-amber-700" : "text-slate-500"}`}>{y1 > 0 ? `${Math.round(margin * 100)}%` : "—"}</td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-[#F7F6F2]/60">
                        <td colSpan={10} className="px-3 py-2 text-xs text-slate-600">
                          <div className="mb-1">{o.notes}</div>
                          {o.kind === "catalog" ? (
                            <table className="w-full max-w-2xl">
                              <tbody>
                                {p.items.map(({ item, price }) => (
                                  <tr key={item.id} className="border-t border-slate-200/70">
                                    <td className="py-0.5 pr-2">{item.name}</td>
                                    <td className="pr-2 text-slate-400">{item.category}</td>
                                    <td className="pr-2">{item.recurring ? "yearly" : "once"}</td>
                                    <td className="text-right tabular-nums">{fmtMoney(price)}</td>
                                  </tr>
                                ))}
                                <tr className="border-t border-slate-300 font-medium">
                                  <td className="py-0.5" colSpan={3}>
                                    Total ({fmtMoney(p.oneTime)} once + {fmtMoney(p.yearly)} yearly)
                                  </td>
                                  <td className="text-right tabular-nums">{fmtMoney(y1)}</td>
                                </tr>
                              </tbody>
                            </table>
                          ) : (
                            <div>
                              Fixed price, not built from catalog items. Delivery plan (internal):{" "}
                              {o.costTemplate.filter((l) => l.kind === "people").map((l) => `${l.label} ${l.hours} h`).join(" · ")}
                              {o.costTemplate.some((l) => l.kind === "service") ? " · hosting and AI running costs" : ""}.
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          The CitySense published range is the price band printed in the CitySense pilot brochure. Amber means the catalog
          price falls outside it at this size; which list wins is an open decision for Ahmed and Marcia. Our cost and margin
          are year one, from each offer's delivery plan (the same hours at every size for now), and are internal.
        </p>
      </section>

      {/* Catalog */}
      <section className={card}>
        <h2 className={`font-serif text-xl ${ink}`}>Catalog prices for a {size} client</h2>
        <p className="mt-1 text-xs text-slate-500">From Sandrine's workbook. Quantity is hours × people. One-time work is billed once; the yearly increase applies to yearly items only. "In offers" shows which offers include each item; a client buys one offer, so an item is billed once. Prices are in US dollars and exclude sales tax and VAT; prices outside the US need local adjustment.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left">
              <tr>
                <th className={th}>Item</th>
                <th className={th}>Billed</th>
                <th className={th}>Where</th>
                <th className={`${th} text-right`}>Quantity</th>
                <th className={`${th} text-right`}>Rate</th>
                <th className={`${th} text-right`}>Price</th>
                <th className={`${th} px-2`}>In offers</th>
              </tr>
            </thead>
            {categories.map((cat) => (
              <tbody key={cat}>
                <tr>
                  <td colSpan={7} className={`bg-[#F7F6F2] px-2 py-1 font-serif text-sm italic ${ink}`}>
                    {cat}
                  </td>
                </tr>
                {st.catalog
                  .filter((c) => c.category === cat)
                  .map((it) => {
                    const d = DEFAULT_CATALOG.find((x) => x.id === it.id);
                    const s = it.bySize[size];
                    return (
                      <tr key={it.id} className="border-t border-slate-100 align-middle">
                        <td className="py-1.5 pr-2">
                          <div className="text-slate-700">{it.name}</div>
                          <div className="line-clamp-1 text-[11px] text-slate-400">{it.description}</div>
                        </td>
                        <td className="px-1">
                          <select
                            value={it.recurring ? "yearly" : "once"}
                            onChange={(e) => st.updateCatalogItem(it.id, { recurring: e.target.value === "yearly" })}
                            className={`rounded-md border px-1 py-0.5 text-xs ${d && d.recurring !== it.recurring ? "border-teal-500" : "border-slate-200"}`}
                          >
                            <option value="once">Once</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </td>
                        <td className="px-1 text-xs text-slate-500">{it.region === "all" ? "US and EU" : it.region}</td>
                        <td className="px-1">
                          <NumberField className="ml-auto w-24" unit="count" value={s.qty} changed={d?.bySize[size].qty !== s.qty} onChange={(v) => st.setCatalogSize(it.id, size, { qty: v || 0 })} />
                        </td>
                        <td className="px-1">
                          <NumberField className="ml-auto w-24" unit="$" value={s.rate} changed={d?.bySize[size].rate !== s.rate} onChange={(v) => st.setCatalogSize(it.id, size, { rate: v || 0 })} />
                        </td>
                        <td className={`px-1 text-right tabular-nums ${ink}`}>{fmtMoney(itemPrice(it, size))}</td>
                        <td className="px-2 text-[11px] text-slate-500">
                          {offersWithItem(it.id, st.offers)
                            .map((o) => o.name.replace("CitySense ", ""))
                            .join(", ") || "—"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            ))}
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Discounts */}
        <section className={card}>
          <h2 className={`font-serif text-xl ${ink}`}>Volume discounts</h2>
          <p className="mt-1 text-xs text-slate-500">
            From the workbook. Only bundles get a volume discount, and only one discount applies: the row is picked by how
            many places are in the bundle, and the column by each place's size. Untick a row to stop offering it.
          </p>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left">
              <tr>
                <th className={th}>Places</th>
                {SIZES.map((z) => (
                  <th key={z} className={`${th} text-right`}>
                    {z}
                  </th>
                ))}
                <th className={`${th} pl-3`}>Allowed</th>
              </tr>
            </thead>
            <tbody>
              {st.discounts.map((r, i) => (
                <tr key={i} className={`border-t border-slate-100 ${r.allowed ? "" : "opacity-50"}`}>
                  <td className="py-1 text-xs text-slate-600">
                    {r.from}–{r.to}
                  </td>
                  {SIZES.map((z) => (
                    <td key={z} className="px-1">
                      <NumberField
                        className="ml-auto w-16"
                        unit="%"
                        value={r.pct[z]}
                        onChange={(v) => st.setDiscounts(st.discounts.map((x, j) => (j === i ? { ...x, pct: { ...x.pct, [z]: v || 0 } } : x)))}
                      />
                    </td>
                  ))}
                  <td className="px-1 text-center">
                    <input type="checkbox" checked={r.allowed} onChange={(e) => st.setDiscounts(st.discounts.map((x, j) => (j === i ? { ...x, allowed: e.target.checked } : x)))} className="accent-teal-600" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Size bands and floor */}
        <section className={card}>
          <h2 className={`font-serif text-xl ${ink}`}>Size bands and margin floor</h2>
          <p className="mt-1 text-xs text-slate-500">Size comes from people served. For non-city clients, set the size by hand on the Clients tab.</p>
          <div className="mt-3 space-y-2 text-sm">
            {(
              [
                ["Small below", "smallBelow"],
                ["Mid-size below", "midBelow"],
                ["Large below", "largeBelow"],
              ] as const
            ).map(([l, k]) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <span className="text-slate-700">{l}</span>
                <NumberField className="w-32" unit="count" value={st.sizeBands[k]} onChange={(v) => st.setSizeBands({ ...st.sizeBands, [k]: v || 0 })} />
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
              <span className="text-slate-700">Lowest margin we accept</span>
              <NumberField className="w-32" unit="%" value={st.marginFloorPct} onChange={(v) => st.setMarginFloor(v || 0)} />
            </div>
          </div>
        </section>
      </div>

      <Bundles />
    </div>
  );
}

function Bundles() {
  const st = useRoiStore();
  const states = Object.keys(STATE_CITY_COUNTS).sort();
  return (
    <section className={card}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className={`font-serif text-xl ${ink}`}>State and regional bundles</h2>
          <p className="mt-1 text-xs text-slate-500">
            Every city in a state (a planning ceiling, not a likely deal), or a hand-picked group of clients such as a
            county group or tribal consortium. Priced one subscription per city, an open question from ChaiJen.
          </p>
        </div>
        <button
          onClick={() => st.addBundle({ id: newId(), name: "New bundle", state: "Florida", clientIds: [], offerId: "supported-pilot", years: 3, escalatorPct: 1.5 })}
          className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" /> Add a bundle
        </button>
      </div>
      <div className="mt-4 space-y-4">
        {st.bundles.map((b) => {
          const s = bundleSummary(b, st.clients, st.offers, st.catalog, st.discounts, st.sizeBands);
          return (
            <div key={b.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <input value={b.name} onChange={(e) => st.updateBundle(b.id, { name: e.target.value })} className={`min-w-0 flex-1 bg-transparent font-medium outline-none ${ink}`} />
                <button onClick={() => st.removeBundle(b.id)} className="rounded p-1 text-slate-300 hover:text-red-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <select value={b.state ?? ""} onChange={(e) => st.updateBundle(b.id, { state: e.target.value || undefined })} className="rounded-md border border-slate-200 px-1 py-1">
                  <option value="">No state (clients only)</option>
                  {states.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                <select value={b.offerId} onChange={(e) => st.updateBundle(b.id, { offerId: e.target.value })} className="rounded-md border border-slate-200 px-1 py-1">
                  {st.offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <span>Years</span>
                <NumberField className="w-16" unit="count" value={b.years} onChange={(v) => st.updateBundle(b.id, { years: Math.max(1, Math.round(v || 1)) })} />
                <span>Yearly increase</span>
                {b.years > 1 ? (
                  <NumberField className="w-20" unit="%" value={b.escalatorPct} onChange={(v) => st.updateBundle(b.id, { escalatorPct: v || 0 })} />
                ) : (
                  <span className="text-slate-400">none on a one-year term</span>
                )}
              </div>
              {b.state && STATE_CITY_COUNTS[b.state] ? (
                <p className="mt-2 text-[11px] text-slate-500">
                  Counts every city in {b.state} from the workbook's city list. To price a hand-picked group instead, choose
                  "No state".
                  {s.ignored.length ? <span className="text-amber-700"> Left out because they are not part of a statewide count: {s.ignored.join(", ")}.</span> : null}
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {st.clients.map((c) => {
                    const on = b.clientIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => st.updateBundle(b.id, { clientIds: on ? b.clientIds.filter((x) => x !== c.id) : [...b.clientIds, c.id] })}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] ring-1 ${on ? "bg-teal-600 text-white ring-teal-600" : "text-slate-600 ring-slate-200"}`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
                <Stat label="Places" value={s.cities.toLocaleString()} hint={SIZES.map((z) => `${s.counts[z]} ${z}`).join(" · ")} />
                <Stat label="Year one" value={fmtMoney(s.years[0]?.total ?? 0)} />
                <Stat label={`Contract (${s.years.length} yr)`} value={fmtMoney(s.total)} />
                <Stat label="Yearly recurring" value={fmtMoney(s.arr)} hint="yearly items × places, after discount" />
              </div>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <table className="w-full text-xs">
                  <thead className="text-left">
                    <tr>
                      <th className={th}>Each place</th>
                      <th className={`${th} text-right`}>Places</th>
                      <th className={`${th} text-right`}>One-time</th>
                      <th className={`${th} text-right`}>Yearly</th>
                      <th className={`${th} text-right`}>Discount</th>
                      <th className={`${th} text-right`}>Year one</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.bySize
                      .filter((x) => x.count)
                      .map((x) => (
                        <tr key={x.size} className="border-t border-slate-100 tabular-nums">
                          <td className="py-0.5">{x.size}</td>
                          <td className="text-right">{x.count}</td>
                          <td className="text-right">{fmtMoney(x.oneTimeEach)}</td>
                          <td className="text-right">{fmtMoney(x.yearlyEach)}</td>
                          <td className="text-right">{x.discountPct ? `${x.discountPct}%` : "—"}</td>
                          <td className="text-right">{fmtMoney(x.year1)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <table className="w-full text-xs">
                  <thead className="text-left">
                    <tr>
                      <th className={th}>Billed in</th>
                      <th className={`${th} text-right`}>One-time</th>
                      <th className={`${th} text-right`}>Yearly</th>
                      <th className={`${th} text-right`}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.years.map((y) => (
                      <tr key={y.year} className="border-t border-slate-100 tabular-nums">
                        <td className="py-0.5">Year {y.year}</td>
                        <td className="text-right">{fmtMoney(y.oneTime)}</td>
                        <td className="text-right">{fmtMoney(y.recurring)}</td>
                        <td className="text-right">{fmtMoney(y.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Each place is billed on its own price for its size.{" "}
                {s.discountRow >= 0
                  ? `Volume discount row ${st.discounts[s.discountRow].from}–${st.discounts[s.discountRow].to} places applies.`
                  : "No volume discount applies."}{" "}
                If invoiced quarterly, year one is {fmtMoney(s.quarterly)} a quarter; that is the billing schedule, not how the
                revenue is recognised.
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
