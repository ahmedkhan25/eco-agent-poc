// Starting values for the ROI Advisor. Everything here is the "original":
// the Model, Clients and Pricing tabs show anything changed since in teal.

import type { Assumption, Basis, UseCaseModel } from "./engine";
import type { Adjustment, Client, CostLine, Offer } from "./pricing";
import { SANDRINE_CATALOG } from "./data/catalog";

export type { Basis, Confidence } from "./engine";

export const BASIS_LABEL: Record<Basis, string> = {
  low: "Cautious",
  expected: "Expected",
  high: "Business case",
};

// ---------------------------------------------------------------------------
// Assumption library. The storm and insurance values are Jerid's Hollywood, FL
// draft business case (Oct 2026); they are also the placeholders other clients
// start from until they have their own numbers.
// ---------------------------------------------------------------------------

const STORM = "Storm and insurance";
export const DEFAULT_ASSUMPTIONS: Assumption[] = [
  { key: "prem", model: "storm", group: STORM, label: "Property insurance premium", unit: "$", low: 2700000, expected: 2700000, high: 2700000, source: "Hollywood P&C renewal, draft business case", confidence: "high", owner: "City finance" },
  { key: "credit", model: "storm", group: STORM, label: "Premium credit at renewal", unit: "%", low: 2, expected: 5, high: 12.5, source: "Draft business case; to confirm with the broker", confidence: "low", owner: "ecoheart analyst" },
  { key: "claims", model: "storm", group: STORM, label: "Small claims under the deductible (per year)", unit: "$", low: 380000, expected: 380000, high: 380000, source: "City Self-Insurance Program Guidelines; draft business case", confidence: "medium", owner: "City risk manager" },
  { key: "claimsCut", model: "storm", group: STORM, label: "Share of small claims avoided", unit: "%", low: 20, expected: 40, high: 100, source: "ecoheart estimate from upstream green infrastructure", confidence: "low", owner: "ecoheart analyst" },
  { key: "ded", model: "storm", group: STORM, label: "Wind and water deductibles (per year)", unit: "$", low: 500000, expected: 500000, high: 500000, source: "City property insurance terms; draft business case", confidence: "medium", owner: "City risk manager" },
  { key: "dedCut", model: "storm", group: STORM, label: "Share of deductibles avoided", unit: "%", low: 20, expected: 45, high: 90, source: "ecoheart estimate", confidence: "low", owner: "ecoheart analyst" },
  { key: "ot", model: "storm", group: STORM, label: "Emergency overtime and pumping (per year)", unit: "$", low: 220000, expected: 220000, high: 220000, source: "Public works storm-response costs; draft business case", confidence: "medium", owner: "Public works" },
  { key: "otCut", model: "storm", group: STORM, label: "Share of overtime avoided", unit: "%", low: 15, expected: 35, high: 80, source: "ecoheart estimate", confidence: "low", owner: "ecoheart analyst" },
  { key: "hrs", model: "storm", group: STORM, label: "Staff hours saved on insurer and grant reports", unit: "hours", low: 300, expected: 600, high: 0, source: "Jerid's suggestion; left out of the business-case total on purpose", confidence: "low", owner: "ecoheart analyst", unordered: true },
  { key: "grants", model: "storm", group: STORM, label: "Neighborhood micro-grants the city funds", unit: "count", low: 5, expected: 10, high: 15, source: "Draft business case: 15 grants", confidence: "medium", owner: "City resilience office" },
  { key: "grantSize", model: "storm", group: STORM, label: "Size of each micro-grant", unit: "$", low: 10000, expected: 10000, high: 10000, source: "Draft business case", confidence: "medium", owner: "City resilience office" },

  { key: "hourly", model: "shared", group: "Shared by every use case", label: "Fully loaded staff cost per hour", unit: "$", low: 65, expected: 65, high: 65, source: "Typical municipal loaded rate; confirm with the client's HR", confidence: "medium", owner: "Client finance" },

  { key: "gf.pool", model: "grant-finder", group: "Grant Finder", label: "Grant dollars applied for per year", unit: "$", low: 2000000, expected: 2000000, high: 2000000, source: "Placeholder; ask the client's grants office", confidence: "low", owner: "Client grants office" },
  { key: "gf.lift", model: "grant-finder", group: "Grant Finder", label: "Improvement in win rate", unit: "%", low: 3, expected: 6, high: 10, source: "ecoheart estimate: better matching and earlier deadlines", confidence: "low", owner: "ecoheart analyst" },
  { key: "gf.hrs", model: "grant-finder", group: "Grant Finder", label: "Grant-writing hours saved per year", unit: "hours", low: 150, expected: 300, high: 450, source: "ecoheart estimate", confidence: "low", owner: "ecoheart analyst" },
  { key: "gf.apps", model: "grant-finder", group: "Grant Finder", label: "Extra grant applications per year", unit: "count", low: 2, expected: 4, high: 6, source: "ecoheart estimate", confidence: "low", owner: "ecoheart analyst" },

  { key: "hu.fema", model: "hurricane", group: "Hurricane after-action", label: "FEMA reimbursement claimed per year (long-run average)", unit: "$", low: 1200000, expected: 1200000, high: 1200000, source: "Placeholder; use the client's FEMA Public Assistance history", confidence: "low", owner: "Emergency management" },
  { key: "hu.recover", model: "hurricane", group: "Hurricane after-action", label: "Extra share recovered with better records", unit: "%", low: 2, expected: 5, high: 8, source: "ecoheart estimate: fewer denied or reduced claims", confidence: "low", owner: "ecoheart analyst" },
  { key: "hu.hrs", model: "hurricane", group: "Hurricane after-action", label: "After-action and claim paperwork hours saved", unit: "hours", low: 120, expected: 250, high: 400, source: "ecoheart estimate", confidence: "low", owner: "ecoheart analyst" },

  { key: "t3.rolls", model: "triage-311", group: "311 complaint triage", label: "Repeat truck rolls per year", unit: "count", low: 400, expected: 400, high: 400, source: "Placeholder; ask public works dispatch", confidence: "low", owner: "Public works" },
  { key: "t3.cost", model: "triage-311", group: "311 complaint triage", label: "Cost per truck roll", unit: "$", low: 250, expected: 250, high: 250, source: "Placeholder: crew of two, vehicle, two hours", confidence: "low", owner: "Public works" },
  { key: "t3.cut", model: "triage-311", group: "311 complaint triage", label: "Share of repeat truck rolls avoided", unit: "%", low: 15, expected: 30, high: 45, source: "ecoheart estimate: matching reports to tide, rain and open work orders", confidence: "low", owner: "ecoheart analyst" },
  { key: "t3.hrs", model: "triage-311", group: "311 complaint triage", label: "Staff hours saved sorting complaints", unit: "hours", low: 200, expected: 400, high: 600, source: "ecoheart estimate", confidence: "low", owner: "ecoheart analyst" },
  { key: "t3.resp", model: "triage-311", group: "311 complaint triage", label: "Hours sooner a resident hears back", unit: "hours", low: 2, expected: 4, high: 8, source: "ecoheart estimate", confidence: "low", owner: "ecoheart analyst" },
];

