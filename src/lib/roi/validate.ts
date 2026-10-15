// Fixed checks (code, not AI judgment) for scenarios, clients and use cases,
// plus sensitivity and "gaps" (values still to fill in). The Advisor calls
// these and explains the results; reports print the summary.

import { BLOCK_KEYS, fmtMoney, keysFor, type Basis, type UseCaseModel } from "./engine";
import { clientNoun, type Client } from "./pricing";
import { clientDeal, modelsFor, resolveKey, scenarioInputs, scenarioResult, type Scenario, type Workspace } from "./store";

export type Level = "pass" | "warn" | "fail";

export interface Check {
  id: string;
  level: Level;
  title: string;
  detail: string;
  fix?: string;
}

const UNIT_FOR: Record<string, string[]> = {
  base: ["$"],
  share: ["%"],
  count: ["count"],
  unitCost: ["$"],
  hours: ["hours"],
  rate: ["$"],
  amount: ["$"],
};

/** Checks that a use case is wired correctly (keys exist, units match the blocks). */
export function checkModel(m: UseCaseModel, st: Pick<Workspace, "assumptions">): Check[] {
  const out: Check[] = [];
  const problems: string[] = [];
  for (const l of m.lines)
    for (const role of BLOCK_KEYS[l.block]) {
      const key = l.keys[role];
      const a = key ? st.assumptions.find((x) => x.key === key) : undefined;
      if (!key || !a) problems.push(`"${l.driver}" has no assumption for ${role}`);
      else if (!UNIT_FOR[role].includes(a.unit)) problems.push(`"${l.driver}" uses ${a.label} (${a.unit}) where it needs ${UNIT_FOR[role].join(" or ")}`);
    }
  out.push(
    problems.length
      ? { id: `model-wiring-${m.id}`, level: "fail", title: `${m.name}: lines not wired correctly`, detail: problems.join("; "), fix: "Point each line at an assumption with the right unit." }
      : { id: `model-wiring-${m.id}`, level: "pass", title: `${m.name}: every line is wired to assumptions with the right units`, detail: "" }
  );
  if (!m.lines.length) out.push({ id: `model-empty-${m.id}`, level: "warn", title: `${m.name} has no value lines yet`, detail: "Add at least one line before using it in a scenario." });
  return out;
}

function rangeChecks(keys: string[], basis: Basis, clientId: string, st: Workspace): Check[] {
  const bad: string[] = [];
  const order: string[] = [];
  const client = st.clients.find((c) => c.id === clientId);
  for (const k of keys) {
    const a = st.assumptions.find((x) => x.key === k);
    if (!a) continue;
    const lv = client?.local[k];
    const cols = lv ?? a;
    for (const b of ["low", "expected", "high"] as Basis[]) {
      const v = cols[b];
      if (!Number.isFinite(v)) bad.push(`${a.label} (${b}) is not a number`);
      else if (v < 0) bad.push(`${a.label} is negative`);
      else if (a.unit === "%" && v > 100) bad.push(`${a.label} is over 100%`);
      else if (a.unit === "$" && v > 1e9) bad.push(`${a.label} is over $1 billion; check for a units slip`);
    }
    if (!a.unordered && !(cols.low <= cols.expected && cols.expected <= cols.high) && a.unit === "%")
      order.push(`${a.label}: ${cols.low} / ${cols.expected} / ${cols.high}`);
  }
  const out: Check[] = [];
  out.push(
    bad.length
      ? { id: "ranges", level: "fail", title: "Some values are out of range", detail: [...new Set(bad)].join("; "), fix: "Fix the units or the value." }
      : { id: "ranges", level: "pass", title: "Units and ranges look right", detail: "" }
  );
  if (order.length)
    out.push({ id: "order", level: "warn", title: "Cautious, expected and business case are out of order", detail: order.join("; "), fix: "Cautious should be the lowest share and business case the highest." });
  void basis;
  return out;
}

