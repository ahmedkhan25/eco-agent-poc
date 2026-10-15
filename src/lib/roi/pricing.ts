// What we charge, what it costs us, and who pays. Three layers:
//   Price   catalog items (by client size), offers, price adjustments, contract years
//   Cost    people (ecoheart team and SMEs) and services, each with who pays
//   Funding partner or grant shares that cover part of the price
// One-time work is billed once; the escalator applies to yearly items only.

import type { Basis, Confidence } from "./engine";
import { STATE_CITY_COUNTS } from "./data/state-counts";

export type Size = "Small" | "Mid-size" | "Large" | "Major";
export const SIZES: Size[] = ["Small", "Mid-size", "Large", "Major"];

export const CLIENT_TYPES = [
  "city",
  "county",
  "state agency",
  "tribal nation",
  "tribal organization",
  "nonprofit",
  "utility",
  "company",
  "other",
] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];

export type Region = "US" | "EU";
export type Payer = "client" | "ecoheart" | "partner" | "grant";
export const PAYER_LABEL: Record<Payer, string> = { client: "Client", ecoheart: "ecoheart", partner: "Partner", grant: "Grant" };

export interface CatalogItem {
  id: string;
  category: string;
  name: string;
  description: string;
  unit: string;
  recurring: boolean;
  region: "US" | "EU" | "all";
  bySize: Record<Size, { qty: number; rate: number }>;
}

export interface Offer {
  id: string;
  name: string;
  length: string;
  notes: string;
  /** fixed: one price. catalog: the sum of the listed catalog items at the client's size. */
  kind: "fixed" | "catalog";
  oneTime: number;
  yearly: number;
  itemIds: string[];
  useCases: [number, number];
  range?: [number, number];
  /** Cost lines copied to a client when it picks this offer. */
  costTemplate: CostLine[];
}

export interface Adjustment {
  id: string;
  label: string;
  kind: "pct" | "fixed";
  value: number; // % off, or $ off (positive = discount)
  reason: string;
  appliesTo: "year1" | "all";
}

export interface CostLine {
  id: string;
  kind: "people" | "service" | "share";
  label: string;
  payer: Payer;
  note?: string;
  // people
  personType?: "team" | "sme";
  hours?: number; // year one
  hoursPerYearAfter?: number;
  costRate?: number; // what it costs us (or the payer) per hour
  chargeRate?: number; // what we bill per hour when added to the price
  addToPrice?: boolean;
  // service
  amount?: number; // one-time, year one
  monthly?: number;
  months?: number; // months in year one
  ongoing?: boolean; // keeps running 12 months a year after year one
  // share (partner or grant covering part of the price)
  partner?: string;
  sharePct?: number;
  shareAmount?: number;
  everyYear?: boolean;
}

export interface Contract {
  years: number;
  escalatorPct: number;
  payments: "annual" | "quarterly" | "monthly";
}

export interface LocalValue {
  low: number;
  expected: number;
  high: number;
  source: string;
  confidence: Confidence;
  owner: string;
  status: "confirmed" | "proposed";
  by: "advisor" | "person";
  at: number;
}

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  state: string; // US state, country or region
  region: Region;
  population?: number; // people served
  sizeOverride?: Size;
  modelIds: string[];
  offerId: string;
  ongoingId?: string;
  contract: Contract;
  costLines: CostLine[];
  adjustments: Adjustment[];
  local: Record<string, LocalValue>;
  docsIndex?: "olympia";
  notes: string;
}

export interface SizeBands {
  smallBelow: number;
  midBelow: number;
  largeBelow: number;
}

/** Bands found in Sandrine's city list (2025 populations); the workbook never wrote them down. */
export const DEFAULT_SIZE_BANDS: SizeBands = { smallBelow: 10000, midBelow: 100000, largeBelow: 275000 };

export interface DiscountRow {
  from: number;
  to: number;
  pct: Record<Size, number>;
  allowed: boolean;
}