// ---------------------------------------------------------------------------
// Use cases. Each one is data: value lines built from the four blocks.
// ---------------------------------------------------------------------------

export const DEFAULT_MODELS: UseCaseModel[] = [
  {
    id: "storm",
    name: "Storm and insurance",
    superSystem: "Infrastructure",
    description: "Fewer storm losses and a better insurance renewal, from Jerid's Hollywood, FL business case.",
    status: "starter",
    createdBy: "person",
    lines: [
      { id: "prem", label: "Insurance premium", driver: "Insurance premium credit", block: "costAvoided", keys: { base: "prem", share: "credit" } },
      { id: "claims", label: "Small claims", driver: "Small claims avoided", block: "costAvoided", keys: { base: "claims", share: "claimsCut" } },
      { id: "ded", label: "Deductibles", driver: "Deductibles avoided", block: "costAvoided", keys: { base: "ded", share: "dedCut" } },
      { id: "ot", label: "Emergency overtime", driver: "Less emergency overtime", block: "costAvoided", keys: { base: "ot", share: "otCut" }, overlap: "storm-response" },
      { id: "staff", label: "Staff time", driver: "Staff time on reporting", block: "timeSaved", keys: { hours: "hrs", rate: "hourly" }, overlap: "grant-paperwork" },
    ],
    clientCosts: [{ id: "grants", label: "Neighborhood grants", count: "grants", unitCost: "grantSize" }],
    outcomes: [],
  },
  {
    id: "grant-finder",
    name: "Grant Finder",
    superSystem: "Governance",
    description: "Finds and drafts the grants a client is eligible for, so it wins more and writes less.",
    status: "starter",
    createdBy: "person",
    lines: [
      { id: "gf-won", label: "Grants won", driver: "More grant dollars won", block: "newMoney", keys: { amount: "gf.pool", share: "gf.lift" } },
      { id: "gf-time", label: "Grant writing", driver: "Grant-writing time saved", block: "timeSaved", keys: { hours: "gf.hrs", rate: "hourly" }, overlap: "grant-paperwork" },
    ],
    clientCosts: [],
    outcomes: [{ id: "gf-apps", label: "Extra grant applications per year", key: "gf.apps" }],
  },
  {
    id: "hurricane",
    name: "Hurricane after-action",
    superSystem: "Safety",
    description: "Keeps storm records complete so more FEMA reimbursement is recovered, with less paperwork.",
    status: "starter",
    createdBy: "person",
    lines: [
      { id: "hu-fema", label: "FEMA reimbursement", driver: "More FEMA reimbursement recovered", block: "newMoney", keys: { amount: "hu.fema", share: "hu.recover" } },
      { id: "hu-time", label: "After-action paperwork", driver: "After-action time saved", block: "timeSaved", keys: { hours: "hu.hrs", rate: "hourly" } },
    ],
    clientCosts: [],
    outcomes: [],
  },
  {
    id: "triage-311",
    name: "311 complaint triage",
    superSystem: "Engagement",
    description: "Sorts flood and storm complaints against tide, rain and open work orders before a crew rolls.",
    status: "starter",
    createdBy: "person",
    lines: [
      { id: "t3-rolls", label: "Repeat truck rolls", driver: "Fewer repeat truck rolls", block: "eventsAvoided", keys: { count: "t3.rolls", unitCost: "t3.cost", share: "t3.cut" }, overlap: "storm-response" },
      { id: "t3-time", label: "Complaint sorting", driver: "Complaint-sorting time saved", block: "timeSaved", keys: { hours: "t3.hrs", rate: "hourly" } },
    ],
    clientCosts: [],
    outcomes: [{ id: "t3-resp", label: "Hours sooner a resident hears back", key: "t3.resp" }],
  },
];

