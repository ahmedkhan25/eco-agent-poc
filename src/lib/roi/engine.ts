// Deterministic ROI math for the ROI Advisor. The agent only chooses inputs;
// every number shown comes from computeRoi(), so results are repeatable.
//
// A use case (model) is a list of value lines. Each line is one of four
// building blocks, so a new kind of saving never needs new math:
//   costAvoided    base ($/yr) x share avoided (%)
//   eventsAvoided  events per year x cost per event x share avoided (%)
//   timeSaved      hours per year x loaded hourly rate
//   newMoney       dollars at stake per year x improvement (%)
// The client's own spending for a use case (for example micro-grants it funds)
// is a clientCost line: count x unit cost.

export type Basis = "low" | "expected" | "high";
export type Confidence = "low" | "medium" | "high";
export type Unit = "$" | "%" | "hours" | "count";
export type Block = "costAvoided" | "eventsAvoided" | "timeSaved" | "newMoney";

export const SUPER_SYSTEMS = ["Governance", "Economy", "Infrastructure", "Environment", "Social", "Safety", "Engagement"] as const;
export type SuperSystem = (typeof SUPER_SYSTEMS)[number];

/** The assumption keys each building block reads, in formula order. */
export const BLOCK_KEYS: Record<Block, ("base" | "share" | "count" | "unitCost" | "hours" | "rate" | "amount")[]> = {
  costAvoided: ["base", "share"],
  eventsAvoided: ["count", "unitCost", "share"],
  timeSaved: ["hours", "rate"],
  newMoney: ["amount", "share"],
};

export const BLOCK_LABEL: Record<Block, string> = {
  costAvoided: "Cost avoided",
  eventsAvoided: "Events avoided",
  timeSaved: "Time saved",
  newMoney: "New money won",
};

export interface Assumption {
  key: string;
  label: string;
  /** Use-case id, or "shared" when several use cases read it. */
  model: string;
  group: string;
  unit: Unit;
  low: number; // cautious
  expected: number;
  high: number; // business case
  source: string;
  confidence: Confidence;
  owner: string;
  /** Cautious > business case on purpose (explained in the source). */
  unordered?: boolean;
  createdBy?: "advisor" | "person";
}

export interface ValueLine {
  id: string;
  /** Name of the cost in the cost bars, e.g. "Deductibles". */
  label: string;
  /** Name of the saving in "where the value comes from", e.g. "Deductibles avoided". */
  driver: string;
  block: Block;
  keys: Partial<Record<"base" | "share" | "count" | "unitCost" | "hours" | "rate" | "amount", string>>;
  /** Lines in different use cases with the same tag count the same saving. */
  overlap?: string;
}

export interface ClientCostLine {
  id: string;
  label: string;
  count: string;
  unitCost: string;
}

export interface Outcome {
  id: string;
  label: string;
  key: string;
}

export interface UseCaseModel {
  id: string;
  name: string;
  superSystem: SuperSystem;
  description: string;
  lines: ValueLine[];
  clientCosts: ClientCostLine[];
  outcomes: Outcome[];
  status: "starter" | "draft";
  createdBy: "advisor" | "person";
}

export type Values = Record<string, number>;

export interface RoiLine {
  key: string;
  label: string;
  model: string;
  today: number;
  withAdvisor: number;
}

export interface RoiDriver {
  id: string;
  label: string;
  model: string;
  block: Block;
  value: number;
  keys: string[];
}

export interface RoiResult {
  lines: RoiLine[]; // costs today vs with the Advisor (for the bars)
  today: number;
  withAdvisor: number;
  staffValue: number; // time saved, in dollars
  newMoney: number;
  fee: number; // what the client pays ecoheart in year one
  clientCosts: number; // what the client spends itself (grants, its own services)
  spent: number; // fee + clientCosts
  saved: number; // all value
  net: number; // saved - spent
  returnPerDollar: number;
  paybackMonths: number | null;
  drivers: RoiDriver[];
  outcomes: { label: string; value: number; model: string }[];
}