/** Volume discounts by number of cities in a bundle (workbook tab 1, N15:U19). */
export const DEFAULT_DISCOUNTS: DiscountRow[] = [
  { from: 0, to: 200, pct: { Small: 2, "Mid-size": 3, Large: 3.5, Major: 3.5 }, allowed: true },
  { from: 201, to: 500, pct: { Small: 2.5, "Mid-size": 3.5, Large: 4, Major: 4 }, allowed: true },
  { from: 501, to: 750, pct: { Small: 3, "Mid-size": 4, Large: 4.5, Major: 4.5 }, allowed: true },
  { from: 751, to: 1100, pct: { Small: 5, "Mid-size": 6, Large: 6.5, Major: 6.5 }, allowed: false },
];

export interface Bundle {
  id: string;
  name: string;
  /** Count every city in this state by size (from the workbook's city list)... */
  state?: string;
  /** ...or price a hand-picked group of client profiles (a county, a tribal consortium). */
  clientIds: string[];
  offerId: string;
  years: number;
  escalatorPct: number;
}

export function sizeFor(c: Pick<Client, "population" | "sizeOverride">, bands: SizeBands = DEFAULT_SIZE_BANDS): Size {
  if (c.sizeOverride) return c.sizeOverride;
  const p = c.population ?? 0;
  if (!p) return "Mid-size";
  if (p < bands.smallBelow) return "Small";
  if (p < bands.midBelow) return "Mid-size";
  if (p < bands.largeBelow) return "Large";
  return "Major";
}

