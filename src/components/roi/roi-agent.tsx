"use client";

// Registers what the ROI chat agent can see and do. Mounted once in the ROI
// shell, so the agent works from every tab. Each action renders a small card
// in the chat (generative UI) and changes the workspace itself.
// Claude sometimes sends lists or objects as JSON strings, renames params, or
// gives names instead of ids, so every handler is lenient about its inputs.

import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, FileText, Search } from "lucide-react";
import { BLOCK_KEYS, fmtMoney, SUPER_SYSTEMS, type Assumption, type Block, type Unit, type ValueLine } from "@/lib/roi/engine";
import { BASIS_LABEL, DEFAULT_ASSUMPTIONS, templateFor, type Basis, type Confidence } from "@/lib/roi/defaults";
import { bundleSummary, CLIENT_TYPES, SIZES, sizeFor, type Client, type ClientType, type CostLine, type Payer, type Size } from "@/lib/roi/pricing";
import {
  changesFromOriginal,
  clientDeal,
  modelsFor,
  newId,
  resolveKey,
  scenarioResult,
  useRoiStore,
  type Scenario,
} from "@/lib/roi/store";
import { gaps, sensitivity, summarizeChecks, validateClient, validateScenario, checkModel, type Check } from "@/lib/roi/validate";
import { findSkill, SKILLS } from "@/lib/roi/skills";
import { RESOURCES } from "@/lib/roi/about";
import { ROI_AGENT_INSTRUCTIONS } from "@/lib/roi/prompt";
import { SITE_GUIDE } from "@/lib/roi/guide";
import { ChecksBadge, ChecksList, ExportButtons, GuideCard, LinkCards, MiniScenario, Working, WhoPaysBar, headline, ink } from "./ui";
import { clientWorkbook, download, scenarioWorkbook, useCaseWorkbook, type Workbook } from "@/lib/roi/export";

// ---------------------------------------------------------------------------
// Lenient input helpers
// ---------------------------------------------------------------------------

function parse(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const t = v.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return v;
  try {
    return JSON.parse(t);
  } catch {
    return v;
  }
}

function strList(v: unknown): string[] {
  v = parse(v);
  if (typeof v === "string") v = v.split(",");
  if (typeof v === "string") v = [v];
  return Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const x = Number(v.replace(/[$,%\s]/g, ""));
    if (v.trim() !== "" && Number.isFinite(x)) return x;
  }
  return undefined;
}

const key = (x: unknown) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const asBasis = (b: unknown): Basis => {
  const k = key(b);
  return k === "low" || k === "cautious" ? "low" : k === "high" || k.startsWith("business") ? "high" : "expected";
};
const asConfidence = (c: unknown): Confidence => (key(c) === "high" ? "high" : key(c) === "medium" ? "medium" : "low");
const asUnit = (u: unknown): Unit => {
  const k = key(u);
  return k.includes("percent") || String(u).includes("%") ? "%" : k.startsWith("hour") || k === "h" ? "hours" : k === "count" || k === "number" || k === "events" ? "count" : "$";
};
const asPayer = (p: unknown): Payer => {
  const k = key(p);
  return k.startsWith("client") || k.startsWith("city") ? "client" : k.startsWith("partner") || k.startsWith("third") ? "partner" : k.startsWith("grant") ? "grant" : "ecoheart";
};

function findClient(ref: unknown): Client | undefined {
  const { clients } = useRoiStore.getState();
  const k = key(ref);
  if (!k) return undefined;
  return clients.find((c) => c.id === ref) ?? clients.find((c) => key(c.id) === k) ?? clients.find((c) => key(c.name) === k) ?? clients.find((c) => key(c.name).startsWith(k) || k.startsWith(key(c.name.split(",")[0])));
}

function findModelIds(v: unknown): string[] {
  const { models } = useRoiStore.getState();
  return strList(v)
    .map((r) => models.find((m) => m.id === r) ?? models.find((m) => key(m.id) === key(r) || key(m.name) === key(r) || key(m.name).includes(key(r))))
    .filter(Boolean)
    .map((m) => m!.id)
    .filter((id, i, a) => a.indexOf(id) === i);
}

/** Overrides: any assumption key (or "fee"). Accepts an object, a JSON string, or keys at the top level. */
function clean(o: unknown, top?: Record<string, unknown>): Record<string, number> {
  o = parse(o);
  const merged = { ...(top ?? {}), ...(o && typeof o === "object" ? (o as Record<string, unknown>) : {}) };
  const keys = new Set([...useRoiStore.getState().assumptions.map((a) => a.key), "fee"]);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(merged)) {
    const x = num(v);
    if (keys.has(k) && x !== undefined) out[k] = x;
  }
  return out;
}

function exportWorkbook(what: string, id: unknown, clientRef?: unknown): Workbook | null {
  const st = useRoiStore.getState();
  if (what === "useCase") {
    const m = findModelIds(id)[0];
    return m ? useCaseWorkbook(m, st, findClient(clientRef)?.id) : null;
  }
  if (what === "client") {
    const c = findClient(id);
    return c ? clientWorkbook(c.id, st) : null;
  }
  const sid = st.scenarios.find((x) => x.id === id || key(x.name) === key(id))?.id ?? (key(id) === "active" ? st.activeId : null);
  return sid ? scenarioWorkbook(sid, st) : null;
}

function pickResources(args: Record<string, unknown>) {
  const wanted = Object.entries(args ?? {})
    .filter(([k]) => k !== "note")
    .flatMap(([, v]) => strList(v))
    .map(key)
    .filter(Boolean);
  return RESOURCES.filter((r) => wanted.some((w) => w === key(r.id) || w.startsWith(key(r.id)) || key(r.title).includes(w)));
}

function summarize(id: string) {
  const st = useRoiStore.getState();
  const s = st.scenarios.find((x) => x.id === id);
  if (!s) return null;
  const r = scenarioResult(s, st);
  const client = st.clients.find((c) => c.id === s.clientId);
  const checks = summarizeChecks(validateScenario(s, st));
  return {
    id: s.id,
    name: s.name,
    client: client?.name ?? s.clientId,
    clientId: s.clientId,
    useCases: modelsFor(s.modelIds, st).map((m) => m.name),
    basis: BASIS_LABEL[s.basis],
    overrides: s.overrides,
    netYearOne: fmtMoney(r.net),
    returnPerDollar: `$${r.returnPerDollar.toFixed(2)}`,
    paybackMonths: r.paybackMonths,
    clientSpends: fmtMoney(r.spent),
    feePaidToEcoheart: fmtMoney(r.fee),
    totalValue: fmtMoney(r.saved),
    biggestDrivers: r.drivers.slice(0, 3).map((d) => `${d.label}: ${fmtMoney(d.value)}`),
    outcomes: r.outcomes.map((o) => `${o.label}: ${o.value}`),
    checks: `${checks.fail} to fix, ${checks.warn} to check`,
  };
}

function clientSummary(c: Client) {
  const st = useRoiStore.getState();
  const d = clientDeal(c.id, st);
  const checks = summarizeChecks(validateClient(c, st));
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    state: c.state,
    region: c.region,
    population: c.population,
    size: sizeFor(c, st.sizeBands),
    useCases: c.modelIds,
    offer: d?.offer?.name,
    ongoing: d?.ongoing?.name,
    contract: c.contract,
    yearOnePrice: d ? fmtMoney(d.years[0].price) : null,
    clientPaysYearOne: d ? fmtMoney(d.years[0].clientPaysEcoheart) : null,
    contractTotal: d ? fmtMoney(d.total.price) : null,
    marginInternal: d ? `${fmtMoney(d.total.margin)} (${Math.round(d.total.marginPct * 100)}%)` : null,
    costLines: c.costLines.map((l) => ({ id: l.id, kind: l.kind, label: l.label, payer: l.payer, hours: l.hours, costRate: l.costRate, chargeRate: l.chargeRate, addToPrice: l.addToPrice, monthly: l.monthly, months: l.months, amount: l.amount, partner: l.partner, sharePct: l.sharePct, shareAmount: l.shareAmount })),
    adjustments: c.adjustments,
    ownValues: Object.fromEntries(Object.entries(c.local).map(([k, v]) => [k, { expected: v.expected, status: v.status, source: v.source }])),
    documentsIndexed: c.docsIndex ?? null,
    checks: `${checks.fail} to fix, ${checks.warn} to check`,
  };
}

