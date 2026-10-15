"use client";

// Export a use case, a client's deal and cost model, or a scenario to CSV or Excel.
// Tables are built from the same calculator the tabs use, so the numbers match.
// Excel export loads exceljs only when someone clicks it.

import { BASIS_LABEL } from "./defaults";
import { BLOCK_LABEL, formulaText, keysFor, lineValue, type Basis } from "./engine";
import { PAYER_LABEL, type CostLine } from "./pricing";
import { clientDeal, modelsFor, resolveKey, scenarioInputs, scenarioResult, type Workspace, type Scenario } from "./store";

export type Cell = string | number | boolean | null | undefined;
export interface Sheet {
  name: string;
  rows: Cell[][]; // first row is the header
}
export interface Workbook {
  title: string;
  sheets: Sheet[];
}

type St = Workspace & { scenarios: Scenario[] };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "export";
const round = (n: number) => Math.round(n * 100) / 100;

/** A use case: its value lines and every assumption it reads (library and, if given, one client's values). */
export function useCaseWorkbook(modelId: string, st: St, clientId?: string, basis: Basis = "expected"): Workbook | null {
  const m = st.models.find((x) => x.id === modelId);
  if (!m) return null;
  const client = clientId ? st.clients.find((c) => c.id === clientId) : undefined;
  const labelOf = (k: string) => st.assumptions.find((a) => a.key === k)?.label ?? k;
  const values: Record<string, number> = {};
  for (const k of keysFor([m])) values[k] = resolveKey(k, basis, client?.id ?? "", st).value;
  const lines: Cell[][] = [
    ["Use case", "Line", "Block", "Formula", "Assumption keys", "Overlap tag", `Yearly value (${BASIS_LABEL[basis]}${client ? `, ${client.name}` : ", library"})`],
    ...m.lines.map((l) => [m.name, l.driver, BLOCK_LABEL[l.block], formulaText(l, labelOf), Object.values(l.keys).join(", "), l.overlap ?? "", round(lineValue(l, values).value)]),
    ...m.clientCosts.map((c) => [m.name, c.label, "Client spends", `${labelOf(c.count)} × ${labelOf(c.unitCost)}`, `${c.count}, ${c.unitCost}`, "", round(-(values[c.count] ?? 0) * (values[c.unitCost] ?? 0))]),
    ...m.outcomes.map((o) => [m.name, o.label, "Outcome (not in dollars)", labelOf(o.key), o.key, "", values[o.key] ?? 0]),
  ];
  const assumptions: Cell[][] = [
    ["Key", "Assumption", "Unit", "Cautious", "Expected", "Business case", ...(client ? [`${client.name} (${BASIS_LABEL[basis]})`, "Where it comes from"] : []), "Source", "Confidence", "Owner"],
    ...keysFor([m]).map((k) => {
      const a = st.assumptions.find((x) => x.key === k);
      const rk = resolveKey(k, basis, client?.id ?? "", st);
      return [
        k,
        a?.label ?? k,
        a?.unit ?? "",
        a?.low,
        a?.expected,
        a?.high,
        ...(client ? [rk.value, rk.from === "library" ? "library placeholder" : rk.from === "proposed" ? "proposed, to confirm" : "client's own"] : []),
        rk.source,
        rk.confidence,
        rk.owner,
      ];
    }),
  ];
  const about: Cell[][] = [
    ["Field", "Value"],
    ["Use case", m.name],
    ["Super-system", m.superSystem],
    ["Description", m.description],
    ["Status", m.status],
    ["Exported", new Date().toISOString()],
  ];
  return { title: `ecoheart use case - ${m.name}${client ? ` - ${client.name}` : ""}`, sheets: [{ name: "Use case", rows: about }, { name: "Value lines", rows: lines }, { name: "Assumptions", rows: assumptions }] };
}