const pct = (v: number) => Math.max(0, Math.min(100, v)) / 100;
const num = (v: number | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Dollar value of one line, and its yearly cost today / with the Advisor (only cost-type blocks). */
export function lineValue(l: ValueLine, v: Values) {
  const g = (k: keyof ValueLine["keys"]) => num(l.keys[k] ? v[l.keys[k]!] : undefined);
  switch (l.block) {
    case "costAvoided": {
      const today = g("base");
      return { value: today * pct(g("share")), today };
    }
    case "eventsAvoided": {
      const today = g("count") * g("unitCost");
      return { value: today * pct(g("share")), today };
    }
    case "timeSaved":
      return { value: g("hours") * g("rate"), today: null };
    case "newMoney":
      return { value: g("amount") * pct(g("share")), today: null };
  }
}

/** One scenario: several use cases, one set of values, and what the client pays ecoheart in year one. */
export function computeRoi(models: UseCaseModel[], v: Values, fee: number, extraClientCosts: { label: string; amount: number }[] = []): RoiResult {
  const lines: RoiLine[] = [];
  const drivers: RoiDriver[] = [];
  let staffValue = 0;
  let newMoney = 0;
  for (const m of models) {
    for (const l of m.lines) {
      const { value, today } = lineValue(l, v);
      if (today !== null) lines.push({ key: l.id, label: l.label, model: m.id, today, withAdvisor: today - value });
      if (l.block === "timeSaved") staffValue += value;
      if (l.block === "newMoney") newMoney += value;
      drivers.push({ id: l.id, label: l.driver, model: m.id, block: l.block, value, keys: Object.values(l.keys).filter(Boolean) as string[] });
    }
  }
  lines.push({ key: "fee", label: "ecoheart fee", model: "", today: 0, withAdvisor: fee });
  let clientCosts = 0;
  for (const m of models)
    for (const c of m.clientCosts) {
      const amount = num(v[c.count]) * num(v[c.unitCost]);
      clientCosts += amount;
      lines.push({ key: c.id, label: c.label, model: m.id, today: 0, withAdvisor: amount });
    }
  for (const c of extraClientCosts) {
    clientCosts += c.amount;
    lines.push({ key: `extra-${c.label}`, label: c.label, model: "", today: 0, withAdvisor: c.amount });
  }
  const today = lines.reduce((s, l) => s + l.today, 0);
  const withAdvisor = lines.reduce((s, l) => s + l.withAdvisor, 0);
  const saved = drivers.reduce((s, d) => s + d.value, 0);
  const spent = fee + clientCosts;
  const net = saved - spent;
  return {
    lines,
    today,
    withAdvisor,
    staffValue,
    newMoney,
    fee,
    clientCosts,
    spent,
    saved,
    net,
    returnPerDollar: spent > 0 ? saved / spent : 0,
    paybackMonths: saved > 0 ? Math.max(1, Math.round(spent / (saved / 12))) : null,
    drivers: drivers.sort((a, b) => b.value - a.value),
    outcomes: models.flatMap((m) => m.outcomes.map((o) => ({ label: o.label, value: num(v[o.key]), model: m.id }))),
  };
}

/** Assumption keys a set of use cases reads. */
export function keysFor(models: UseCaseModel[]): string[] {
  const out = new Set<string>();
  for (const m of models) {
    for (const l of m.lines) Object.values(l.keys).forEach((k) => k && out.add(k));
    for (const c of m.clientCosts) [c.count, c.unitCost].forEach((k) => out.add(k));
    for (const o of m.outcomes) out.add(o.key);
  }
  return [...out];
}

/** Plain-words formula for a line, e.g. "Deductibles ($/yr) × share avoided (%)". */
export function formulaText(l: ValueLine, labelOf: (key: string) => string) {
  return BLOCK_KEYS[l.block]
    .map((k) => l.keys[k])
    .filter(Boolean)
    .map((k) => labelOf(k!))
    .join(" × ");
}

export function fmtMoney(n: number): string {
  const a = Math.abs(n);
  const s = n < 0 ? "−" : "";
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (a >= 1e3) return `${s}$${Math.round(a / 1e3)}K`;
  return `${s}$${Math.round(a)}`;
}
