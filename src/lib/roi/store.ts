"use client";

// Client state for the ROI Advisor workspace. Scenarios keep only their own
// overrides; everything else comes from the shared assumption library, so an
// edit on the Model tab flows into every scenario that hasn't overridden it.
// Phase 1 persists to this browser (localStorage); Supabase comes later.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { computeRoi, type InputKey, type RoiInputs, type RoiResult } from "./engine";
import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_OFFERS,
  DEFAULT_ROLES,
  DEFAULT_RUN,
  inputsFor,
  type Assumption,
  type Basis,
  type Offer,
  type RoleCost,
  type RunCost,
} from "./defaults";

export interface Scenario {
  id: string;
  name: string;
  city: string;
  question: string;
  basis: Basis;
  overrides: Partial<RoiInputs>;
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

interface RoiState {
  scenarios: Scenario[];
  activeId: string | null;
  compareIds: string[];
  report: ReportDraft | null;
  assumptions: Assumption[];
  roles: RoleCost[];
  run: RunCost[];
  offers: Offer[];
  chatOpen: boolean;

  addScenario: (s: Omit<Scenario, "id" | "createdAt">) => Scenario;
  updateScenario: (id: string, patch: Partial<Omit<Scenario, "id">>) => void;
  setOverride: (id: string, key: InputKey, value: number | null) => void;
  removeScenario: (id: string) => void;
  setActive: (id: string | null) => void;
  toggleCompare: (id: string) => void;
  setCompare: (ids: string[]) => void;
  setReport: (r: ReportDraft | null) => void;
  setAssumption: <F extends keyof Assumption>(key: InputKey, field: F, value: Assumption[F]) => void;
  resetAssumptions: () => void;
  resetAssumption: (key: InputKey) => void;
  setRole: (i: number, patch: Partial<RoleCost>) => void;
  setRun: (i: number, patch: Partial<RunCost>) => void;
  setOffer: (i: number, patch: Partial<Offer>) => void;
  resetCosts: () => void;
  setChatOpen: (open: boolean) => void;
}

const newId = () => Math.random().toString(36).slice(2, 8);

const SEED: Scenario = {
  id: "hollywood",
  name: "Hollywood storm resilience",
  city: "Hollywood, FL",
  question: "What does a year of the ROI Advisor return on storm and insurance costs?",
  basis: "expected",
  overrides: {},
  notes: "Starting example from Jerid's draft business case.",
  createdBy: "person",
  createdAt: 0,
};

export const useRoiStore = create<RoiState>()(
  persist(
    (set, get) => ({
      scenarios: [SEED],
      activeId: SEED.id,
      compareIds: [],
      report: null,
      assumptions: DEFAULT_ASSUMPTIONS,
      roles: DEFAULT_ROLES,
      run: DEFAULT_RUN,
      offers: DEFAULT_OFFERS,
      chatOpen: true,

      addScenario: (s) => {
        const scenario: Scenario = { ...s, id: newId(), createdAt: Date.now() };
        set({ scenarios: [scenario, ...get().scenarios], activeId: scenario.id });
        return scenario;
      },
      updateScenario: (id, patch) =>
        set({ scenarios: get().scenarios.map((s) => (s.id === id ? { ...s, ...patch } : s)) }),
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
      setAssumption: (key, field, value) =>
        set({ assumptions: get().assumptions.map((a) => (a.key === key ? { ...a, [field]: value } : a)) }),
      resetAssumptions: () => set({ assumptions: DEFAULT_ASSUMPTIONS }),
      resetAssumption: (key) =>
        set({
          assumptions: get().assumptions.map((a) => (a.key === key ? DEFAULT_ASSUMPTIONS.find((d) => d.key === key) ?? a : a)),
        }),
      setRole: (i, patch) => set({ roles: get().roles.map((r, j) => (j === i ? { ...r, ...patch } : r)) }),
      setRun: (i, patch) => set({ run: get().run.map((r, j) => (j === i ? { ...r, ...patch } : r)) }),
      setOffer: (i, patch) => set({ offers: get().offers.map((o, j) => (j === i ? { ...o, ...patch } : o)) }),
      resetCosts: () => set({ roles: DEFAULT_ROLES, run: DEFAULT_RUN, offers: DEFAULT_OFFERS }),
      setChatOpen: (chatOpen) => set({ chatOpen }),
    }),
    { name: "ecoheart-roi-v1", version: 1 }
  )
);

export function scenarioInputs(s: Pick<Scenario, "basis" | "overrides">, assumptions: Assumption[]): RoiInputs {
  return { ...inputsFor(assumptions, s.basis), ...s.overrides } as RoiInputs;
}

export function scenarioResult(s: Pick<Scenario, "basis" | "overrides">, assumptions: Assumption[]): RoiResult {
  return computeRoi(scenarioInputs(s, assumptions));
}

/** Internal cost model totals for the Model tab and the agent. */
export function costTotals(roles: RoleCost[], run: RunCost[], offers: Offer[]) {
  const hours = roles.reduce((s, r) => s + r.hours, 0);
  const listValue = roles.reduce((s, r) => s + r.hours * r.listRate, 0);
  const teamCost = roles.reduce((s, r) => s + r.hours * r.internalRate, 0);
  const runMonthly = run.reduce((s, r) => s + r.monthly, 0);
  const partner = offers.find((o) => /partner/i.test(o.name)) ?? offers[0];
  const projectCost = teamCost + runMonthly * 3;
  const margin = partner ? partner.price - projectCost : 0;
  return {
    hours,
    listValue,
    teamCost,
    runMonthly,
    runYearly: runMonthly * 12,
    partnerPrice: partner?.price ?? 0,
    projectCost,
    margin,
    marginPct: partner && partner.price > 0 ? margin / partner.price : 0,
  };
}

/** Original value of one assumption field, or undefined. */
export function originalAssumption(key: InputKey) {
  return DEFAULT_ASSUMPTIONS.find((a) => a.key === key);
}

/** Every library and cost-model value that differs from the starting values. */
export function changesFromOriginal(state: Pick<RoiState, "assumptions" | "roles" | "run" | "offers">) {
  const out: { where: string; item: string; field: string; original: unknown; current: unknown }[] = [];
  for (const a of state.assumptions) {
    const d = DEFAULT_ASSUMPTIONS.find((x) => x.key === a.key);
    if (!d) continue;
    for (const f of ["low", "expected", "high", "source", "confidence", "owner"] as const)
      if (a[f] !== d[f]) out.push({ where: "assumption", item: `${a.key} (${a.label})`, field: f, original: d[f], current: a[f] });
  }
  const diff = <T extends object>(where: string, cur: T[], orig: T[], name: (x: T) => string) =>
    cur.forEach((c, i) => {
      const o = orig[i];
      if (!o) return;
      for (const f of Object.keys(c) as (keyof T)[])
        if (c[f] !== o[f]) out.push({ where, item: name(o), field: String(f), original: o[f], current: c[f] });
    });
  diff("role", state.roles, DEFAULT_ROLES, (r) => r.role);
  diff("run cost", state.run, DEFAULT_RUN, (r) => r.item);
  diff("offer", state.offers, DEFAULT_OFFERS, (o) => o.name);
  return out;
}