/** Checks for one scenario on the canvas. */
export function validateScenario(s: Scenario, st: Workspace): Check[] {
  const out: Check[] = [];
  const models = modelsFor(s.modelIds, st);
  const client = st.clients.find((c) => c.id === s.clientId);
  const r = scenarioResult(s, st);
  const keys = keysFor(models);
  if (!models.length) out.push({ id: "no-models", level: "fail", title: "No use case picked", detail: "Pick at least one use case for this scenario." });
  for (const m of models) out.push(...checkModel(m, st).filter((c) => c.level !== "pass"));

  // Sources on anything that drives more than 5% of the value.
  const missing: string[] = [];
  for (const d of r.drivers) {
    if (r.saved <= 0 || d.value / r.saved < 0.05) continue;
    for (const k of d.keys) {
      const rk = resolveKey(k, s.basis, s.clientId, st);
      if (!rk.source?.trim() || !rk.owner?.trim()) missing.push(rk.a?.label ?? k);
    }
  }
  out.push(
    missing.length
      ? { id: "sources", level: "fail", title: "Big drivers without a source or owner", detail: [...new Set(missing)].join("; "), fix: "Add where each number came from and who confirms it." }
      : { id: "sources", level: "pass", title: "Every big driver has a source and an owner", detail: "" }
  );

  out.push(...rangeChecks(keys, s.basis, s.clientId, st));

  // Double counting across use cases.
  const tags = new Map<string, string[]>();
  for (const m of models) for (const l of m.lines) if (l.overlap) tags.set(l.overlap, [...(tags.get(l.overlap) ?? []), `${l.driver} (${m.name})`]);
  const overlaps = [...tags.values()].filter((v) => v.length > 1);
  out.push(
    overlaps.length
      ? { id: "overlap", level: "warn", title: "The same saving may be counted twice", detail: overlaps.map((o) => o.join(" and ")).join("; "), fix: "Lower one of the shares, or drop one line for this client." }
      : { id: "overlap", level: "pass", title: "No saving is counted in two use cases", detail: "" }
  );

  // How much of the result rests on unconfirmed numbers.
  const shaky = r.drivers
    .filter((d) => d.keys.some((k) => {
      const rk = resolveKey(k, s.basis, s.clientId, st);
      return rk.confidence === "low" || rk.from === "proposed";
    }))
    .reduce((x, d) => x + d.value, 0);
  const share = r.saved > 0 ? shaky / r.saved : 0;
  out.push({
    id: "confidence",
    level: share > 0.5 ? "warn" : "pass",
    title: `${Math.round(share * 100)}% of the value depends on estimates still to confirm`,
    detail: share > 0.5 ? "Confirm the biggest low-confidence numbers before sharing this outside the team." : "",
  });

  if (client && client.id !== "hollywood") {
    const placeholder = keys.filter((k) => !client.local[k] && st.assumptions.find((a) => a.key === k)?.unit === "$");
    if (placeholder.length)
      out.push({
        id: "placeholders",
        level: "warn",
        title: `${placeholder.length} dollar figure${placeholder.length === 1 ? "" : "s"} still use library placeholders, not ${client.name}'s own numbers`,
        detail: placeholder.map((k) => st.assumptions.find((a) => a.key === k)?.label ?? k).join("; "),
        fix: `Ask the Advisor to find ${client.name}'s numbers, or enter them on the Clients tab.`,
      });
  }
  if (client) out.push(...validateClient(client, st, s.modelIds.length).filter((c) => c.id !== "proposed" || c.level !== "pass"));
  return out;
}

/** Checks for a client's deal: price, use cases, margin, who pays, compliance. */
export function validateClient(c: Client, st: Workspace, useCaseCount = c.modelIds.length): Check[] {
  const out: Check[] = [];
  const deal = clientDeal(c.id, st);
  if (!deal) return out;
  const y1 = deal.years[0];
  const offer = deal.offer;
  if (!offer) out.push({ id: "offer", level: "fail", title: "No offer picked", detail: "Pick what we are selling this client." });

  out.push({ id: "one-time", level: "pass", title: "One-time work is billed once; yearly increases apply to yearly items only", detail: "" });

  if (offer?.range) {
    const [lo, hi] = offer.range;
    const price = y1.price;
    out.push(
      price < lo || price > hi
        ? { id: "range", level: "warn", title: `Year-one price ${fmtMoney(price)} is outside the ${offer.name} range (${fmtMoney(lo)}–${fmtMoney(hi)})`, detail: offer.kind === "catalog" ? `Catalog items at ${deal.size} size add up to ${fmtMoney(deal.listOneTime + deal.listYearly)}.` : "", fix: "Add or remove catalog items, adjust the price, or decide which price list wins." }
        : { id: "range", level: "pass", title: `Price is inside the ${offer.name} range`, detail: "" }
    );
  }
  if (offer) {
    const [a, b] = offer.useCases;
    if (useCaseCount < a || useCaseCount > b)
      out.push({ id: "use-cases", level: "warn", title: `${useCaseCount} use case${useCaseCount === 1 ? "" : "s"} picked; ${offer.name} covers ${a}${a === b ? "" : `–${b}`}`, detail: "", fix: "Change the use cases or the offer." });
  }

  const floor = st.marginFloorPct ?? 20;
  const pct = deal.total.marginPct * 100;
  out.push(
    pct < floor
      ? { id: "margin", level: pct < 0 ? "fail" : "warn", title: `Margin ${Math.round(pct)}% is below our ${floor}% floor`, detail: `${fmtMoney(deal.total.margin)} on ${fmtMoney(deal.total.price)} over the contract.`, fix: "Raise the price, trim hours, or move some cost to a partner." }
      : { id: "margin", level: "pass", title: `Margin ${Math.round(pct)}% is above our ${floor}% floor`, detail: "" }
  );

  const noPartner = c.costLines.filter((l) => (l.payer === "partner" || l.payer === "grant" || l.kind === "share") && !l.partner?.trim());
  if (noPartner.length) out.push({ id: "partner-name", level: "warn", title: "A partner or grant line has no name", detail: noPartner.map((l) => l.label).join("; "), fix: "Say who is paying." });
  const smeNoRate = c.costLines.filter((l) => l.kind === "people" && !l.costRate);
  if (smeNoRate.length) out.push({ id: "rates", level: "warn", title: "People lines without a cost rate", detail: smeNoRate.map((l) => l.label).join("; ") });

  const ids = deal.items.map((x) => x.item.id);
  if (ids.includes("hipaa") && !/health|hospital|clinic/i.test(c.notes + c.name))
    out.push({ id: "hipaa", level: "warn", title: "HIPAA package charged to a client that may not handle health data", detail: "HIPAA applies to health-care providers and plans, not to most cities.", fix: "Remove HIPAA unless the client handles protected health information." });
  if (c.region === "US" && offer?.itemIds.some((i) => i === "gdpr" || i === "eu-ai-act"))
    out.push({ id: "eu", level: "pass", title: "EU-only packages are left out for a US client", detail: "" });

  if (c.type === "tribal nation" || c.type === "tribal organization") {
    const has = [...c.costLines.map((l) => l.label + " " + (l.note ?? "")), c.notes].some((t) => /sovereign|CARE/i.test(t));
    out.push(
      has
        ? { id: "sovereignty", level: "pass", title: "Tribal data sovereignty is covered", detail: "" }
        : { id: "sovereignty", level: "warn", title: "No tribal data sovereignty step", detail: "Tribal nations own and govern their data (CARE principles).", fix: "Add a people line for a data sovereignty review and the nation's own consent step." }
    );
  }

  const proposed = Object.entries(c.local).filter(([, v]) => v.status === "proposed");
  out.push(
    proposed.length
      ? { id: "proposed", level: "warn", title: `${proposed.length} value${proposed.length === 1 ? "" : "s"} proposed by the Advisor wait for a person to confirm`, detail: proposed.map(([k]) => st.assumptions.find((a) => a.key === k)?.label ?? k).join("; "), fix: `Review them on the Clients tab for ${c.name}.` }
      : { id: "proposed", level: "pass", title: "No unconfirmed values from the Advisor", detail: "" }
  );
  void clientNoun;
  return out;
}