const n = (v: number | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function itemPrice(it: CatalogItem, size: Size) {
  const s = it.bySize[size];
  return s ? n(s.qty) * n(s.rate) : 0;
}

/** One-time and yearly price of an offer for a client size and region. */
export function offerPrice(o: Offer | undefined, size: Size, region: Region, catalog: CatalogItem[]) {
  if (!o) return { oneTime: 0, yearly: 0, items: [] as { item: CatalogItem; price: number }[] };
  if (o.kind === "fixed") return { oneTime: n(o.oneTime), yearly: n(o.yearly), items: [] };
  const items = o.itemIds
    .map((id) => catalog.find((c) => c.id === id))
    .filter((c): c is CatalogItem => !!c && (c.region === "all" || c.region === region))
    .map((item) => ({ item, price: itemPrice(item, size) }));
  return {
    oneTime: items.filter((x) => !x.item.recurring).reduce((s, x) => s + x.price, 0),
    yearly: items.filter((x) => x.item.recurring).reduce((s, x) => s + x.price, 0),
    items,
  };
}

export interface DealYear {
  year: number;
  price: number; // what ecoheart charges (after adjustments)
  shares: { label: string; payer: Payer; amount: number }[];
  clientPaysEcoheart: number; // price minus partner and grant shares
  clientDirect: number; // services the client pays for itself
  ourCost: number;
  margin: number;
  recurring: number; // yearly part of the price
}

export interface DealSummary {
  size: Size;
  offer?: Offer;
  ongoing?: Offer;
  listOneTime: number;
  listYearly: number;
  billedPeople: number;
  years: DealYear[];
  total: { price: number; clientPays: number; partners: number; ourCost: number; margin: number; marginPct: number };
  arr: number;
  mrr: number;
  paymentsYear1: { label: string; amount: number }[];
  whoPaysYear1: { payer: Payer; label: string; amount: number }[];
  items: { item: CatalogItem; price: number }[];
}

export function dealSummary(c: Client, offers: Offer[], catalog: CatalogItem[], bands: SizeBands = DEFAULT_SIZE_BANDS): DealSummary {
  const size = sizeFor(c, bands);
  const offer = offers.find((o) => o.id === c.offerId);
  const ongoing = c.ongoingId ? offers.find((o) => o.id === c.ongoingId) : undefined;
  const base = offerPrice(offer, size, c.region, catalog);
  const after = offerPrice(ongoing, size, c.region, catalog);
  const lines = c.costLines ?? [];
  const billedPeople = lines
    .filter((l) => l.kind === "people" && l.addToPrice)
    .reduce((s, l) => s + n(l.hours) * n(l.chargeRate), 0);
  const years: DealYear[] = [];
  const yearsN = Math.max(1, Math.round(n(c.contract?.years) || 1));
  const esc = n(c.contract?.escalatorPct) / 100;
  for (let y = 1; y <= yearsN; y++) {
    // Yearly items escalate from year 2; an ongoing offer starts in year 2 at its own price.
    const recurring = base.yearly * Math.pow(1 + esc, y - 1) + (y >= 2 ? (after.oneTime + after.yearly) * Math.pow(1 + esc, y - 2) : 0);
    const oneTime = y === 1 ? base.oneTime + billedPeople : 0;
    let price = oneTime + recurring;
    for (const a of c.adjustments ?? []) {
      if (a.appliesTo === "year1" && y > 1) continue;
      price -= a.kind === "pct" ? price * (n(a.value) / 100) : Math.min(price, n(a.value));
    }
    price = Math.max(0, price);
    const shares = lines
      .filter((l) => l.kind === "share" && (y === 1 || l.everyYear))
      .map((l) => ({
        label: l.partner || l.label,
        payer: l.payer === "grant" ? ("grant" as Payer) : ("partner" as Payer),
        amount: Math.min(price, l.sharePct ? price * (n(l.sharePct) / 100) : n(l.shareAmount)),
      }));
    const covered = Math.min(price, shares.reduce((s, x) => s + x.amount, 0));
    const svc = (l: CostLine) => (y === 1 ? n(l.amount) + n(l.monthly) * n(l.months) : l.ongoing ? n(l.monthly) * 12 : 0);
    const ppl = (l: CostLine) => (y === 1 ? n(l.hours) : n(l.hoursPerYearAfter)) * n(l.costRate);
    // From year 2, an ongoing offer brings its own yearly delivery cost.
    const ongoingCost =
      y >= 2 && ongoing
        ? ongoing.costTemplate
            .filter((l) => l.payer === "ecoheart")
            .reduce((s, l) => s + (l.kind === "people" ? n(l.hours) * n(l.costRate) : l.kind === "service" ? n(l.amount) + n(l.monthly) * 12 : 0), 0) *
          Math.pow(1 + esc, y - 2)
        : 0;
    const ourCost =
      lines.filter((l) => l.kind === "people" && l.payer === "ecoheart").reduce((s, l) => s + ppl(l), 0) +
      lines.filter((l) => l.kind === "service" && l.payer === "ecoheart").reduce((s, l) => s + svc(l), 0) +
      ongoingCost;
    const clientDirect =
      lines.filter((l) => l.kind === "service" && l.payer === "client").reduce((s, l) => s + svc(l), 0) +
      lines.filter((l) => l.kind === "people" && l.payer === "client").reduce((s, l) => s + ppl(l), 0);
    years.push({ year: y, price, shares, clientPaysEcoheart: price - covered, clientDirect, ourCost, margin: price - ourCost, recurring });
  }
  const sum = (f: (y: DealYear) => number) => years.reduce((s, y) => s + f(y), 0);
  const price = sum((y) => y.price);
  const margin = sum((y) => y.margin);
  const y1 = years[0];
  const partnerPaid = lines.filter((l) => l.kind !== "share" && (l.payer === "partner" || l.payer === "grant"));
  const whoPays: DealSummary["whoPaysYear1"] = [
    { payer: "client" as Payer, label: c.name, amount: y1.clientPaysEcoheart + y1.clientDirect },
    ...y1.shares.map((s) => ({ payer: s.payer as Payer, label: s.label, amount: s.amount })),
    ...partnerPaid.map((l) => ({
      payer: l.payer as Payer,
      label: l.partner || l.label,
      amount: l.kind === "people" ? n(l.hours) * n(l.costRate) : n(l.amount) + n(l.monthly) * n(l.months),
    })),
  ].filter((x) => x.amount > 0);
  const per = c.contract?.payments === "monthly" ? 12 : c.contract?.payments === "quarterly" ? 4 : 1;
  const arr = years[years.length > 1 ? 1 : 0].recurring;
  return {
    size,
    offer,
    ongoing,
    listOneTime: base.oneTime,
    listYearly: base.yearly,
    billedPeople,
    years,
    total: {
      price,
      clientPays: sum((y) => y.clientPaysEcoheart + y.clientDirect),
      partners: sum((y) => y.shares.reduce((s, x) => s + x.amount, 0)),
      ourCost: sum((y) => y.ourCost),
      margin,
      marginPct: price > 0 ? margin / price : 0,
    },
    arr,
    mrr: arr / 12,
    paymentsYear1: Array.from({ length: per }, (_, i) => ({
      label: per === 1 ? "Year one" : per === 4 ? `Q${i + 1}` : `Month ${i + 1}`,
      amount: y1.clientPaysEcoheart / per,
    })),
    whoPaysYear1: whoPays,
    items: base.items,
  };
}

export function bundleDiscount(table: DiscountRow[], cities: number, size: Size) {
  const row = table.find((r) => cities >= r.from && cities <= r.to);
  return row && row.allowed ? row.pct[size] : 0;
}

export interface BundleSummary {
  counts: Record<Size, number>;
  cities: number;
  bySize: { size: Size; count: number; each: number; discountPct: number; year1: number }[];
  years: { year: number; total: number }[];
  total: number;
  arr: number;
  mrr: number;
  quarterly: number;
}

export function bundleSummary(
  b: Bundle,
  clients: Client[],
  offers: Offer[],
  catalog: CatalogItem[],
  discounts: DiscountRow[],
  bands: SizeBands = DEFAULT_SIZE_BANDS,
): BundleSummary {
  const counts: Record<Size, number> = { Small: 0, "Mid-size": 0, Large: 0, Major: 0 };
  if (b.state && STATE_CITY_COUNTS[b.state]) Object.assign(counts, STATE_CITY_COUNTS[b.state]);
  for (const id of b.clientIds ?? []) {
    const c = clients.find((x) => x.id === id);
    if (c) counts[sizeFor(c, bands)] += 1;
  }
  const cities = SIZES.reduce((s, z) => s + counts[z], 0);
  const offer = offers.find((o) => o.id === b.offerId);
  const esc = n(b.escalatorPct) / 100;
  const bySize = SIZES.map((size) => {
    const p = offerPrice(offer, size, "US", catalog);
    const discountPct = bundleDiscount(discounts, cities, size);
    const each = (p.oneTime + p.yearly) * (1 - discountPct / 100);
    return { size, count: counts[size], each, discountPct, year1: each * counts[size], yearlyEach: p.yearly * (1 - discountPct / 100) };
  });
  const yearsN = Math.max(1, Math.round(n(b.years) || 1));
  const years = Array.from({ length: yearsN }, (_, i) => ({
    year: i + 1,
    total:
      i === 0
        ? bySize.reduce((s, x) => s + x.year1, 0)
        : bySize.reduce((s, x) => s + x.yearlyEach * x.count, 0) * Math.pow(1 + esc, i),
  }));
  const arr = bySize.reduce((s, x) => s + x.yearlyEach * x.count, 0);
  return {
    counts,
    cities,
    bySize: bySize.map(({ size, count, each, discountPct, year1 }) => ({ size, count, each, discountPct, year1 })),
    years,
    total: years.reduce((s, y) => s + y.total, 0),
    arr,
    mrr: arr / 12,
    quarterly: years[0].total / 4,
  };
}

/** Value a client profile gives a key, for one basis column. */
export function localFor(c: Client | undefined, key: string, basis: Basis): number | undefined {
  const lv = c?.local?.[key];
  return lv ? lv[basis] : undefined;
}

/** "the city" / "the nation" / "the organization", for plain-words text. */
export function clientNoun(t: ClientType | undefined) {
  if (t === "city") return "city";
  if (t === "county") return "county";
  if (t === "tribal nation") return "nation";
  if (t === "state agency") return "agency";
  return "organization";
}
