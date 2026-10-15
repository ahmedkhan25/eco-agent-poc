"use client";

// Client state for the ROI Advisor.
//   Shared workspace (synced for the whole team through /api/roi/state):
//     assumption library, use cases, client profiles, catalog, offers, bundles.
//   Personal (this browser only): scenarios on the canvas, compare, report draft.
// A scenario keeps only its own overrides. Values resolve in this order:
//   scenario override > client profile value > library column (cautious / expected / business case).

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { computeRoi, keysFor, type Assumption, type Basis, type RoiResult, type UseCaseModel, type ValueLine, type Values } from "./engine";
import {
  dealSummary,
  DEFAULT_DISCOUNTS,
  DEFAULT_SIZE_BANDS,
  type Adjustment,
  type Bundle,
  type CatalogItem,
  type Client,
  type CostLine,
  type DiscountRow,
  type LocalValue,
  type Offer,
  type SizeBands,
} from "./pricing";
import { DEFAULT_ASSUMPTIONS, DEFAULT_CATALOG, DEFAULT_CLIENTS, DEFAULT_MODELS, DEFAULT_OFFERS, templateFor } from "./defaults";

export interface Scenario {
  id: string;
  name: string;
  clientId: string;
  modelIds: string[];
  question: string;
  basis: Basis;
  overrides: Record<string, number>; // assumption keys, plus "fee" for the client's year-one payment
  notes: string;
  createdBy: "agent" | "person";
  createdAt: number;
}

export interface ReportDraft {
  scenarioId: string;
  audience: string;
  summary: string;
  nextSteps: string[];
  createdAt: number;
}

export interface Workspace {
  assumptions: Assumption[];
  models: UseCaseModel[];
  clients: Client[];
  catalog: CatalogItem[];
  offers: Offer[];
  discounts: DiscountRow[];
  sizeBands: SizeBands;
  bundles: Bundle[];
  marginFloorPct: number;
}

export const WORKSPACE_KEYS: (keyof Workspace)[] = [
  "assumptions",
  "models",
  "clients",
  "catalog",
  "offers",
  "discounts",
  "sizeBands",
  "bundles",
  "marginFloorPct",
];

export function defaultWorkspace(): Workspace {
  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
  return {
    assumptions: clone(DEFAULT_ASSUMPTIONS),
    models: clone(DEFAULT_MODELS),
    clients: clone(DEFAULT_CLIENTS),
    catalog: clone(DEFAULT_CATALOG),
    offers: clone(DEFAULT_OFFERS),
    discounts: clone(DEFAULT_DISCOUNTS),
    sizeBands: { ...DEFAULT_SIZE_BANDS },
    bundles: [{ id: "arizona", name: "Arizona statewide (Supported pilot)", state: "Arizona", clientIds: [], offerId: "supported-pilot", years: 3, escalatorPct: 1.5 }],
    marginFloorPct: 20,
  };
}

interface RoiState extends Workspace {
  scenarios: Scenario[];
  activeId: string | null;
  compareIds: string[];
  report: ReportDraft | null;
  chatOpen: boolean;
  activeClientId: string;
  /** Last time the shared workspace changed here, and the last version seen from the team. */
  workspaceEditedAt: number;
  workspaceSyncedAt: number;

  // scenarios
  addScenario: (s: Omit<Scenario, "id" | "createdAt">) => Scenario;
  updateScenario: (id: string, patch: Partial<Omit<Scenario, "id">>) => void;
  setOverride: (id: string, key: string, value: number | null) => void;
  removeScenario: (id: string) => void;
  setActive: (id: string | null) => void;
  toggleCompare: (id: string) => void;
  setCompare: (ids: string[]) => void;
  setReport: (r: ReportDraft | null) => void;
  setChatOpen: (open: boolean) => void;
  setActiveClient: (id: string) => void;

  // assumption library
  setAssumption: <F extends keyof Assumption>(key: string, field: F, value: Assumption[F]) => void;
  addAssumption: (a: Assumption) => void;
  resetAssumptions: () => void;
  resetAssumption: (key: string) => void;

  // use cases
  addModel: (m: UseCaseModel) => void;
  updateModel: (id: string, patch: Partial<UseCaseModel>) => void;
  addValueLine: (modelId: string, line: ValueLine) => void;
  removeValueLine: (modelId: string, lineId: string) => void;
  removeModel: (id: string) => void;
  resetModels: () => void;