function costLineRow(l: CostLine): Cell[] {
  const yr1 =
    l.kind === "people" ? (l.hours ?? 0) * (l.costRate ?? 0) : l.kind === "service" ? (l.amount ?? 0) + (l.monthly ?? 0) * (l.months ?? 0) : null;
  return [
    l.kind === "people" ? (l.personType === "sme" ? "SME" : "Team") : l.kind === "service" ? "Service" : "Partner or grant share",
    l.label,
    PAYER_LABEL[l.payer],
    l.partner ?? "",
    l.hours,
    l.hoursPerYearAfter,
    l.costRate,
    l.chargeRate,
    l.addToPrice ? "yes" : "",
    l.amount,
    l.monthly,
    l.months,
    l.ongoing ? "yes" : "",
    l.sharePct,
    l.shareAmount,
    l.everyYear ? "yes" : "",
    yr1 === null ? null : round(yr1),
    l.note ?? "",
  ];
}

/** A client's deal and cost model (internal: our costs and margin). */
export function clientWorkbook(clientId: string, st: St): Workbook | null {
  const c = st.clients.find((x) => x.id === clientId);
  const deal = clientDeal(clientId, st);
  if (!c || !deal) return null;
  const profile: Cell[][] = [
    ["Field", "Value"],
    ["Client", c.name],
    ["Type", c.type],
    ["State, country or region", c.state],
    ["People served", c.population],
    ["Size", deal.size],
    ["Use cases", modelsFor(c.modelIds, st).map((m) => m.name).join(", ")],
    ["Offer", deal.offer?.name],
    ["Then from year 2", deal.ongoing?.name ?? ""],
    ["Contract years", c.contract.years],
    ["Yearly increase %", c.contract.escalatorPct],
    ["Payments", c.contract.payments],
    ["List price one-time", deal.listOneTime],
    ["List price yearly", deal.listYearly],
    ["People billed on top", deal.billedPeople],
    ["Contract price", round(deal.total.price)],
    ["Client pays (contract)", round(deal.total.clientPays)],
    ["Partners and grants (contract)", round(deal.total.partners)],
    ["Our cost (contract)", round(deal.total.ourCost)],
    ["Margin (contract)", round(deal.total.margin)],
    ["Margin %", round(deal.total.marginPct * 100)],
    ["Yearly recurring (ARR)", round(deal.arr)],
    ["Monthly recurring (MRR)", round(deal.mrr)],
    ["Notes", c.notes],
    ["Exported", new Date().toISOString()],
    ["", "Internal: contains our costs and margin. Do not send to the client."],
  ];
  const years: Cell[][] = [
    ["Year", "Price", "Partners and grants", "Client pays ecoheart", "Client's own services", "Our cost", "Margin", "Recurring part"],
    ...deal.years.map((y) => [y.year, round(y.price), round(y.shares.reduce((s, x) => s + x.amount, 0)), round(y.clientPaysEcoheart), round(y.clientDirect), round(y.ourCost), round(y.margin), round(y.recurring)]),
  ];
  const costs: Cell[][] = [
    ["Kind", "Label", "Paid by", "Partner", "Hours yr 1", "Hours / yr after", "Cost $/h", "Bill $/h", "Billed on top", "One-time $", "Monthly $", "Months yr 1", "Keeps running", "Share %", "Share $", "Every year", "Year-one cost", "Note"],
    ...c.costLines.map(costLineRow),
  ];
  const who: Cell[][] = [["Who", "Name", "Year one"], ...deal.whoPaysYear1.map((w) => [PAYER_LABEL[w.payer], w.label, round(w.amount)])];
  const adj: Cell[][] = [["Adjustment", "Kind", "Value", "Applies to", "Reason"], ...c.adjustments.map((a) => [a.label, a.kind === "pct" ? "%" : "$", a.value, a.appliesTo === "year1" ? "year one" : "every year", a.reason])];
  const own: Cell[][] = [
    ["Key", "Assumption", "Cautious", "Expected", "Business case", "Status", "Source", "Confidence", "Owner"],
    ...Object.entries(c.local).map(([k, v]) => [k, st.assumptions.find((a) => a.key === k)?.label ?? k, v.low, v.expected, v.high, v.status, v.source, v.confidence, v.owner]),
  ];
  const sheets: Sheet[] = [
    { name: "Deal", rows: profile },
    { name: "By year", rows: years },
    { name: "Cost lines", rows: costs },
    { name: "Who pays", rows: who },
    { name: "Adjustments", rows: adj },
    { name: "Own numbers", rows: own },
  ];
  if (deal.items.length)
    sheets.push({
      name: "Catalog items",
      rows: [["Item", "Category", "Billed", "Price at " + deal.size], ...deal.items.map((x) => [x.item.name, x.item.category, x.item.recurring ? "yearly" : "once", round(x.price)])],
    });
  return { title: `ecoheart cost model - ${c.name}`, sheets };
}

