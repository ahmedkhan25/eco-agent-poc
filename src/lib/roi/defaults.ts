import type { InputKey, RoiInputs } from "./engine";

export type Basis = "low" | "expected" | "high";
export type Confidence = "low" | "medium" | "high";

export interface Assumption {
  key: InputKey;
  label: string;
  group: "Insurance" | "Storm costs the city pays itself" | "Staff time" | "What the city spends";
  unit: "$" | "%" | "hours" | "count";
  low: number;      // cautious scenario
  expected: number;
  high: number;     // business-case upside
  source: string;
  confidence: Confidence;
  owner: string;
}

// Starting values: Jerid's Hollywood, FL draft business case (Oct 2026).
export const DEFAULT_ASSUMPTIONS: Assumption[] = [
  { key: "prem", label: "Property insurance premium", group: "Insurance", unit: "$", low: 2700000, expected: 2700000, high: 2700000, source: "Hollywood P&C renewal, draft business case", confidence: "high", owner: "City finance" },
  { key: "credit", label: "Premium credit at renewal", group: "Insurance", unit: "%", low: 2, expected: 5, high: 12.5, source: "Draft business case; to confirm with the broker", confidence: "low", owner: "ecoheart analyst" },
  { key: "claims", label: "Small claims under the deductible (per year)", group: "Storm costs the city pays itself", unit: "$", low: 380000, expected: 380000, high: 380000, source: "City Self-Insurance Program Guidelines; draft business case", confidence: "medium", owner: "City risk manager" },
  { key: "claimsCut", label: "Share of small claims avoided", group: "Storm costs the city pays itself", unit: "%", low: 20, expected: 40, high: 100, source: "ecoheart estimate from upstream green infrastructure", confidence: "low", owner: "ecoheart analyst" },
  { key: "ded", label: "Wind and water deductibles (per year)", group: "Storm costs the city pays itself", unit: "$", low: 500000, expected: 500000, high: 500000, source: "City property insurance terms; draft business case", confidence: "medium", owner: "City risk manager" },
  { key: "dedCut", label: "Share of deductibles avoided", group: "Storm costs the city pays itself", unit: "%", low: 20, expected: 45, high: 90, source: "ecoheart estimate", confidence: "low", owner: "ecoheart analyst" },
  { key: "ot", label: "Emergency overtime and pumping (per year)", group: "Storm costs the city pays itself", unit: "$", low: 220000, expected: 220000, high: 220000, source: "Public works storm-response costs; draft business case", confidence: "medium", owner: "Public works" },
  { key: "otCut", label: "Share of overtime avoided", group: "Storm costs the city pays itself", unit: "%", low: 15, expected: 35, high: 80, source: "ecoheart estimate", confidence: "low", owner: "ecoheart analyst" },
  { key: "hrs", label: "Staff hours saved on insurer and grant reports", group: "Staff time", unit: "hours", low: 300, expected: 600, high: 0, source: "Jerid's suggestion; not in the business case total", confidence: "low", owner: "ecoheart analyst" },
  { key: "hourly", label: "Fully loaded staff cost per hour", group: "Staff time", unit: "$", low: 65, expected: 65, high: 65, source: "Typical municipal loaded rate; confirm with city HR", confidence: "medium", owner: "City finance" },
  { key: "fee", label: "ecoheart fee", group: "What the city spends", unit: "$", low: 150000, expected: 150000, high: 150000, source: "Early partner project price", confidence: "high", owner: "ecoheart" },
  { key: "grants", label: "Neighborhood micro-grants", group: "What the city spends", unit: "count", low: 5, expected: 10, high: 15, source: "Draft business case: 15 grants", confidence: "medium", owner: "City resilience office" },
  { key: "grantSize", label: "Size of each grant", group: "What the city spends", unit: "$", low: 10000, expected: 10000, high: 10000, source: "Draft business case", confidence: "medium", owner: "City resilience office" },
];

export function inputsFor(assumptions: Assumption[], basis: Basis): RoiInputs {
  return Object.fromEntries(assumptions.map((a) => [a.key, a[basis]])) as RoiInputs;
}

export const BASIS_LABEL: Record<Basis, string> = {
  low: "Cautious",
  expected: "Expected",
  high: "Business case",
};

// Internal cost model (never shown to cities).
export interface RoleCost { role: string; hours: number; listRate: number; internalRate: number }
export interface RunCost { item: string; monthly: number }
export interface Offer { name: string; price: number; weeks: string; notes: string }

export const DEFAULT_ROLES: RoleCost[] = [
  { role: "Engagement lead & solution architect", hours: 96, listRate: 200, internalRate: 120 },
  { role: "AI engineer", hours: 360, listRate: 200, internalRate: 110 },
  { role: "Data engineer", hours: 192, listRate: 200, internalRate: 100 },
  { role: "Climate finance analyst", hours: 240, listRate: 200, internalRate: 90 },
  { role: "AI ethics & governance lead", hours: 48, listRate: 200, internalRate: 110 },
  { role: "Designer & city success lead", hours: 96, listRate: 200, internalRate: 85 },
];

export const DEFAULT_RUN: RunCost[] = [
  { item: "Always-on hosting", monthly: 85 },
  { item: "Database and document storage", monthly: 50 },
  { item: "AI usage", monthly: 600 },
  { item: "Web search and map data", monthly: 100 },
  { item: "Monitoring and backups", monthly: 40 },
];

export const DEFAULT_OFFERS: Offer[] = [
  { name: "ROI Snapshot", price: 35000, weeks: "6 weeks", notes: "Analyst-led business case for one topic" },
  { name: "Early partner project", price: 150000, weeks: "12 weeks", notes: "Advisor set up for one city, one focus area" },
  { name: "Ongoing service (mid-size city)", price: 70000, weeks: "per year", notes: "Range $50K–$90K by city size" },
];