  // clients
  addClient: (c: Client) => void;
  updateClient: (id: string, patch: Partial<Client>) => void;
  removeClient: (id: string) => void;
  setLocal: (clientId: string, key: string, v: LocalValue | null) => void;
  confirmLocal: (clientId: string, key: string) => void;
  addCostLine: (clientId: string, line: CostLine) => void;
  updateCostLine: (clientId: string, lineId: string, patch: Partial<CostLine>) => void;
  removeCostLine: (clientId: string, lineId: string) => void;
  addAdjustment: (clientId: string, a: Adjustment) => void;
  removeAdjustment: (clientId: string, id: string) => void;
  applyOfferTemplate: (clientId: string) => void;
  resetClient: (id: string) => void;

  // pricing
  updateCatalogItem: (id: string, patch: Partial<CatalogItem>) => void;
  setCatalogSize: (id: string, size: keyof CatalogItem["bySize"], patch: Partial<{ qty: number; rate: number }>) => void;
  updateOffer: (id: string, patch: Partial<Offer>) => void;
  setDiscounts: (rows: DiscountRow[]) => void;
  setSizeBands: (b: SizeBands) => void;
  setMarginFloor: (pct: number) => void;
  addBundle: (b: Bundle) => void;
  updateBundle: (id: string, patch: Partial<Bundle>) => void;
  removeBundle: (id: string) => void;
  resetPricing: () => void;

  /** Replace the shared workspace with the team's latest copy. */
  loadWorkspace: (w: Partial<Workspace>, syncedAt: number) => void;
  resetWorkspace: () => void;
}

export const newId = () => Math.random().toString(36).slice(2, 8);

const SEED: Scenario = {
  id: "hollywood",
  name: "Hollywood storm resilience",
  clientId: "hollywood",
  modelIds: ["storm"],
  question: "What does a year of the ROI Advisor return on storm and insurance costs?",
  basis: "expected",
  overrides: {},
  notes: "Starting example from Jerid's draft business case.",
  createdBy: "person",
  createdAt: 0,
};