function Note({ children, tone = "teal" }: { children: React.ReactNode; tone?: "teal" | "slate" | "amber" }) {
  const cls = tone === "teal" ? "border-teal-200 bg-teal-50/60 text-teal-900" : tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-white text-slate-700";
  return <div className={`my-2 rounded-lg border px-3 py-2 text-xs ${cls}`}>{children}</div>;
}

/** Action results reach render() as the returned string, or already parsed, depending on the CopilotKit path. */
function result<T>(r: unknown): T | null {
  if (r && typeof r === "object") return r as T;
  if (typeof r !== "string") return null;
  try {
    const v = JSON.parse(r);
    return (typeof v === "string" ? result<T>(v) : v) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------

export function RoiAgent() {
  const router = useRouter();
  const pathname = usePathname();
  const store = useRoiStore();
  const goto = (p: string) => {
    if (pathname !== p) router.push(p);
  };

  // CopilotKit 1.53's built-in agent drops the chat's `instructions` (a system
  // message), so the Advisor's role, rules and background ride along as context.
  useCopilotReadable({ description: "Your role, rules, skills index, ecoheart background and how-to guide. Follow these instructions.", value: ROI_AGENT_INSTRUCTIONS });
  useCopilotReadable({ description: "The page of the ROI Advisor the person is looking at", value: pathname });

  useCopilotReadable({
    description: "Use cases (models): ids, names, value lines with their block and assumption keys, client costs and outcomes",
    value: store.models.map((m) => ({
      id: m.id,
      name: m.name,
      superSystem: m.superSystem,
      status: m.status,
      lines: m.lines.map((l) => ({ id: l.id, saving: l.driver, block: l.block, keys: l.keys, overlap: l.overlap })),
      clientCosts: m.clientCosts,
      outcomes: m.outcomes,
    })),
  });

  useCopilotReadable({
    description: "Shared assumption library (library columns: cautious, expected, business case). Clients can have their own values on top.",
    value: store.assumptions.map((a) => ({ key: a.key, label: a.label, useCase: a.model, unit: a.unit, cautious: a.low, expected: a.expected, businessCase: a.high, confidence: a.confidence, source: a.source })),
  });

  useCopilotReadable({ description: "Client profiles with their deal (internal: price, margin, cost lines) and own values", value: store.clients.map(clientSummary) });

  useCopilotReadable({
    description: "Offers we sell (catalog-priced offers use the catalog at the client's size; call listCatalog for items)",
    value: store.offers.map((o) => ({ id: o.id, name: o.name, kind: o.kind, oneTime: o.oneTime, yearly: o.yearly, range: o.range, useCases: o.useCases, length: o.length, items: o.itemIds.length })),
  });

  useCopilotReadable({ description: "Scenarios on the canvas with calculated results (from the calculator, not estimates)", value: store.scenarios.map((s) => summarize(s.id)) });
  useCopilotReadable({ description: "Which scenario is open and which are being compared", value: { activeId: store.activeId, compareIds: store.compareIds, activeClientId: store.activeClientId } });
  useCopilotReadable({
    description: "Values changed since the original starting values (for 'what was it before?' and undo)",
    value: { changed: changesFromOriginal(store).slice(0, 40), marginFloorPct: store.marginFloorPct, bundles: store.bundles.map((b) => ({ id: b.id, name: b.name, state: b.state, clientIds: b.clientIds, offerId: b.offerId })) },
  });

  // --- skills ---------------------------------------------------------------

  useCopilotAction({
    name: "loadSkill",
    description: `Load the know-how for a kind of task before doing it. Skills: ${SKILLS.map((s) => s.id).join(", ")}.`,
    parameters: [{ name: "name", type: "string", description: "Skill id", required: true }],
    handler: async (args) => {
      const s = findSkill(args.name ?? Object.values(args)[0]);
      return s ? `Skill: ${s.title}\n${s.body}` : `No skill called ${args.name}. Skills: ${SKILLS.map((x) => x.id).join(", ")}`;
    },
    render: ({ status, args }) => {
      const s = findSkill(args.name);
      if (!s) return <></>;
      return (
        <div className="my-1 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
          <BookOpen className={`h-3 w-3 ${status === "complete" ? "text-teal-600" : "animate-pulse"}`} /> Using: {s.title}
        </div>
      );
    },
  });

  // --- scenarios ------------------------------------------------------------

  useCopilotAction({
    name: "createScenario",
    description: "Create a new ROI scenario card for a client and calculate it. Use for every new what-if. Returns the calculated numbers to quote.",
    parameters: [
      { name: "name", type: "string", description: "Short card title, e.g. 'Flagstaff, cautious'", required: true },
      { name: "client", type: "string", description: "Client id or name (create it first with createClient if new)", required: true },
      { name: "useCases", type: "string[]", description: "Use-case ids, e.g. ['storm'] or ['storm','grant-finder']", required: true },
      { name: "question", type: "string", description: "The question this scenario answers, in plain words", required: true },
      { name: "basis", type: "string", enum: ["low", "expected", "high"], description: "low (cautious), expected or high (business case)", required: true },
      { name: "overrides", type: "string", description: 'Only the inputs that differ for this what-if, as a JSON object of assumption key to number, e.g. {"credit": 2}. Keys are in the assumption library readable. "fee" overrides what the client pays ecoheart in year one. Percentages as whole numbers. Everything else keeps the basis column.', required: false },
      { name: "notes", type: "string", required: false },
    ],
    handler: async (args) => {
      const a = args as Record<string, unknown>;
      const client = findClient(a.client ?? a.clientId ?? a.city);
      if (!client) return `No client called "${a.client}". Create it with createClient first. Clients: ${useRoiStore.getState().clients.map((c) => `${c.id} (${c.name})`).join(", ")}`;
      let modelIds = findModelIds(a.useCases ?? a.models ?? a.modelIds);
      if (!modelIds.length) modelIds = client.modelIds.length ? client.modelIds : ["storm"];
      const s = useRoiStore.getState().addScenario({
        name: String(a.name ?? `${client.name} scenario`),
        clientId: client.id,
        modelIds,
        question: String(a.question ?? ""),
        basis: asBasis(a.basis),
        overrides: clean(a.overrides, a),
        notes: String(a.notes ?? ""),
        createdBy: "agent",
      });
      goto("/roi");
      return JSON.stringify(summarize(s.id));
    },
    render: ({ status, result: res }) => {
      if (status !== "complete") return <Working text="Setting up the scenario..." />;
      const r = result<{ id: string }>(res);
      const st = useRoiStore.getState();
      const s = st.scenarios.find((x) => x.id === r?.id);
      if (!s) return <></>;
      return (
        <MiniScenario
          name={s.name}
          city={st.clients.find((c) => c.id === s.clientId)?.name}
          useCases={modelsFor(s.modelIds, st).map((m) => m.name).join(" + ")}
          basis={s.basis}
          r={scenarioResult(s, st)}
          onOpen={() => goto("/roi")}
        />
      );
    },
  });

  useCopilotAction({
    name: "updateScenario",
    description: "Change an existing scenario: rename, switch basis, client or use cases, or change overrides. Overrides are merged in; resetKeys go back to the client or library value.",
    parameters: [
      { name: "id", type: "string", description: "Scenario id", required: true },
      { name: "name", type: "string", required: false },
      { name: "basis", type: "string", enum: ["low", "expected", "high"], required: false },
      { name: "client", type: "string", required: false },
      { name: "useCases", type: "string[]", required: false },
      { name: "overrides", type: "string", description: 'JSON object of assumption key to number to merge in, e.g. {"credit": 2}', required: false },
      { name: "resetKeys", type: "string[]", required: false },
      { name: "notes", type: "string", required: false },
    ],
    handler: async (args) => {
      const a = args as Record<string, unknown>;
      const st = useRoiStore.getState();
      const s = st.scenarios.find((x) => x.id === a.id);
      if (!s) return `No scenario with id ${a.id}. Existing ids: ${st.scenarios.map((x) => x.id).join(", ")}`;
      const merged = { ...s.overrides, ...clean(a.overrides, a) };
      for (const k of strList(a.resetKeys)) delete merged[k];
      const client = a.client ? findClient(a.client) : undefined;
      const modelIds = a.useCases ? findModelIds(a.useCases) : [];
      st.updateScenario(s.id, {
        ...(a.name ? { name: String(a.name) } : {}),
        ...(a.basis ? { basis: asBasis(a.basis) } : {}),
        ...(a.notes ? { notes: String(a.notes) } : {}),
        ...(client ? { clientId: client.id } : {}),
        ...(modelIds.length ? { modelIds } : {}),
        overrides: merged,
      });
      st.setActive(s.id);
      goto("/roi");
      return JSON.stringify(summarize(s.id));
    },
    render: ({ status, args }) => {
      if (status !== "complete") return <Working text="Updating the scenario..." />;
      const st = useRoiStore.getState();
      const s = st.scenarios.find((x) => x.id === args.id);
      if (!s) return <></>;
      return <MiniScenario name={s.name} city={st.clients.find((c) => c.id === s.clientId)?.name} useCases={modelsFor(s.modelIds, st).map((m) => m.name).join(" + ")} basis={s.basis} r={scenarioResult(s, st)} onOpen={() => goto("/roi")} />;
    },
  });

  useCopilotAction({
    name: "compareScenarios",
    description: "Show two to four scenarios side by side on the canvas.",
    parameters: [{ name: "ids", type: "string[]", description: "Scenario ids to compare", required: true }],
    handler: async ({ ids }) => {
      const st = useRoiStore.getState();
      const valid = strList(ids).filter((i) => st.scenarios.some((s) => s.id === i));
      st.setCompare(valid);
      goto("/roi");
      return JSON.stringify(valid.map(summarize));
    },
    render: ({ status, args }) => {
      if (status !== "complete") return <Working text="Lining them up..." />;
      const st = useRoiStore.getState();
      const rows = strList(args.ids)
        .map((i) => st.scenarios.find((s) => s.id === i))
        .filter((s): s is Scenario => !!s)
        .map((s) => ({ s, h: headline(scenarioResult(s, st)) }));
      return (
        <div className="my-2 overflow-hidden rounded-xl border border-slate-200 bg-white text-xs shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium">Scenario</th>
                <th className="px-2 py-1.5 text-right font-medium">Net</th>
                <th className="px-2 py-1.5 text-right font-medium">Per $1</th>
                <th className="px-2 py-1.5 text-right font-medium">Payback</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, h }) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className={`px-2 py-1.5 ${ink}`}>{s.name}</td>
                  <td className={`px-2 py-1.5 text-right font-medium ${ink}`}>{h.net}</td>
                  <td className="px-2 py-1.5 text-right">{h.perDollar}</td>
                  <td className="px-2 py-1.5 text-right">{h.payback}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    },
  });

  // --- clients --------------------------------------------------------------

  useCopilotAction({
    name: "createClient",
    description: "Create a client profile: a city, county, state agency, tribal nation or organization, nonprofit, utility or company. Load the client-profile skill first.",
    parameters: [
      { name: "name", type: "string", description: "e.g. 'Olympia, WA' or 'Squaxin Island Tribe'", required: true },
      { name: "type", type: "string", enum: [...CLIENT_TYPES], required: true },
      { name: "state", type: "string", description: "US state, or country / region", required: true },
      { name: "population", type: "number", description: "People served, if known", required: false },
      { name: "size", type: "string", enum: SIZES, description: "Set directly when population doesn't fit (non-city clients)", required: false },
      { name: "region", type: "string", enum: ["US", "EU"], required: false },
      { name: "useCases", type: "string[]", description: "Use-case ids", required: false },
      { name: "offer", type: "string", description: "Offer id (default early-partner)", required: false },
      { name: "notes", type: "string", required: false },
    ],
    handler: async (args) => {
      const a = args as Record<string, unknown>;
      const st = useRoiStore.getState();
      const name = String(a.name ?? "New client");
      const existing = findClient(name);
      if (existing && key(existing.name) === key(name)) return `A client called ${existing.name} already exists (id ${existing.id}). Use updateClient.`;
      const id = key(name).slice(0, 24) || newId();
      const offerId = st.offers.find((o) => o.id === a.offer || key(o.name).includes(key(a.offer)))?.id ?? "early-partner";
      const type = (CLIENT_TYPES as readonly string[]).includes(String(a.type)) ? (a.type as ClientType) : "other";
      const size = SIZES.find((z) => key(z) === key(a.size));
      const c: Client = {
        id,
        name,
        type,
        state: String(a.state ?? ""),
        region: a.region === "EU" ? "EU" : "US",
        population: num(a.population),
        sizeOverride: size,
        modelIds: findModelIds(a.useCases).length ? findModelIds(a.useCases) : ["storm"],
        offerId,
        contract: { years: 1, escalatorPct: 3, payments: "annual" },
        costLines: templateFor(st.offers, offerId),
        adjustments: [],
        local: {},
        notes: String(a.notes ?? ""),
      };
      st.addClient(c);
      st.setActiveClient(id);
      goto("/roi/clients");
      return JSON.stringify({ created: clientSummary(c), checks: validateClient(c, useRoiStore.getState()).filter((x) => x.level !== "pass") });
    },
    render: ({ status, result: res }) => {
      if (status !== "complete") return <Working text="Setting up the client..." />;
      const r = result<{ created?: { name: string; type: string; size: Size; offer: string; yearOnePrice: string } }>(res);
      if (!r?.created) return <></>;
      return (
        <Note>
          New client <b>{r.created.name}</b> ({r.created.type}, {r.created.size}) on {r.created.offer}, {r.created.yearOnePrice} in year one.{" "}
          <Link href="/roi/clients" className="underline">Open it</Link>
        </Note>
      );
    },
  });

  useCopilotAction({
    name: "updateClient",
    description: "Change a client profile: name, type, state, region, population, size, use cases, offer, ongoing offer (from year 2), contract years, escalator %, payments, notes, or resetCosts to reload the offer's team and running costs.",
    parameters: [
      { name: "client", type: "string", required: true },
      { name: "field", type: "string", enum: ["name", "type", "state", "region", "population", "size", "useCases", "offer", "ongoing", "years", "escalatorPct", "payments", "notes", "resetCosts"], required: true },
      { name: "value", type: "string", description: "New value (use-case ids comma separated; offer id; 'none' to clear ongoing)", required: true },
    ],
    handler: async ({ client: ref, field, value }) => {
      const st = useRoiStore.getState();
      const c = findClient(ref);
      if (!c) return `No client called ${ref}`;
      const before = clientSummary(c);
      const offerId = (v: string) => st.offers.find((o) => o.id === v || key(o.name).includes(key(v)))?.id;
      switch (field) {
        case "name":
        case "state":
        case "notes":
          st.updateClient(c.id, { [field]: value });
          break;
        case "type":
          st.updateClient(c.id, { type: ((CLIENT_TYPES as readonly string[]).includes(value) ? value : "other") as ClientType });
          break;
        case "region":
          st.updateClient(c.id, { region: value === "EU" ? "EU" : "US" });
          break;
        case "population":
          st.updateClient(c.id, { population: num(value) });
          break;
        case "size":
          st.updateClient(c.id, { sizeOverride: SIZES.find((z) => key(z) === key(value)) });
          break;
        case "useCases":
          st.updateClient(c.id, { modelIds: findModelIds(value) });
          break;
        case "offer": {
          const id = offerId(value);
          if (!id) return `No offer ${value}. Offers: ${st.offers.map((o) => o.id).join(", ")}`;
          st.updateClient(c.id, { offerId: id });
          st.applyOfferTemplate(c.id);
          break;
        }
        case "ongoing":
          st.updateClient(c.id, { ongoingId: key(value) === "none" ? undefined : offerId(value) });
          break;
        case "years":
        case "escalatorPct":
          st.updateClient(c.id, { contract: { ...c.contract, [field]: num(value) ?? 0 } });
          break;
        case "payments":
          st.updateClient(c.id, { contract: { ...c.contract, payments: (["annual", "quarterly", "monthly"].includes(value) ? value : "annual") as Client["contract"]["payments"] } });
          break;
        case "resetCosts":
          st.applyOfferTemplate(c.id);
          break;
        default:
          return `Unknown field ${field}`;
      }
      const after = findClient(c.id)!;
      return JSON.stringify({ client: after.name, field, before: { yearOnePrice: before.yearOnePrice, margin: before.marginInternal }, after: clientSummary(after) });
    },
    render: ({ status, args, result: res }) => {
      if (status !== "complete") return <Working text="Updating the client..." />;
      const r = result<{ client?: string; after?: { yearOnePrice: string } }>(res);
      if (!r?.client) return <></>;
      return (
        <Note>
          {r.client}: <b>{String(args.field)}</b> updated. Year-one price {r.after?.yearOnePrice}. <Link href="/roi/clients" className="underline">See the client</Link>
        </Note>
      );
    },
  });

  useCopilotAction({
    name: "fillAssumption",
    description:
      "Record a client's own value for an assumption, with its source. Saved as proposed (to confirm by a person). Give one value for all three columns, or cautious / expected / businessCase separately.",
    parameters: [
      { name: "client", type: "string", required: true },
      { name: "key", type: "string", description: "Assumption key", required: true },
      { name: "value", type: "number", description: "Same value for cautious, expected and business case", required: false },
      { name: "cautious", type: "number", required: false },
      { name: "expected", type: "number", required: false },
      { name: "businessCase", type: "number", required: false },
      { name: "source", type: "string", description: "Document and page, dataset, or person", required: true },
      { name: "confidence", type: "string", enum: ["low", "medium", "high"], required: true },
      { name: "owner", type: "string", description: "Who confirms it", required: false },
    ],
    handler: async (args) => {
      const a = args as Record<string, unknown>;
      const st = useRoiStore.getState();
      const c = findClient(a.client);
      if (!c) return `No client called ${a.client}`;
      const lib = st.assumptions.find((x) => x.key === a.key || key(x.label) === key(a.key));
      if (!lib) return `Unknown key ${a.key}. Keys: ${st.assumptions.map((x) => x.key).join(", ")}`;
      const one = num(a.value);
      const prev = resolveKey(lib.key, "expected", c.id, st);
      const lv = {
        low: num(a.cautious) ?? one ?? lib.low,
        expected: num(a.expected) ?? one ?? lib.expected,
        high: num(a.businessCase) ?? one ?? lib.high,
        source: String(a.source ?? ""),
        confidence: asConfidence(a.confidence),
        owner: String(a.owner ?? lib.owner),
        status: "proposed" as const,
        by: "advisor" as const,
        at: Date.now(),
      };
      st.setLocal(c.id, lib.key, lv);
      return JSON.stringify({ client: c.name, key: lib.key, label: lib.label, from: prev.value, fromWhere: prev.from, to: lv.expected, libraryOriginal: DEFAULT_ASSUMPTIONS.find((d) => d.key === lib.key)?.expected ?? null, status: "proposed: a person confirms it on the Clients tab" });
    },
    render: ({ status, result: res }) => {
      if (status !== "complete") return <Working text="Recording the value..." />;
      const r = result<{ client?: string; label?: string; to?: number; from?: number }>(res);
      if (!r?.client) return <></>;
      return (
        <Note tone="amber">
          Proposed for <b>{r.client}</b>: {r.label} = <b>{r.to?.toLocaleString()}</b> (was {r.from?.toLocaleString()}). A person confirms it on the{" "}
          <Link href="/roi/clients" className="underline">Clients tab</Link>.
        </Note>
      );
    },
  });

  useCopilotAction({
    name: "listGaps",
    description: "List the values a client still needs (placeholders, proposed or low confidence), most important first.",
    parameters: [
      { name: "client", type: "string", required: true },
      { name: "useCases", type: "string[]", required: false },
    ],
    handler: async (args) => {
      const a = args as Record<string, unknown>;
      const c = findClient(a.client);
      if (!c) return `No client called ${a.client}`;
      const ids = findModelIds(a.useCases);
      const g = gaps(c.id, useRoiStore.getState(), ids.length ? ids : undefined);
      return JSON.stringify({ client: c.name, documentsIndexed: c.docsIndex ?? null, gaps: g.map((x) => ({ ...x, impactOnNet: fmtMoney(x.impact) })) });
    },
    render: ({ status, result: res }) => {
      if (status !== "complete") return <Working text="Finding what's missing..." />;
      const r = result<{ client: string; gaps: { key: string; label: string; status: string; impactOnNet: string }[] }>(res);
      if (!r?.gaps) return <></>;
      return (
        <div className="my-2 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm">
          <div className={`mb-1.5 font-semibold ${ink}`}>Still to fill in for {r.client}</div>
          <ol className="space-y-1">
            {r.gaps.slice(0, 6).map((g) => (
              <li key={g.key} className="flex justify-between gap-2">
                <span className="text-slate-700">{g.label} <span className="text-slate-400">({g.status})</span></span>
                <span className="flex-none text-slate-500">moves net {g.impactOnNet}</span>
              </li>
            ))}
          </ol>
        </div>
      );
    },
  });

  useCopilotAction({
    name: "searchCityDocs",
    description: "Search a client's indexed documents (Olympia today) for a number, and get quotes with document and page.",
    parameters: [
      { name: "client", type: "string", required: true },
      { name: "question", type: "string", description: "Specific question, e.g. 'storm response overtime in the 2024 budget'", required: true },
    ],
    handler: async (args) => {
      const a = args as Record<string, unknown>;
      const c = findClient(a.client);
      const index = c?.docsIndex ?? (key(a.client).includes("olympia") ? "olympia" : undefined);
      if (!index) return `No document index for ${c?.name ?? a.client} yet. Only Olympia is indexed. Use lookupPublicData, or ask the client.`;
      const res = await fetch("/api/roi/city-docs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ index, question: a.question }) });
      const j = await res.json();
      if (!res.ok) return `Search failed: ${j.error}`;
      return JSON.stringify(j);
    },
    render: ({ status, args, result: res }) => {
      if (status !== "complete") return <Working text={`Searching ${String(args.client ?? "the client")}'s documents...`} />;
      const r = result<{ quotes?: { document: string; page: number | null }[] }>(res);
      return (
        <Note tone="slate">
          <span className="flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-teal-600" /> Searched for “{String(args.question)}”
            {r?.quotes ? `: ${r.quotes.length} passages` : ""}
          </span>
          {r?.quotes?.slice(0, 3).map((q, i) => (
            <div key={i} className="mt-0.5 truncate text-slate-500">
              {q.document}
              {q.page ? `, p. ${q.page}` : ""}
            </div>
          ))}
        </Note>
      );
    },
  });

  useCopilotAction({
    name: "lookupPublicData",
    description: "Population and size band for a US city or town (2025 estimates).",
    parameters: [
      { name: "name", type: "string", description: "Place name, e.g. 'Olympia'", required: true },
      { name: "state", type: "string", description: "State name or abbreviation", required: false },
    ],
    handler: async ({ name, state }) => {
      const res = await fetch(`/api/roi/lookup?name=${encodeURIComponent(name)}&state=${encodeURIComponent(state ?? "")}`);
      return JSON.stringify(await res.json());
    },
    render: ({ status, args, result: res }) => {
      if (status !== "complete") return <Working text="Looking it up..." />;
      const r = result<{ matches?: { name: string; state: string; population: number; size: string }[] }>(res);
      const m = r?.matches?.[0];
      return <Note tone="slate">{m ? <>{m.name}, {m.state}: population {m.population.toLocaleString()} ({m.size})</> : <>No match for {String(args.name)}</>}</Note>;
    },
  });

  // --- use cases ------------------------------------------------------------

  useCopilotAction({
    name: "createUseCase",
    description: "Start a new use case (draft). Then add its savings with addValueLine. Load the value-modeling skill first.",
    parameters: [
      { name: "name", type: "string", required: true },
      { name: "superSystem", type: "string", enum: [...SUPER_SYSTEMS], required: true },
      { name: "description", type: "string", description: "One plain sentence", required: true },
    ],
    handler: async ({ name, superSystem, description }) => {
      const st = useRoiStore.getState();
      const id = key(name).slice(0, 24) || newId();
      if (st.models.some((m) => m.id === id)) return `A use case with id ${id} already exists.`;
      st.addModel({ id, name, superSystem: (SUPER_SYSTEMS as readonly string[]).includes(superSystem) ? (superSystem as never) : "Infrastructure", description, lines: [], clientCosts: [], outcomes: [], status: "draft", createdBy: "advisor" });
      return JSON.stringify({ created: id, next: "Add savings with addValueLine (modelId = this id)." });
    },
    render: ({ status, args }) =>
      status !== "complete" ? <Working text="Starting the use case..." /> : <Note>New draft use case <b>{String(args.name)}</b>. <Link href="/roi/model" className="underline">See use cases</Link></Note>,
  });

  useCopilotAction({
    name: "addValueLine",
    description:
      "Add one saving to a use case. Block: costAvoided (base $ x share %), eventsAvoided (count x unitCost $ x share %), timeSaved (hours x rate $), newMoney (amount $ x share %). For each input give an existing assumption key, or define a new one with label, unit, cautious, expected, businessCase, source, confidence, owner.",
    parameters: [
      { name: "useCase", type: "string", description: "Use-case id", required: true },
      { name: "label", type: "string", description: "Name of the cost or money stream, e.g. 'Heat-related EMS calls'", required: true },
      { name: "driver", type: "string", description: "Name of the saving, e.g. 'Fewer heat EMS calls'", required: true },
      { name: "block", type: "string", enum: ["costAvoided", "eventsAvoided", "timeSaved", "newMoney"], required: true },
      {
        name: "inputs",
        type: "object[]",
        description: "One per block input, in order: costAvoided [base, share]; eventsAvoided [count, unitCost, share]; timeSaved [hours, rate]; newMoney [amount, share]. Use {role, key} to reuse an assumption (rate usually 'hourly').",
        required: true,
        attributes: [
          { name: "role", type: "string", description: "base, share, count, unitCost, hours, rate or amount", required: true },
          { name: "key", type: "string", description: "Existing key, or a new key like 'heat.calls'", required: true },
          { name: "label", type: "string", required: false },
          { name: "unit", type: "string", description: "$, %, hours or count", required: false },
          { name: "cautious", type: "number", required: false },
          { name: "expected", type: "number", required: false },
          { name: "businessCase", type: "number", required: false },
          { name: "source", type: "string", required: false },
          { name: "confidence", type: "string", required: false },
          { name: "owner", type: "string", required: false },
        ],
      },
      { name: "overlap", type: "string", description: "Tag shared with a line in another use case that counts the same saving", required: false },
    ],
    handler: async (args) => {
      const a = args as Record<string, unknown>;
      const st = useRoiStore.getState();
      const m = st.models.find((x) => x.id === a.useCase || key(x.name) === key(a.useCase));
      if (!m) return `No use case ${a.useCase}. Create it with createUseCase.`;
      const block = (["costAvoided", "eventsAvoided", "timeSaved", "newMoney"] as Block[]).find((b) => key(b) === key(a.block));
      if (!block) return "block must be costAvoided, eventsAvoided, timeSaved or newMoney";
      const raw = parse(a.inputs);
      const inputs = (Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.entries(raw).map(([role, v]) => ({ role, ...(typeof v === "object" ? v : { key: v }) })) : []) as Record<string, unknown>[];
      const keys: ValueLine["keys"] = {};
      const added: string[] = [];
      BLOCK_KEYS[block].forEach((role, i) => {
        const inp = inputs.find((x) => key(x.role) === key(role)) ?? inputs[i];
        if (!inp) return;
        const k = String(inp.key ?? `${m.id}.${role}`);
        const exists = useRoiStore.getState().assumptions.find((x) => x.key === k);
        if (!exists) {
          const unit: Unit = inp.unit ? asUnit(inp.unit) : role === "share" ? "%" : role === "hours" ? "hours" : role === "count" ? "count" : "$";
          const exp = num(inp.expected) ?? 0;
          const asm: Assumption = {
            key: k,
            label: String(inp.label ?? `${a.label} ${role}`),
            model: m.id,
            group: m.name,
            unit,
            low: num(inp.cautious) ?? exp,
            expected: exp,
            high: num(inp.businessCase) ?? exp,
            source: String(inp.source ?? "ecoheart estimate"),
            confidence: asConfidence(inp.confidence),
            owner: String(inp.owner ?? "ecoheart analyst"),
            createdBy: "advisor",
          };
          useRoiStore.getState().addAssumption(asm);
          added.push(k);
        }
        keys[role] = k;
      });
      const line: ValueLine = { id: `${m.id}-${key(a.label).slice(0, 16) || newId()}`, label: String(a.label), driver: String(a.driver ?? a.label), block, keys, overlap: a.overlap ? String(a.overlap) : undefined };
      useRoiStore.getState().addValueLine(m.id, line);
      const checks = checkModel(useRoiStore.getState().models.find((x) => x.id === m.id)!, useRoiStore.getState());
      return JSON.stringify({ useCase: m.name, line: line.driver, keys, newAssumptions: added, checks });
    },
    render: ({ status, result: res }) => {
      if (status !== "complete") return <Working text="Adding the saving..." />;
      const r = result<{ useCase?: string; line?: string; checks?: Check[] }>(res);
      if (!r?.useCase) return <></>;
      return (
        <Note>
          Added <b>{r.line}</b> to {r.useCase}. {r.checks && <ChecksBadge checks={r.checks} />} <Link href="/roi/model" className="underline">See use cases</Link>
        </Note>
      );
    },
  });

  useCopilotAction({
    name: "updateAssumption",
    description: "Change the shared library (affects every client still using the library value). Field: low (cautious), expected, high (business case), source, confidence, owner, label.",
    parameters: [
      { name: "key", type: "string", required: true },
      { name: "field", type: "string", enum: ["low", "expected", "high", "source", "confidence", "owner", "label"], required: true },
      { name: "value", type: "string", required: true },
    ],
    handler: async ({ key: k, field, value }) => {
      const st = useRoiStore.getState();
      const a = st.assumptions.find((x) => x.key === k);
      if (!a) return `Unknown key ${k}`;
      const fs = String(field);
      const f = fs === "cautious" ? "low" : fs === "businessCase" ? "high" : fs;
      const numeric = f === "low" || f === "expected" || f === "high";
      const v = numeric ? num(value) : f === "confidence" ? asConfidence(value) : value;
      if (numeric && v === undefined) return "Value must be a number";
      const before = a[f as keyof Assumption];
      st.setAssumption(k, f as "low", v as number);
      const original = DEFAULT_ASSUMPTIONS.find((x) => x.key === k)?.[f as keyof Assumption];
      return JSON.stringify({ changed: a.label, field: f, from: before, to: v, original });
    },
    render: ({ status, args }) => {
      if (status !== "complete") return <Working text="Updating the library..." />;
      const a = useRoiStore.getState().assumptions.find((x) => x.key === args.key);
      const field = args.field === "low" ? "cautious" : args.field === "high" ? "business case" : args.field;
      return (
        <Note>
          Library updated: <b>{a?.label}</b> ({field}) is now <b>{String(args.value)}</b>. <Link href="/roi/model" className="underline">See use cases</Link>
        </Note>
      );
    },
  });

  // --- costs, pricing -------------------------------------------------------

  useCopilotAction({
    name: "addCostLine",
    description:
      "Add a cost line to a client: people (ecoheart team or SME: hours, costRate, optional chargeRate + addToPrice), service (amount one-time, or monthly x months, ongoing), or share (a partner or grant covering sharePct or shareAmount of our price). Payer: client, ecoheart, partner, grant.",
    parameters: [
      { name: "client", type: "string", required: true },
      { name: "kind", type: "string", enum: ["people", "service", "share"], required: true },
      { name: "label", type: "string", required: true },
      { name: "payer", type: "string", enum: ["client", "ecoheart", "partner", "grant"], required: true },
      { name: "personType", type: "string", enum: ["team", "sme"], required: false },
      { name: "hours", type: "number", required: false },
      { name: "costRate", type: "number", required: false },
      { name: "chargeRate", type: "number", required: false },
      { name: "addToPrice", type: "boolean", required: false },
      { name: "amount", type: "number", required: false },
      { name: "monthly", type: "number", required: false },
      { name: "months", type: "number", required: false },
      { name: "ongoing", type: "boolean", required: false },
      { name: "partner", type: "string", description: "Who pays, for partner or grant lines", required: false },
      { name: "sharePct", type: "number", required: false },
      { name: "shareAmount", type: "number", required: false },
      { name: "everyYear", type: "boolean", required: false },
      { name: "note", type: "string", required: false },
    ],
    handler: async (args) => {
      const a = args as Record<string, unknown>;
      const st = useRoiStore.getState();
      const c = findClient(a.client);
      if (!c) return `No client called ${a.client}`;
      const before = clientDeal(c.id, st)!;
      const kind = (["people", "service", "share"].includes(String(a.kind)) ? a.kind : "people") as CostLine["kind"];
      const bool = (v: unknown) => v === true || v === "true";
      const line: CostLine = {
        id: newId(),
        kind,
        label: String(a.label ?? "New line"),
        payer: kind === "share" ? (asPayer(a.payer) === "grant" ? "grant" : "partner") : asPayer(a.payer),
        personType: kind === "people" ? (key(a.personType) === "sme" ? "sme" : "team") : undefined,
        hours: num(a.hours),
        costRate: num(a.costRate),
        chargeRate: num(a.chargeRate),
        addToPrice: bool(a.addToPrice),
        amount: num(a.amount),
        monthly: num(a.monthly),
        months: num(a.months),
        ongoing: bool(a.ongoing),
        partner: a.partner ? String(a.partner) : undefined,
        sharePct: num(a.sharePct),
        shareAmount: num(a.shareAmount),
        everyYear: bool(a.everyYear),
        note: a.note ? String(a.note) : undefined,
      };
      st.addCostLine(c.id, line);
      const after = clientDeal(c.id, useRoiStore.getState())!;
      return JSON.stringify({
        client: c.name,
        added: line.label,
        clientPaysYearOne: { from: fmtMoney(before.years[0].clientPaysEcoheart), to: fmtMoney(after.years[0].clientPaysEcoheart) },
        priceYearOne: { from: fmtMoney(before.years[0].price), to: fmtMoney(after.years[0].price) },
        marginInternal: { from: `${Math.round(before.total.marginPct * 100)}%`, to: `${Math.round(after.total.marginPct * 100)}%`, dollars: fmtMoney(after.total.margin) },
        whoPaysYearOne: after.whoPaysYear1.map((w) => `${w.label}: ${fmtMoney(w.amount)}`),
      });
    },
    render: ({ status, args, result: res }) => {
      if (status !== "complete") return <Working text="Adding the cost line..." />;
      const r = result<{ client?: string; added?: string; marginInternal?: { to: string } }>(res);
      if (!r?.client) return <></>;
      const c = findClient(args.client);
      const d = c ? clientDeal(c.id, useRoiStore.getState()) : null;
      return (
        <div className="my-2 rounded-xl border border-teal-200 bg-white p-3 text-xs shadow-sm">
          <div className="mb-2 text-teal-900">
            Added <b>{r.added}</b> to {r.client}. Margin now <b>{r.marginInternal?.to}</b> (internal).
          </div>
          {d && <WhoPaysBar items={d.whoPaysYear1} />}
        </div>
      );
    },
  });

  useCopilotAction({
    name: "updateCostLine",
    description: "Change one field of a client's cost line (match by id or label), or remove it with field 'remove'.",
    parameters: [
      { name: "client", type: "string", required: true },
      { name: "line", type: "string", description: "Cost line id or label", required: true },
      { name: "field", type: "string", description: "label, payer, hours, costRate, chargeRate, addToPrice, amount, monthly, months, ongoing, partner, sharePct, shareAmount, everyYear, or remove", required: true },
      { name: "value", type: "string", required: false },
    ],
    handler: async ({ client: ref, line: lref, field, value }) => {
      const st = useRoiStore.getState();
      const c = findClient(ref);
      if (!c) return `No client called ${ref}`;
      const l = c.costLines.find((x) => x.id === lref) ?? c.costLines.find((x) => key(x.label).includes(key(lref)));
      if (!l) return `No cost line ${lref}. Lines: ${c.costLines.map((x) => x.label).join("; ")}`;
      const before = clientDeal(c.id, st)!;
      if (field === "remove") st.removeCostLine(c.id, l.id);
      else {
        const v = ["label", "partner", "note"].includes(field) ? value : field === "payer" ? asPayer(value) : ["addToPrice", "ongoing", "everyYear"].includes(field) ? value === "true" : num(value);
        st.updateCostLine(c.id, l.id, { [field]: v } as Partial<CostLine>);
      }
      const after = clientDeal(c.id, useRoiStore.getState())!;
      return JSON.stringify({ client: c.name, line: l.label, field, from: (l as unknown as Record<string, unknown>)[field], to: value, marginInternal: `${Math.round(before.total.marginPct * 100)}% → ${Math.round(after.total.marginPct * 100)}%`, clientPaysYearOne: fmtMoney(after.years[0].clientPaysEcoheart) });
    },
    render: ({ status, result: res }) => {
      if (status !== "complete") return <Working text="Updating the cost line..." />;
      const r = result<{ client?: string; line?: string; field?: string; marginInternal?: string }>(res);
      if (!r?.client) return <></>;
      return <Note>{r.client}: <b>{r.line}</b> {r.field === "remove" ? "removed" : `${r.field} updated`}. Margin {r.marginInternal}.</Note>;
    },
  });

  useCopilotAction({
    name: "addAdjustment",
    description: "Add a price adjustment to a client: a % or fixed $ off, for year one or every year, with a reason (founding-partner discount, nonprofit or tribal rate, grandfathered rate).",
    parameters: [
      { name: "client", type: "string", required: true },
      { name: "label", type: "string", required: true },
      { name: "kind", type: "string", enum: ["pct", "fixed"], required: true },
      { name: "value", type: "number", required: true },
      { name: "reason", type: "string", required: true },
      { name: "appliesTo", type: "string", enum: ["year1", "all"], required: true },
    ],
    handler: async (args) => {
      const a = args as Record<string, unknown>;
      const st = useRoiStore.getState();
      const c = findClient(a.client);
      if (!c) return `No client called ${a.client}`;
      const before = clientDeal(c.id, st)!;
      st.addAdjustment(c.id, { id: newId(), label: String(a.label), kind: a.kind === "fixed" ? "fixed" : "pct", value: num(a.value) ?? 0, reason: String(a.reason ?? ""), appliesTo: a.appliesTo === "all" ? "all" : "year1" });
      const after = clientDeal(c.id, useRoiStore.getState())!;
      return JSON.stringify({ client: c.name, yearOnePrice: { from: fmtMoney(before.years[0].price), to: fmtMoney(after.years[0].price) }, contractTotal: fmtMoney(after.total.price), marginInternal: `${Math.round(after.total.marginPct * 100)}%` });
    },
    render: ({ status, args, result: res }) => {
      if (status !== "complete") return <Working text="Adjusting the price..." />;
      const r = result<{ client?: string; yearOnePrice?: { to: string } }>(res);
      if (!r?.client) return <></>;
      return <Note>{r.client}: <b>{String(args.label)}</b> applied. Year-one price {r.yearOnePrice?.to}.</Note>;
    },
  });

  useCopilotAction({
    name: "listCatalog",
    description: "List Sandrine's catalog items with prices at one client size (one-time or yearly, region).",
    parameters: [{ name: "size", type: "string", enum: SIZES, required: false }],
    handler: async ({ size }) => {
      const z = (SIZES.find((x) => key(x) === key(size)) ?? "Mid-size") as Size;
      return JSON.stringify(
        useRoiStore.getState().catalog.map((c) => ({ id: c.id, category: c.category, name: c.name, unit: c.unit, yearly: c.recurring, region: c.region, qty: c.bySize[z]?.qty, rate: c.bySize[z]?.rate, price: fmtMoney((c.bySize[z]?.qty ?? 0) * (c.bySize[z]?.rate ?? 0)) }))
      );
    },
    render: ({ status }) => (status !== "complete" ? <Working text="Reading the catalog..." /> : <></>),
  });

  useCopilotAction({
    name: "updateCatalogItem",
    description: "Change a catalog item: rate or qty for one size, yearly (true/false), region (US, EU, all), name or description.",
    parameters: [
      { name: "item", type: "string", description: "Item id or name", required: true },
      { name: "field", type: "string", enum: ["rate", "qty", "yearly", "region", "name", "description"], required: true },
      { name: "value", type: "string", required: true },
      { name: "size", type: "string", enum: SIZES, description: "Needed for rate and qty", required: false },
    ],
    handler: async ({ item, field, value, size }) => {
      const st = useRoiStore.getState();
      const it = st.catalog.find((c) => c.id === item) ?? st.catalog.find((c) => key(c.name).includes(key(item)));
      if (!it) return `No catalog item ${item}`;
      if (field === "rate" || field === "qty") {
        const z = SIZES.find((x) => key(x) === key(size));
        const v = num(value);
        if (v === undefined) return "Value must be a number";
        const sizes = z ? [z] : SIZES;
        for (const s of sizes) st.setCatalogSize(it.id, s, { [field]: v });
        return JSON.stringify({ item: it.name, field, sizes, from: z ? it.bySize[z][field] : "all sizes", to: v });
      }
      if (field === "yearly") st.updateCatalogItem(it.id, { recurring: value === "true" });
      else if (field === "region") st.updateCatalogItem(it.id, { region: value === "EU" ? "EU" : value === "US" ? "US" : "all" });
      else st.updateCatalogItem(it.id, { [field]: value });
      return JSON.stringify({ item: it.name, field, to: value });
    },
    render: ({ status, result: res }) => {
      if (status !== "complete") return <Working text="Updating the catalog..." />;
      const r = result<{ item?: string; field?: string; to?: unknown }>(res);
      if (!r?.item) return <></>;
      return <Note>Catalog: <b>{r.item}</b> {r.field} is now <b>{String(r.to)}</b>. <Link href="/roi/pricing" className="underline">See pricing</Link></Note>;
    },
  });

  useCopilotAction({
    name: "updateOffer",
    description: "Change an offer: oneTime price, yearly price, range low/high, use-case min/max, length, notes, or add/remove a catalog item (field addItem / removeItem with an item id).",
    parameters: [
      { name: "offer", type: "string", required: true },
      { name: "field", type: "string", enum: ["oneTime", "yearly", "rangeLow", "rangeHigh", "useCasesMin", "useCasesMax", "length", "notes", "name", "addItem", "removeItem"], required: true },
      { name: "value", type: "string", required: true },
    ],
    handler: async ({ offer, field, value }) => {
      const st = useRoiStore.getState();
      const o = st.offers.find((x) => x.id === offer) ?? st.offers.find((x) => key(x.name).includes(key(offer)));
      if (!o) return `No offer ${offer}`;
      const v = num(value) ?? 0;
      const patch: Partial<typeof o> =
        field === "oneTime" || field === "yearly"
          ? { [field]: v }
          : field === "rangeLow"
            ? { range: [v, o.range?.[1] ?? v] }
            : field === "rangeHigh"
              ? { range: [o.range?.[0] ?? 0, v] }
              : field === "useCasesMin"
                ? { useCases: [v, o.useCases[1]] }
                : field === "useCasesMax"
                  ? { useCases: [o.useCases[0], v] }
                  : field === "addItem"
                    ? { itemIds: [...new Set([...o.itemIds, value])] }
                    : field === "removeItem"
                      ? { itemIds: o.itemIds.filter((i) => i !== value) }
                      : { [field]: value };
      st.updateOffer(o.id, patch);
      return JSON.stringify({ offer: o.name, field, to: value });
    },
    render: ({ status, result: res }) => {
      if (status !== "complete") return <Working text="Updating the offer..." />;
      const r = result<{ offer?: string; field?: string; to?: string }>(res);
      if (!r?.offer) return <></>;
      return <Note>Offer <b>{r.offer}</b>: {r.field} → <b>{r.to}</b>. <Link href="/roi/pricing" className="underline">See pricing</Link></Note>;
    },
  });

  useCopilotAction({
    name: "createBundle",
    description: "Price a state or regional bundle: every city in a US state (counted by size), or a list of client ids, on one offer, with volume discounts.",
    parameters: [
      { name: "name", type: "string", required: true },
      { name: "state", type: "string", description: "US state name for statewide", required: false },
      { name: "clients", type: "string[]", description: "Client ids for a hand-picked group", required: false },
      { name: "offer", type: "string", required: true },
      { name: "years", type: "number", required: false },
      { name: "escalatorPct", type: "number", required: false },
    ],
    handler: async (args) => {
      const a = args as Record<string, unknown>;
      const st = useRoiStore.getState();
      const offerId = st.offers.find((o) => o.id === a.offer || key(o.name).includes(key(a.offer)))?.id ?? "supported-pilot";
      const clientIds = strList(a.clients).map((x) => findClient(x)?.id).filter(Boolean) as string[];
      const b = { id: newId(), name: String(a.name), state: a.state ? String(a.state) : undefined, clientIds, offerId, years: num(a.years) ?? 3, escalatorPct: num(a.escalatorPct) ?? 1.5 };
      st.addBundle(b);
      const s = bundleSummary(b, st.clients, st.offers, st.catalog, st.discounts, st.sizeBands);
      goto("/roi/pricing");
      return JSON.stringify({ bundle: b.name, cities: s.cities, counts: s.counts, yearOne: fmtMoney(s.years[0].total), contractTotal: fmtMoney(s.total), arr: fmtMoney(s.arr), mrr: fmtMoney(s.mrr), quarterlyYearOne: fmtMoney(s.quarterly), note: "A statewide count of every city is a planning ceiling, not a likely deal." });
    },
    render: ({ status, result: res }) => {
      if (status !== "complete") return <Working text="Pricing the bundle..." />;
      const r = result<{ bundle?: string; cities?: number; yearOne?: string; arr?: string }>(res);
      if (!r?.bundle) return <></>;
      return <Note><b>{r.bundle}</b>: {r.cities} places, {r.yearOne} in year one, {r.arr} a year recurring. <Link href="/roi/pricing" className="underline">See bundles</Link></Note>;
    },
  });

  // --- validate -------------------------------------------------------------

  useCopilotAction({
    name: "validate",
    description: "Run the fixed checks on a scenario (id), a client (id or name), or a use case (id). Returns pass / warn / fail with fixes.",
    parameters: [{ name: "target", type: "string", description: "Scenario id, client id or name, or use-case id", required: true }],
    handler: async ({ target }) => {
      const st = useRoiStore.getState();
      const s = st.scenarios.find((x) => x.id === target);
      const c = !s ? findClient(target) : undefined;
      const m = !s && !c ? st.models.find((x) => x.id === target || key(x.name) === key(target)) : undefined;
      const checks = s ? validateScenario(s, st) : c ? validateClient(c, st) : m ? checkModel(m, st) : null;
      if (!checks) return `Nothing called ${target}. Give a scenario id, client or use case.`;
      return JSON.stringify({ target: s?.name ?? c?.name ?? m?.name, summary: summarizeChecks(checks), checks });
    },
    render: ({ status, result: res }) => {
      if (status !== "complete") return <Working text="Running the checks..." />;
      const r = result<{ target?: string; checks?: Check[] }>(res);
      if (!r?.checks) return <></>;
      return (
        <div className="my-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className={`text-sm font-semibold ${ink}`}>Checks: {r.target}</div>
            <ChecksBadge checks={r.checks} />
          </div>
          <ChecksList checks={r.checks} compact showPass={false} />
        </div>
      );
    },
  });

  useCopilotAction({
    name: "sensitivity",
    description: "For a scenario, the three inputs that move net value most, with net at cautious and business-case values and the break-even point.",
    parameters: [{ name: "scenarioId", type: "string", required: true }],
    handler: async ({ scenarioId }) => {
      const st = useRoiStore.getState();
      const s = st.scenarios.find((x) => x.id === scenarioId) ?? st.scenarios.find((x) => x.id === st.activeId);
      if (!s) return "No scenario";
      return JSON.stringify({ scenario: s.name, top: sensitivity(s, st).map((r) => ({ ...r, netAtLow: fmtMoney(r.netAtLow), netAtHigh: fmtMoney(r.netAtHigh), swing: fmtMoney(r.swing) })) });
    },
    render: ({ status, result: res }) => {
      if (status !== "complete") return <Working text="Testing the numbers..." />;
      const r = result<{ scenario?: string; top?: { key: string; label: string; unit: string; now: number; breakEven: number | null; netAtLow: string; netAtHigh: string }[] }>(res);
      if (!r?.top) return <></>;
      return (
        <div className="my-2 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm">
          <div className={`mb-1.5 font-semibold ${ink}`}>What matters most: {r.scenario}</div>
          {r.top.map((t) => (
            <div key={t.key} className="border-t border-slate-100 py-1 first:border-0">
              <div className={ink}>{t.label}</div>
              <div className="text-slate-500">
                Net {t.netAtLow} to {t.netAtHigh}
                {t.breakEven !== null ? ` · breaks even at ${t.unit === "$" ? fmtMoney(t.breakEven) : `${Math.round(t.breakEven * 10) / 10}${t.unit === "%" ? "%" : ` ${t.unit}`}`}` : ""}
              </div>
            </div>
          ))}
        </div>
      );
    },
  });

  // --- reports, links, guide, undo -----------------------------------------

  useCopilotAction({
    name: "createReport",
    description: "Prepare the printable ROI report for one scenario and open it. Run validate first.",
    parameters: [
      { name: "scenarioId", type: "string", required: true },
      { name: "audience", type: "string", description: "Who will read it, e.g. 'Flagstaff city manager'", required: true },
      { name: "summary", type: "string", description: "Three to five plain sentences for that reader: the answer, why, and what is still uncertain", required: true },
      { name: "nextSteps", type: "string[]", description: "Three short next steps", required: true },
    ],
    handler: async ({ scenarioId, audience, summary, nextSteps }) => {
      const st = useRoiStore.getState();
      if (!st.scenarios.some((s) => s.id === scenarioId)) return `No scenario with id ${scenarioId}`;
      st.setReport({ scenarioId, audience, summary, nextSteps: strList(nextSteps), createdAt: Date.now() });
      st.setActive(scenarioId);
      router.push("/roi/report");
      return "Report opened. The person can print it or save it as PDF.";
    },
    render: ({ status, args }) => {
      if (status !== "complete") return <Working text="Writing the report..." />;
      const s = useRoiStore.getState().scenarios.find((x) => x.id === args.scenarioId);
      return (
        <Link href="/roi/report" className="my-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-teal-400">
          <FileText className="h-5 w-5 flex-none text-teal-600" />
          <div className="min-w-0">
            <div className={`text-sm font-semibold ${ink}`}>ROI report ready</div>
            <div className="truncate text-xs text-slate-500">
              {s?.name} for {args.audience}
            </div>
          </div>
        </Link>
      );
    },
  });

  useCopilotAction({
    name: "shareLinks",
    description: "Show link cards for ecoheart resources: website, services, story and team, contact, the explainer video, the proposal, the tabs of this site. Use whenever someone asks where to find something.",
    parameters: [
      { name: "ids", type: "string[]", description: `Resource ids: ${RESOURCES.map((r) => r.id).join(", ")}`, required: true },
      { name: "note", type: "string", description: "Optional one-line lead-in", required: false },
    ],
    handler: async (args) => {
      const found = pickResources(args as Record<string, unknown>);
      if (!found.length) return `No matching links. Use ids from: ${RESOURCES.map((r) => r.id).join(", ")}`;
      return JSON.stringify(found.map((r) => ({ id: r.id, title: r.title, link: r.href, comingSoon: r.ready === false })));
    },
    render: ({ status, args }) => {
      if (status === "inProgress") return <Working text="Finding the links..." />;
      return <LinkCards items={pickResources(args as Record<string, unknown>)} note={args.note} />;
    },
  });

  useCopilotAction({
    name: "exportData",
    description:
      "Download a use case (its value lines and assumptions, optionally with one client's values), a client's cost model (deal by year, cost lines, who pays; internal), or a scenario (summary, value, inputs) as CSV or Excel. Also shows download buttons in the chat.",
    parameters: [
      { name: "what", type: "string", enum: ["useCase", "client", "scenario"], required: true },
      { name: "id", type: "string", description: "Use-case id or name, client id or name, or scenario id", required: true },
      { name: "client", type: "string", description: "For a use case: also show this client's values", required: false },
      { name: "format", type: "string", enum: ["csv", "xlsx"], required: false },
    ],
    handler: async ({ what, id, client: ref, format }) => {
      const wb = exportWorkbook(String(what), id, ref);
      if (!wb) return `Nothing found to export for ${what} ${id}`;
      const file = await download(wb, String(format) === "csv" ? "csv" : "xlsx");
      return JSON.stringify({ downloaded: file, sheets: wb.sheets.map((x) => `${x.name} (${x.rows.length - 1} rows)`), internal: what === "client" });
    },
    render: ({ status, args }) => {
      if (status !== "complete") return <Working text="Preparing the export..." />;
      return (
        <Note>
          Downloaded. Again as{" "}
          <ExportButtons label="" internal={args.what === "client"} get={() => exportWorkbook(String(args.what), args.id, args.client)} />
          {args.what === "client" && <span className="block text-[11px] text-amber-700">Internal: includes our costs and margin.</span>}
        </Note>
      );
    },
  });

  useCopilotAction({
    name: "showGuide",
    description: "Show the step-by-step guide to using this site as a card.",
    parameters: [],
    handler: async () => "Guide shown as a card. Add one short line pointing to the step that fits their question.",
    render: ({ status }) => (status === "inProgress" ? <Working text="Opening the guide..." /> : <GuideCard steps={SITE_GUIDE} />),
  });

  useCopilotAction({
    name: "resetToOriginal",
    description: "Put values back: one library assumption (key), all assumptions, a client's own value (client + key), a whole client, all pricing, all use cases, or one scenario's overrides (scenarioId).",
    parameters: [
      { name: "target", type: "string", enum: ["assumption", "allAssumptions", "clientValue", "client", "pricing", "useCases", "scenario"], required: true },
      { name: "key", type: "string", required: false },
      { name: "client", type: "string", required: false },
      { name: "scenarioId", type: "string", required: false },
    ],
    handler: async ({ target, key: k, client: ref, scenarioId }) => {
      const st = useRoiStore.getState();
      const c = ref ? findClient(ref) : undefined;
      if (target === "assumption") {
        if (!k || !st.assumptions.some((a) => a.key === k)) return "Give a valid assumption key";
        st.resetAssumption(k);
      } else if (target === "allAssumptions") st.resetAssumptions();
      else if (target === "clientValue") {
        if (!c || !k) return "Give a client and key";
        st.setLocal(c.id, k, null);
      } else if (target === "client") {
        if (!c) return "Give a client";
        st.resetClient(c.id);
      } else if (target === "pricing") st.resetPricing();
      else if (target === "useCases") st.resetModels();
      else if (target === "scenario") {
        if (!scenarioId || !st.scenarios.some((s) => s.id === scenarioId)) return "Give a valid scenario id";
        st.updateScenario(scenarioId, { overrides: {} });
      }
      return JSON.stringify({ reset: target, key: k, client: c?.name, stillChanged: changesFromOriginal(useRoiStore.getState()).length });
    },
    render: ({ status, args }) => {
      if (status !== "complete") return <Working text="Putting the original values back..." />;
      return <Note tone="slate">Back to the original values for <b>{[args.target, args.client, args.key].filter(Boolean).join(" · ")}</b>.</Note>;
    },
  });

  return null;
}
