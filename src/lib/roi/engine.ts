// Deterministic ROI math for the ROI Advisor. The agent only chooses inputs;
// every number shown comes from computeRoi(), so results are repeatable.

export type InputKey =
  | "prem" | "credit" | "claims" | "claimsCut" | "ded" | "dedCut"
  | "ot" | "otCut" | "hrs" | "hourly" | "fee" | "grants" | "grantSize";

export type RoiInputs = Record<InputKey, number>;

export interface RoiLine {
  key: string;
  label: string;
  today: number;
  withAdvisor: number;
}

export interface RoiResult {
  lines: RoiLine[];
  today: number;          // annual storm + insurance cost today
  withAdvisor: number;    // same, after savings, plus fee and grants
  staffValue: number;     // staff hours saved, in dollars
  spent: number;          // ecoheart fee + grants
  saved: number;          // gross savings incl. staff time
  net: number;            // saved - spent
  returnPerDollar: number;
  paybackMonths: number | null;
  drivers: { label: string; value: number }[];
}

const pct = (v: number) => Math.max(0, Math.min(100, v)) / 100;

export function computeRoi(i: RoiInputs): RoiResult {
  const lines: RoiLine[] = [
    { key: "prem", label: "Insurance premium", today: i.prem, withAdvisor: i.prem * (1 - pct(i.credit)) },
    { key: "claims", label: "Small claims", today: i.claims, withAdvisor: i.claims * (1 - pct(i.claimsCut)) },
    { key: "ded", label: "Deductibles", today: i.ded, withAdvisor: i.ded * (1 - pct(i.dedCut)) },
    { key: "ot", label: "Emergency overtime", today: i.ot, withAdvisor: i.ot * (1 - pct(i.otCut)) },
    { key: "fee", label: "ecoheart fee", today: 0, withAdvisor: i.fee },
    { key: "grants", label: "Neighborhood grants", today: 0, withAdvisor: i.grants * i.grantSize },
  ];
  const today = lines.reduce((s, l) => s + l.today, 0);
  const withAdvisor = lines.reduce((s, l) => s + l.withAdvisor, 0);
  const staffValue = i.hrs * i.hourly;
  const spent = i.fee + i.grants * i.grantSize;
  const net = today - withAdvisor + staffValue;
  const saved = net + spent;
  const drivers = [
    { label: "Insurance premium credit", value: i.prem * pct(i.credit) },
    { label: "Small claims avoided", value: i.claims * pct(i.claimsCut) },
    { label: "Deductibles avoided", value: i.ded * pct(i.dedCut) },
    { label: "Less emergency overtime", value: i.ot * pct(i.otCut) },
    { label: "Staff time on reporting", value: staffValue },
  ].sort((a, b) => b.value - a.value);
  return {
    lines,
    today,
    withAdvisor,
    staffValue,
    spent,
    saved,
    net,
    returnPerDollar: spent > 0 ? saved / spent : 0,
    paybackMonths: saved > 0 ? Math.max(1, Math.round(spent / (saved / 12))) : null,
    drivers,
  };
}

export function fmtMoney(n: number): string {
  const a = Math.abs(n);
  const s = n < 0 ? "−" : "";
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (a >= 1e3) return `${s}$${Math.round(a / 1e3)}K`;
  return `${s}$${Math.round(a)}`;
}