export const useRoiStore = create<RoiState>()(
  persist(
    (set, get) => {
      // Every shared-workspace change stamps workspaceEditedAt so the sync can push it.
      const ws = (patch: Partial<Workspace>) => set({ ...patch, workspaceEditedAt: Date.now() });
      const mapClient = (id: string, f: (c: Client) => Client) => ws({ clients: get().clients.map((c) => (c.id === id ? f(c) : c)) });
      return {
        ...defaultWorkspace(),
        scenarios: [SEED],
        activeId: SEED.id,
        compareIds: [],
        report: null,
        chatOpen: true,
        activeClientId: "hollywood",
        workspaceEditedAt: 0,
        workspaceSyncedAt: 0,

        addScenario: (s) => {
          const scenario: Scenario = { ...s, id: newId(), createdAt: Date.now() };
          set({ scenarios: [scenario, ...get().scenarios], activeId: scenario.id });
          return scenario;
        },
        updateScenario: (id, patch) => set({ scenarios: get().scenarios.map((s) => (s.id === id ? { ...s, ...patch } : s)) }),
        setOverride: (id, key, value) =>
          set({
            scenarios: get().scenarios.map((s) => {
              if (s.id !== id) return s;
              const overrides = { ...s.overrides };
              if (value === null || Number.isNaN(value)) delete overrides[key];
              else overrides[key] = value;
              return { ...s, overrides };
            }),
          }),
        removeScenario: (id) => {
          const scenarios = get().scenarios.filter((s) => s.id !== id);
          set({
            scenarios,
            activeId: get().activeId === id ? scenarios[0]?.id ?? null : get().activeId,
            compareIds: get().compareIds.filter((c) => c !== id),
          });
        },
        setActive: (id) => set({ activeId: id }),
        toggleCompare: (id) => {
          const c = get().compareIds;
          set({ compareIds: c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-4) });
        },
        setCompare: (ids) => set({ compareIds: ids.slice(0, 4) }),
        setReport: (report) => set({ report }),
        setChatOpen: (chatOpen) => set({ chatOpen }),
        setActiveClient: (activeClientId) => set({ activeClientId }),

        setAssumption: (key, field, value) => ws({ assumptions: get().assumptions.map((a) => (a.key === key ? { ...a, [field]: value } : a)) }),
        addAssumption: (a) => ws({ assumptions: [...get().assumptions.filter((x) => x.key !== a.key), a] }),
        resetAssumptions: () =>
          ws({
            assumptions: [
              ...JSON.parse(JSON.stringify(DEFAULT_ASSUMPTIONS)),
              ...get().assumptions.filter((a) => !DEFAULT_ASSUMPTIONS.some((d) => d.key === a.key)),
            ],
          }),
        resetAssumption: (key) =>
          ws({ assumptions: get().assumptions.map((a) => (a.key === key ? { ...(DEFAULT_ASSUMPTIONS.find((d) => d.key === key) ?? a) } : a)) }),

        addModel: (m) => ws({ models: [...get().models.filter((x) => x.id !== m.id), m] }),
        updateModel: (id, patch) => ws({ models: get().models.map((m) => (m.id === id ? { ...m, ...patch } : m)) }),
        addValueLine: (modelId, line) =>
          ws({ models: get().models.map((m) => (m.id === modelId ? { ...m, lines: [...m.lines.filter((l) => l.id !== line.id), line] } : m)) }),
        removeValueLine: (modelId, lineId) =>
          ws({ models: get().models.map((m) => (m.id === modelId ? { ...m, lines: m.lines.filter((l) => l.id !== lineId) } : m)) }),
        removeModel: (id) => ws({ models: get().models.filter((m) => m.id !== id) }),
        resetModels: () =>
          ws({ models: [...JSON.parse(JSON.stringify(DEFAULT_MODELS)), ...get().models.filter((m) => !DEFAULT_MODELS.some((d) => d.id === m.id))] }),

        addClient: (c) => ws({ clients: [...get().clients.filter((x) => x.id !== c.id), c] }),
        updateClient: (id, patch) => mapClient(id, (c) => ({ ...c, ...patch })),
        removeClient: (id) => {
          ws({ clients: get().clients.filter((c) => c.id !== id) });
          for (const s of get().scenarios.filter((x) => x.clientId === id)) get().removeScenario(s.id);
        },
        setLocal: (clientId, key, v) =>
          mapClient(clientId, (c) => {
            const local = { ...c.local };
            if (v) local[key] = v;
            else delete local[key];
            return { ...c, local };
          }),
        confirmLocal: (clientId, key) =>
          mapClient(clientId, (c) => (c.local[key] ? { ...c, local: { ...c.local, [key]: { ...c.local[key], status: "confirmed", by: "person", at: Date.now() } } } : c)),
        addCostLine: (clientId, line) => mapClient(clientId, (c) => ({ ...c, costLines: [...c.costLines, line] })),
        updateCostLine: (clientId, lineId, patch) =>
          mapClient(clientId, (c) => ({ ...c, costLines: c.costLines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)) })),
        removeCostLine: (clientId, lineId) => mapClient(clientId, (c) => ({ ...c, costLines: c.costLines.filter((l) => l.id !== lineId) })),
        addAdjustment: (clientId, a) => mapClient(clientId, (c) => ({ ...c, adjustments: [...c.adjustments, a] })),
        removeAdjustment: (clientId, id) => mapClient(clientId, (c) => ({ ...c, adjustments: c.adjustments.filter((a) => a.id !== id) })),
        applyOfferTemplate: (clientId) =>
          mapClient(clientId, (c) => ({
            ...c,
            // Keep SMEs and partner shares; replace the offer's own team and running costs.
            costLines: [...templateFor(get().offers, c.offerId), ...c.costLines.filter((l) => l.personType === "sme" || l.kind === "share")],
          })),
        resetClient: (id) => {
          const d = DEFAULT_CLIENTS.find((c) => c.id === id);
          if (d) mapClient(id, () => JSON.parse(JSON.stringify(d)));
        },

        updateCatalogItem: (id, patch) => ws({ catalog: get().catalog.map((c) => (c.id === id ? { ...c, ...patch } : c)) }),
        setCatalogSize: (id, size, patch) =>
          ws({ catalog: get().catalog.map((c) => (c.id === id ? { ...c, bySize: { ...c.bySize, [size]: { ...c.bySize[size], ...patch } } } : c)) }),
        updateOffer: (id, patch) => ws({ offers: get().offers.map((o) => (o.id === id ? { ...o, ...patch } : o)) }),
        setDiscounts: (discounts) => ws({ discounts }),
        setSizeBands: (sizeBands) => ws({ sizeBands }),
        setMarginFloor: (marginFloorPct) => ws({ marginFloorPct }),
        addBundle: (b) => ws({ bundles: [...get().bundles.filter((x) => x.id !== b.id), b] }),
        updateBundle: (id, patch) => ws({ bundles: get().bundles.map((b) => (b.id === id ? { ...b, ...patch } : b)) }),
        removeBundle: (id) => ws({ bundles: get().bundles.filter((b) => b.id !== id) }),
        resetPricing: () => {
          const d = defaultWorkspace();
          ws({ catalog: d.catalog, offers: d.offers, discounts: d.discounts, sizeBands: d.sizeBands, marginFloorPct: d.marginFloorPct });
        },

        loadWorkspace: (w, syncedAt) => {
          const patch: Partial<Workspace> = {};
          for (const k of WORKSPACE_KEYS) if (w[k] !== undefined) (patch as Record<string, unknown>)[k] = w[k];
          set({ ...patch, workspaceSyncedAt: syncedAt, workspaceEditedAt: syncedAt });
        },
        resetWorkspace: () => ws(defaultWorkspace()),
      };
    },
    {
      name: "ecoheart-roi-v1",
      version: 2,
      migrate: (old, version) => migrateV1(old as Record<string, unknown>, version) as never,
    }
  )
);