/** A scenario: headline, value by line, and every input with where it came from. */
export function scenarioWorkbook(scenarioId: string, st: St): Workbook | null {
  const s = st.scenarios.find((x) => x.id === scenarioId);
  if (!s) return null;
  const client = st.clients.find((c) => c.id === s.clientId);
  const models = modelsFor(s.modelIds, st);
  const r = scenarioResult(s, st);
  const inputs = scenarioInputs(s, st);
  const summary: Cell[][] = [
    ["Field", "Value"],
    ["Scenario", s.name],
    ["Client", client?.name],
    ["Use cases", models.map((m) => m.name).join(", ")],
    ["Case", BASIS_LABEL[s.basis]],
    ["Question", s.question],
    ["Total value, year one", round(r.saved)],
    ["Payment to ecoheart, year one", round(r.fee)],
    ["Client's own spending", round(r.clientCosts)],
    ["Spent", round(r.spent)],
    ["Net value, year one", round(r.net)],
    ["Back per $1 spent", round(r.returnPerDollar)],
    ["Payback (months)", r.paybackMonths],
    ["Notes", s.notes],
    ["Exported", new Date().toISOString()],
  ];
  const value: Cell[][] = [
    ["Use case", "Where the value comes from", "Block", "Year one"],
    ...r.drivers.map((d) => [models.find((m) => m.id === d.model)?.name, d.label, BLOCK_LABEL[d.block], round(d.value)]),
  ];
  const costs: Cell[][] = [["Line", "Today", "With the Advisor"], ...r.lines.map((l) => [l.label, round(l.today), round(l.withAdvisor)])];
  const ins: Cell[][] = [
    ["Key", "Assumption", "Unit", "Value used", "Where it comes from", "Source", "Confidence", "Owner"],
    ...keysFor(models).map((k) => {
      const rk = resolveKey(k, s.basis, s.clientId, st);
      const from = k in s.overrides ? "this scenario (what-if)" : rk.from === "library" ? "library" : rk.from === "proposed" ? "client, proposed" : "client's own";
      return [k, rk.a?.label ?? k, rk.a?.unit ?? "", inputs[k], from, rk.source, rk.confidence, rk.owner];
    }),
  ];
  const out: Cell[][] = [["Outcome (not in dollars)", "Value"], ...r.outcomes.map((o) => [o.label, o.value])];
  return {
    title: `ecoheart scenario - ${s.name}`,
    sheets: [
      { name: "Summary", rows: summary },
      { name: "Value", rows: value },
      { name: "Costs today vs with", rows: costs },
      { name: "Inputs", rows: ins },
      ...(r.outcomes.length ? [{ name: "Outcomes", rows: out }] : []),
    ],
  };
}

const csvCell = (v: Cell) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One CSV file; several tables are stacked with a title line between them. */
export function toCsv(wb: Workbook) {
  return wb.sheets.map((sh) => [`# ${sh.name}`, ...sh.rows.map((r) => r.map(csvCell).join(","))].join("\n")).join("\n\n");
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function download(wb: Workbook, format: "csv" | "xlsx") {
  const base = slug(wb.title);
  if (format === "csv") {
    // BOM so Excel reads the $ and × characters correctly.
    save(new Blob(["﻿" + toCsv(wb)], { type: "text/csv;charset=utf-8" }), `${base}.csv`);
    return `${base}.csv`;
  }
  const ExcelJS = (await import("exceljs")).default;
  const book = new ExcelJS.Workbook();
  book.creator = "ecoheart ROI Advisor";
  for (const sh of wb.sheets) {
    const ws = book.addWorksheet(sh.name.slice(0, 31));
    sh.rows.forEach((r) => ws.addRow(r.map((v) => (v === undefined ? null : v))));
    ws.getRow(1).font = { bold: true };
    ws.columns.forEach((col) => {
      let w = 10;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        w = Math.max(w, Math.min(60, String(cell.value ?? "").length + 2));
      });
      col.width = w;
    });
  }
  const buf = await book.xlsx.writeBuffer();
  save(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${base}.xlsx`);
  return `${base}.xlsx`;
}