export function summarizeChecks(checks: Check[]) {
  return {
    fail: checks.filter((c) => c.level === "fail").length,
    warn: checks.filter((c) => c.level === "warn").length,
    pass: checks.filter((c) => c.level === "pass").length,
  };
}

/** Which inputs move net value most, and where each breaks even. */
export function sensitivity(s: Scenario, st: Workspace, top = 3) {
  const base = scenarioResult(s, st).net;
  const keys = keysFor(modelsFor(s.modelIds, st));
  const v0 = scenarioInputs(s, st);
  const netWith = (k: string, x: number) => scenarioResult({ ...s, overrides: { ...s.overrides, [k]: x } }, st).net;
  const rows = keys.map((k) => {
    const a = st.assumptions.find((x) => x.key === k);
    const lv = st.clients.find((c) => c.id === s.clientId)?.local[k];
    const cols = lv ?? a;
    const lo = cols ? Math.min(cols.low, cols.high) : v0[k];
    const hi = cols ? Math.max(cols.low, cols.high) : v0[k];
    const atLo = netWith(k, lo);
    const atHi = netWith(k, hi);
    const step = Math.max(1, Math.abs(v0[k]) * 0.01);
    const slope = (netWith(k, v0[k] + step) - base) / step;
    const breakEven = slope !== 0 ? v0[k] - base / slope : null;
    return { key: k, label: a?.label ?? k, unit: a?.unit ?? "", now: v0[k], low: lo, high: hi, netAtLow: atLo, netAtHigh: atHi, swing: Math.abs(atHi - atLo), breakEven: breakEven !== null && breakEven >= 0 ? breakEven : null };
  });
  return rows.sort((a, b) => b.swing - a.swing).slice(0, top);
}

/** Values a client still needs, most important first. */
export function gaps(clientId: string, st: Workspace, modelIds?: string[]) {
  const c = st.clients.find((x) => x.id === clientId);
  if (!c) return [];
  const ids = modelIds ?? c.modelIds;
  const s: Scenario = { id: "_gaps", name: "", clientId, modelIds: ids, question: "", basis: "expected", overrides: {}, notes: "", createdBy: "agent", createdAt: 0 };
  const swing = new Map(sensitivity(s, st, 999).map((r) => [r.key, r.swing]));
  return keysFor(modelsFor(ids, st))
    .map((k) => {
      const rk = resolveKey(k, "expected", clientId, st);
      return {
        key: k,
        label: rk.a?.label ?? k,
        unit: rk.a?.unit ?? "",
        status: rk.from === "library" ? (c.id === "hollywood" ? "Hollywood's own number" : "library placeholder") : rk.from === "proposed" ? "proposed, to confirm" : "client's own number",
        confidence: rk.confidence,
        expected: rk.value,
        impact: swing.get(k) ?? 0,
      };
    })
    .filter((g) => g.status !== "client's own number" || g.confidence === "low")
    .sort((a, b) => b.impact - a.impact);
}