/** v1 had one fixed storm model, cities as free text, and a single internal cost model. */
function migrateV1(old: Record<string, unknown>, version: number) {
  if (version >= 2) return old;
  const fresh = defaultWorkspace();
  const oldAssumptions = (old.assumptions as Assumption[] | undefined) ?? [];
  const assumptions = fresh.assumptions.map((a) => {
    const o = oldAssumptions.find((x) => x.key === a.key);
    return o ? { ...a, low: o.low, expected: o.expected, high: o.high, source: o.source, confidence: o.confidence, owner: o.owner } : a;
  });
  const clients = [...fresh.clients];
  const clientFor = (city: string) => {
    const name = (city || "").trim();
    const hit = clients.find((c) => name && c.name.toLowerCase().startsWith(name.toLowerCase().split(",")[0]));
    if (hit) return hit.id;
    if (!name) return "hollywood";
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || newId();
    clients.push({ ...JSON.parse(JSON.stringify(fresh.clients[0])), id, name, state: "", population: undefined, local: {}, notes: "Created from an earlier scenario" });
    return id;
  };
  const scenarios = ((old.scenarios as (Scenario & { city?: string })[] | undefined) ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    clientId: clientFor(s.city ?? ""),
    modelIds: ["storm"],
    question: s.question,
    basis: s.basis,
    overrides: s.overrides ?? {},
    notes: s.notes ?? "",
    createdBy: s.createdBy,
    createdAt: s.createdAt,
  }));
  return {
    ...fresh,
    assumptions,
    clients,
    scenarios: scenarios.length ? scenarios : [SEED],
    activeId: (old.activeId as string) ?? SEED.id,
    compareIds: (old.compareIds as string[]) ?? [],
    report: old.report ?? null,
    chatOpen: old.chatOpen ?? true,
    activeClientId: "hollywood",
    workspaceEditedAt: 0,
    workspaceSyncedAt: 0,
  };
}

// ---------------------------------------------------------------------------
// Derived values
// ---------------------------------------------------------------------------

type WS = Pick<Workspace, "assumptions" | "models" | "clients" | "catalog" | "offers" | "sizeBands">;
type ScenarioLike = Pick<Scenario, "basis" | "overrides" | "clientId" | "modelIds">;

export function modelsFor(ids: string[], st: Pick<Workspace, "models">): UseCaseModel[] {
  return ids.map((id) => st.models.find((m) => m.id === id)).filter((m): m is UseCaseModel => !!m);
}