// ---------------------------------------------------------------------------
// Pricing: Sandrine's catalog, our offers, and what each offer costs us.
// Team rates: list $200/h; internal rates are ecoheart estimates.
// ---------------------------------------------------------------------------

export const DEFAULT_CATALOG = SANDRINE_CATALOG;

const role = (id: string, label: string, hours: number, costRate: number, extra: Partial<CostLine> = {}): CostLine => ({
  id,
  kind: "people",
  label,
  personType: "team",
  hours,
  costRate,
  chargeRate: 200,
  payer: "ecoheart",
  ...extra,
});
const run = (id: string, label: string, monthly: number, months: number, ongoing = false): CostLine => ({
  id,
  kind: "service",
  label,
  monthly,
  months,
  ongoing,
  payer: "ecoheart",
});

const RUN_3 = [
  run("run-hosting", "Always-on hosting", 85, 3),
  run("run-db", "Database and document storage", 50, 3),
  run("run-ai", "AI usage", 600, 3),
  run("run-search", "Web search and map data", 100, 3),
  run("run-monitor", "Monitoring and backups", 40, 3),
];

const SUPPORTED_ITEMS = [
  "metadata-management-console",
  "data-lake-intelligence-layer",
  "city-console",
  "citizen-engagement-portal",
  "toolkits",
  "custom-integrations",
  "scenario-engine",
  "ieee-7000-oecd",
  "climate-risk-engine",
  "flood-wildfire-hazard-models",
  "onboarding-and-training",
];

export const DEFAULT_OFFERS: Offer[] = [
  {
    id: "roi-snapshot",
    name: "ROI Snapshot",
    length: "6 weeks",
    notes: "Analyst-led business case for one topic",
    kind: "fixed",
    oneTime: 35000,
    yearly: 0,
    itemIds: [],
    useCases: [1, 1],
    costTemplate: [
      role("analyst", "Climate finance analyst", 120, 90),
      role("lead", "Engagement lead & solution architect", 24, 120),
      role("ai", "AI engineer", 40, 110),
      role("design", "Designer & city success lead", 16, 85),
      run("run-all", "Hosting and AI usage", 875, 2),
    ],
  },
  {
    id: "early-partner",
    name: "Early partner project",
    length: "12 weeks",
    notes: "Advisor set up for one client, one focus area",
    kind: "fixed",
    oneTime: 150000,
    yearly: 0,
    itemIds: [],
    useCases: [1, 2],
    costTemplate: [
      role("lead", "Engagement lead & solution architect", 96, 120),
      role("ai", "AI engineer", 360, 110),
      role("data", "Data engineer", 192, 100),
      role("analyst", "Climate finance analyst", 240, 90),
      role("ethics", "AI ethics & governance lead", 48, 110),
      role("design", "Designer & city success lead", 96, 85),
      ...RUN_3,
    ],
  },
  {
    id: "ongoing",
    name: "Ongoing service",
    length: "per year",
    notes: "Mid-size client; range $50K–$90K by size",
    kind: "fixed",
    oneTime: 0,
    yearly: 70000,
    itemIds: [],
    useCases: [1, 3],
    range: [50000, 90000],
    costTemplate: [
      role("ai", "AI engineer", 160, 110),
      role("analyst", "Climate finance analyst", 120, 90),
      role("design", "Designer & city success lead", 80, 85),
      run("run-all", "Hosting and AI usage", 875, 12),
    ],
  },
  {
    id: "supported-pilot",
    name: "CitySense Supported pilot",
    length: "60–90 days",
    notes: "1–2 high-priority use cases, rapid prototyping and executive briefings (public range $150K–$300K)",
    kind: "catalog",
    oneTime: 0,
    yearly: 0,
    itemIds: SUPPORTED_ITEMS,
    useCases: [1, 2],
    range: [150000, 300000],
    costTemplate: [
      role("lead", "Engagement lead & solution architect", 80, 120),
      role("ai", "AI engineer", 300, 110),
      role("data", "Data engineer", 200, 100),
      role("analyst", "Climate finance analyst", 120, 90),
      role("ethics", "AI ethics & governance lead", 40, 110),
      role("design", "Designer & city success lead", 60, 85),
      ...RUN_3,
    ],
  },
  {
    id: "full-pilot",
    name: "CitySense Full pilot",
    length: "about a year, can be staged",
    notes: "3–5 use cases with full configuration, staff training and Citizen Impact Scoring (public range $750K–$1.2M)",
    kind: "catalog",
    oneTime: 0,
    yearly: 0,
    itemIds: SANDRINE_CATALOG.map((c) => c.id).filter((id) => id !== "hipaa"),
    useCases: [3, 5],
    range: [750000, 1200000],
    costTemplate: [
      role("lead", "Engagement lead & solution architect", 300, 120),
      role("ai", "AI engineer", 1200, 110),
      role("data", "Data engineer", 800, 100),
      role("analyst", "Climate finance analyst", 500, 90),
      role("ethics", "AI ethics & governance lead", 160, 110),
      role("design", "Designer & city success lead", 300, 85),
      run("run-all", "Hosting and AI usage", 875, 12, true),
    ],
  },
];