/** Values for one basis: library column, then the client's own values, then scenario overrides. */
export function scenarioInputs(s: ScenarioLike, st: WS): Values {
  const client = st.clients.find((c) => c.id === s.clientId);
  const v: Values = {};
  for (const a of st.assumptions) v[a.key] = a[s.basis];
  for (const [k, lv] of Object.entries(client?.local ?? {})) v[k] = lv[s.basis];
  for (const [k, x] of Object.entries(s.overrides ?? {})) if (k !== "fee") v[k] = x;
  return v;
}

/** What one key resolves to for a client, and where it came from. */
export function resolveKey(key: string, basis: Basis, clientId: string, st: WS) {
  const a = st.assumptions.find((x) => x.key === key);
  const lv = st.clients.find((c) => c.id === clientId)?.local?.[key];
  if (lv)
    return { value: lv[basis], from: lv.status === "confirmed" ? ("client" as const) : ("proposed" as const), source: lv.source, confidence: lv.confidence, owner: lv.owner, a };
  return { value: a ? a[basis] : 0, from: "library" as const, source: a?.source ?? "", confidence: a?.confidence ?? "low", owner: a?.owner ?? "", a };
}

export function clientDeal(clientId: string, st: WS) {
  const c = st.clients.find((x) => x.id === clientId);
  return c ? dealSummary(c, st.offers, st.catalog, st.sizeBands) : null;
}

export function scenarioResult(s: ScenarioLike, st: WS): RoiResult {
  const deal = clientDeal(s.clientId, st);
  const y1 = deal?.years[0];
  const fee = typeof s.overrides?.fee === "number" ? s.overrides.fee : y1?.clientPaysEcoheart ?? 0;
  const extra = y1 && y1.clientDirect > 0 ? [{ label: "Client's own services", amount: y1.clientDirect }] : [];
  return computeRoi(modelsFor(s.modelIds, st), scenarioInputs(s, st), fee, extra);
}

export function scenarioKeys(s: Pick<Scenario, "modelIds">, st: Pick<Workspace, "models">) {
  return keysFor(modelsFor(s.modelIds, st));
}

export function originalAssumption(key: string) {
  return DEFAULT_ASSUMPTIONS.find((a) => a.key === key);
}

/** Every shared value that differs from the starting values. */
export function changesFromOriginal(st: Workspace) {
  const out: { where: string; item: string; field: string; original: unknown; current: unknown }[] = [];
  for (const a of st.assumptions) {
    const d = DEFAULT_ASSUMPTIONS.find((x) => x.key === a.key);
    if (!d) {
      out.push({ where: "assumption", item: `${a.key} (${a.label})`, field: "added", original: null, current: a.expected });
      continue;
    }
    for (const f of ["low", "expected", "high", "source", "confidence", "owner"] as const)
      if (a[f] !== d[f]) out.push({ where: "assumption", item: `${a.key} (${a.label})`, field: f, original: d[f], current: a[f] });
  }
  for (const m of st.models) if (!DEFAULT_MODELS.some((d) => d.id === m.id)) out.push({ where: "use case", item: m.name, field: "added", original: null, current: m.lines.length + " lines" });
  for (const c of st.clients) {
    const d = DEFAULT_CLIENTS.find((x) => x.id === c.id);
    if (!d) out.push({ where: "client", item: c.name, field: "added", original: null, current: c.type });
    for (const [k, lv] of Object.entries(c.local)) out.push({ where: `client ${c.name}`, item: k, field: lv.status, original: originalAssumption(k)?.expected ?? null, current: lv.expected });
  }
  for (const it of st.catalog) {
    const d = DEFAULT_CATALOG.find((x) => x.id === it.id);
    if (d && JSON.stringify(d) !== JSON.stringify(it)) out.push({ where: "catalog", item: it.name, field: "changed", original: null, current: null });
  }
  for (const o of st.offers) {
    const d = DEFAULT_OFFERS.find((x) => x.id === o.id);
    if (d && (d.oneTime !== o.oneTime || d.yearly !== o.yearly)) out.push({ where: "offer", item: o.name, field: "price", original: d.oneTime + d.yearly, current: o.oneTime + o.yearly });
  }
  return out;
}

export function pickWorkspace(st: Workspace): Workspace {
  const out = {} as Record<string, unknown>;
  for (const k of WORKSPACE_KEYS) out[k] = st[k];
  return out as unknown as Workspace;
}