export const ADJUSTMENT_PRESETS: Omit<Adjustment, "id">[] = [
  { label: "Founding-partner discount", kind: "pct", value: 10, reason: "Early partner shapes the work with us, in exchange for a success story", appliesTo: "year1" },
  { label: "Nonprofit or tribal rate", kind: "pct", value: 15, reason: "Mission-aligned client rate", appliesTo: "all" },
  { label: "Grandfathered rate", kind: "pct", value: 5, reason: "Inaugural partner keeps preferred pricing as the work matures", appliesTo: "all" },
];

/** People line for the example SME in Ahmed's brief (Olympia, $55/h). */
export const SME_EXAMPLE: CostLine = {
  id: "sme-olympia",
  kind: "people",
  label: "Climate and engineering SME (Olympia example)",
  personType: "sme",
  hours: 40,
  costRate: 55,
  chargeRate: 0,
  payer: "ecoheart",
  note: "Example from Ahmed: local subject-matter expert at $55/h",
};

const copyTemplate = (offerId: string) => (DEFAULT_OFFERS.find((o) => o.id === offerId)?.costTemplate ?? []).map((l) => ({ ...l }));

export const DEFAULT_CLIENTS: Client[] = [
  {
    id: "hollywood",
    name: "Hollywood, FL",
    type: "city",
    state: "Florida",
    region: "US",
    population: 157019,
    modelIds: ["storm"],
    offerId: "early-partner",
    ongoingId: "ongoing",
    contract: { years: 3, escalatorPct: 3, payments: "annual" },
    costLines: copyTemplate("early-partner"),
    adjustments: [],
    local: {},
    notes: "The library values are Hollywood's own numbers from Jerid's draft business case.",
  },
  {
    id: "olympia",
    name: "Olympia, WA",
    type: "city",
    state: "Washington",
    region: "US",
    population: 56724,
    modelIds: ["storm", "grant-finder"],
    offerId: "early-partner",
    contract: { years: 1, escalatorPct: 3, payments: "quarterly" },
    costLines: [...copyTemplate("early-partner"), { ...SME_EXAMPLE }],
    adjustments: [],
    local: {},
    docsIndex: "olympia",
    notes: "Olympia's planning documents are indexed, so the Advisor can look up local numbers with citations.",
  },
  {
    id: "flagstaff",
    name: "Flagstaff, AZ",
    type: "city",
    state: "Arizona",
    region: "US",
    population: 77260,
    modelIds: ["storm"],
    offerId: "supported-pilot",
    contract: { years: 3, escalatorPct: 1.5, payments: "quarterly" },
    costLines: copyTemplate("supported-pilot"),
    adjustments: [],
    local: {},
    notes: "The scenario in Sandrine's pricing workbook (Mid-size, Arizona).",
  },
];

export function templateFor(offers: Offer[], offerId: string): CostLine[] {
  return (offers.find((o) => o.id === offerId)?.costTemplate ?? []).map((l) => ({ ...l }));
}
