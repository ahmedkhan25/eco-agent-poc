"use client";

// Registers what the ROI chat agent can see and do. Mounted once in the ROI
// shell, so the agent works from every tab. Each action renders a small card
// in the chat (generative UI) and changes the workspace itself.

import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";
import { fmtMoney, type InputKey, type RoiInputs } from "@/lib/roi/engine";
import { BASIS_LABEL, type Basis } from "@/lib/roi/defaults";
import { changesFromOriginal, costTotals, scenarioResult, useRoiStore } from "@/lib/roi/store";
import { DEFAULT_ASSUMPTIONS, DEFAULT_OFFERS, DEFAULT_ROLES, DEFAULT_RUN } from "@/lib/roi/defaults";
import { RESOURCES } from "@/lib/roi/about";
import { ROI_AGENT_INSTRUCTIONS } from "@/lib/roi/prompt";
import { SITE_GUIDE } from "@/lib/roi/guide";
import { GuideCard, LinkCards, MiniScenario, Working, headline, ink } from "./ui";

const INPUT_KEYS: { name: InputKey; description: string }[] = [
  { name: "prem", description: "Annual property insurance premium, dollars" },
  { name: "credit", description: "Premium credit at renewal, percent (5 = 5%)" },
  { name: "claims", description: "Small claims under the deductible per year, dollars" },
  { name: "claimsCut", description: "Share of small claims avoided, percent" },
  { name: "ded", description: "Wind and water deductibles per year, dollars" },
  { name: "dedCut", description: "Share of deductibles avoided, percent" },
  { name: "ot", description: "Emergency overtime and pumping per year, dollars" },
  { name: "otCut", description: "Share of overtime avoided, percent" },
  { name: "hrs", description: "Staff hours saved per year on insurer and grant reports" },
  { name: "hourly", description: "Fully loaded staff cost per hour, dollars" },
  { name: "fee", description: "ecoheart fee, dollars" },
  { name: "grants", description: "Number of neighborhood micro-grants" },
  { name: "grantSize", description: "Size of each grant, dollars" },
];

const overridesParam = {
  name: "overrides",
  type: "object" as const,
  description: "Only the inputs that differ from the shared assumption library. Leave out everything else.",
  required: false,
  attributes: INPUT_KEYS.map((k) => ({ name: k.name, type: "number" as const, description: k.description, required: false })),
};

// Claude sometimes sends `overrides` as a JSON string, or puts the keys at the
// top level of the call. Accept all three so a what-if never silently drops.
function clean(o: unknown, top?: Record<string, unknown>): Partial<RoiInputs> {
  if (typeof o === "string") {
    try {
      o = JSON.parse(o);
    } catch {
      o = {};
    }
  }
  if (top) o = { ...top, ...(o && typeof o === "object" ? o : {}) };
  if (!o || typeof o !== "object") return {};
  const out: Partial<RoiInputs> = {};
  for (const k of INPUT_KEYS) {
    const v = (o as Record<string, unknown>)[k.name];
    if (typeof v === "number" && Number.isFinite(v)) out[k.name] = v;
    else if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) out[k.name] = Number(v);
  }
  return out;
}

// Claude sometimes sends a list param as a JSON string or a comma list.
function strList(v: unknown): string[] {
  if (typeof v === "string") {
    const raw = v;
    try {
      v = JSON.parse(raw);
    } catch {
      v = raw.split(",");
    }
  }
  if (typeof v === "string") v = [v];
  return Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
}

// Claude sometimes renames the list param or sends titles instead of ids; match loosely.
function pickResources(args: Record<string, unknown>) {
  const key = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "");
  const wanted = Object.entries(args ?? {})
    .filter(([k]) => k !== "note")
    .flatMap(([, v]) => strList(v))
    .map(key)
    .filter(Boolean);
  return RESOURCES.filter((r) =>
    wanted.some((w) => w === key(r.id) || w.startsWith(key(r.id)) || key(r.title).includes(w)),
  );
}

const asBasis = (b: unknown): Basis => (b === "low" || b === "high" ? b : "expected");

function summarize(id: string) {
  const { scenarios, assumptions } = useRoiStore.getState();
  const s = scenarios.find((x) => x.id === id);
  if (!s) return null;
  const r = scenarioResult(s, assumptions);
  return {
    id: s.id,
    name: s.name,
    city: s.city,
    basis: BASIS_LABEL[s.basis],
    overrides: s.overrides,
    netYearOne: fmtMoney(r.net),
    returnPerDollar: `$${r.returnPerDollar.toFixed(2)}`,
    paybackMonths: r.paybackMonths,
    citySpends: fmtMoney(r.spent),
    grossSavings: fmtMoney(r.saved),
    stormAndInsuranceToday: fmtMoney(r.today),
    biggestDrivers: r.drivers.slice(0, 3).map((d) => `${d.label}: ${fmtMoney(d.value)}`),
  };
}

export function RoiAgent() {
  const router = useRouter();
  const pathname = usePathname();
  const store = useRoiStore();
  const goCanvas = () => {
    if (pathname !== "/roi") router.push("/roi");
  };

  // CopilotKit 1.53's built-in agent drops the chat's `instructions` (a system
  // message), so the Advisor's role, rules and ecoheart background ride along
  // as context, which always reaches the model.
  useCopilotReadable({
    description: "Your role, rules, ecoheart background and how-to guide. Follow these instructions.",
    value: ROI_AGENT_INSTRUCTIONS,
  });

  useCopilotReadable({
    description: "The page of the ROI Advisor the person is looking at",
    value: pathname,
  });

  useCopilotReadable({
    description:
      "Shared assumption library. Each scenario uses one basis column (low = cautious, expected, high = business case) unless it overrides a key.",
    value: store.assumptions.map((a) => ({
      key: a.key,
      label: a.label,
      unit: a.unit,
      cautious: a.low,
      expected: a.expected,
      businessCase: a.high,
      confidence: a.confidence,
      source: a.source,
    })),
  });

  useCopilotReadable({
    description:
      "Original starting values (from Jerid's Hollywood business case and our first cost model), and every value that has been changed since. Use this to say what something was before, or to put it back.",
    value: {
      changedSinceOriginal: changesFromOriginal(store),
      originalAssumptions: DEFAULT_ASSUMPTIONS.map((a) => ({ key: a.key, cautious: a.low, expected: a.expected, businessCase: a.high, confidence: a.confidence, source: a.source })),
      originalRoles: DEFAULT_ROLES,
      originalRunCosts: DEFAULT_RUN,
      originalOffers: DEFAULT_OFFERS,
    },
  });

  useCopilotReadable({
    description: "Scenarios on the canvas with their calculated results (from the calculator, not estimates)",
    value: store.scenarios.map((s) => summarize(s.id)),
  });

  useCopilotReadable({
    description: "Which scenario is open and which are being compared",
    value: { activeId: store.activeId, compareIds: store.compareIds },
  });

  useCopilotReadable({
    description: "Internal ecoheart cost model (never share with cities): team hours, cost, run cost and margin on the early partner project",
    value: (() => {
      const t = costTotals(store.roles, store.run, store.offers);
      return {
        teamHours: t.hours,
        teamCost: fmtMoney(t.teamCost),
        listValueAt200: fmtMoney(t.listValue),
        runCostPerMonth: `$${t.runMonthly}`,
        partnerProjectPrice: fmtMoney(t.partnerPrice),
        marginOnPartnerProject: `${fmtMoney(t.margin)} (${Math.round(t.marginPct * 100)}%)`,
        roles: store.roles,
        runCostsPerMonth: store.run,
        offers: store.offers,
      };
    })(),
  });

  useCopilotAction({
    name: "createScenario",
    description:
      "Create a new ROI scenario card on the canvas and calculate it. Use for every new what-if. Returns the calculated numbers to quote.",
    parameters: [
      { name: "name", type: "string", description: "Short card title, e.g. 'Flagstaff, cautious'", required: true },
      { name: "city", type: "string", description: "City and state", required: true },
      { name: "question", type: "string", description: "The question this scenario answers, in plain words", required: true },
      { name: "basis", type: "string", description: "low (cautious), expected or high (business case)", enum: ["low", "expected", "high"], required: true },
      overridesParam,
      { name: "notes", type: "string", description: "Where the overrides came from, or what to confirm", required: false },
    ],
    handler: async (args) => {
      const { name, city, question, basis, overrides, notes } = args;
      const s = useRoiStore.getState().addScenario({
        name,
        city,
        question,
        basis: asBasis(basis),
        overrides: clean(overrides, args as Record<string, unknown>),
        notes: notes ?? "",
        createdBy: "agent",
      });
      goCanvas();
      return JSON.stringify(summarize(s.id));
    },
    render: ({ status, args }) => {
      if (status === "inProgress") return <Working text="Setting up the scenario..." />;
      const s = { basis: asBasis(args.basis), overrides: clean(args.overrides, args as Record<string, unknown>) };
      const r = scenarioResult(s, useRoiStore.getState().assumptions);
      return <MiniScenario name={args.name ?? "Scenario"} city={args.city} basis={s.basis} r={r} onOpen={goCanvas} />;
    },
  });

  useCopilotAction({
    name: "updateScenario",
    description: "Change an existing scenario: rename it, switch basis, or change overrides. Overrides you pass are merged in; pass resetKeys to go back to the library value.",
    parameters: [
      { name: "id", type: "string", description: "Scenario id", required: true },
      { name: "name", type: "string", required: false },
      { name: "basis", type: "string", enum: ["low", "expected", "high"], required: false },
      overridesParam,
      { name: "resetKeys", type: "string[]", description: "Input keys to reset to the library value", required: false },
      { name: "notes", type: "string", required: false },
    ],
    handler: async (args) => {
      const { id, name, basis, overrides, resetKeys, notes } = args;
      const st = useRoiStore.getState();
      const s = st.scenarios.find((x) => x.id === id);
      if (!s) return `No scenario with id ${id}. Existing ids: ${st.scenarios.map((x) => x.id).join(", ")}`;
      const merged = { ...s.overrides, ...clean(overrides, args as Record<string, unknown>) };
      for (const k of strList(resetKeys)) delete merged[k as InputKey];
      st.updateScenario(id, {
        ...(name ? { name } : {}),
        ...(basis ? { basis: asBasis(basis) } : {}),
        ...(notes ? { notes } : {}),
        overrides: merged,
      });
      st.setActive(id);
      goCanvas();
      return JSON.stringify(summarize(id));
    },
    render: ({ status, args }) => {
      if (status !== "complete") return <Working text="Updating the scenario..." />;
      const s = useRoiStore.getState().scenarios.find((x) => x.id === args.id);
      if (!s) return <></>;
      return (
        <MiniScenario
          name={s.name}
          city={s.city}
          basis={s.basis}
          r={scenarioResult(s, useRoiStore.getState().assumptions)}
          onOpen={goCanvas}
        />
      );
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
      goCanvas();
      return JSON.stringify(valid.map(summarize));
    },
    render: ({ status, args }) => {
      if (status !== "complete") return <Working text="Lining them up..." />;
      const { scenarios, assumptions } = useRoiStore.getState();
      const rows = strList(args.ids)
        .map((i) => scenarios.find((s) => s.id === i))
        .filter(Boolean)
        .map((s) => ({ s: s!, h: headline(scenarioResult(s!, assumptions)) }));
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

  useCopilotAction({
    name: "updateAssumption",
    description:
      "Change the shared assumption library (affects every scenario that doesn't override this key). Field is low (cautious), expected, high (business case), source, confidence or owner.",
    parameters: [
      { name: "key", type: "string", enum: INPUT_KEYS.map((k) => k.name), required: true },
      { name: "field", type: "string", enum: ["low", "expected", "high", "source", "confidence", "owner"], required: true },
      { name: "value", type: "string", description: "New value. Numbers as plain digits; confidence is low, medium or high.", required: true },
    ],
    handler: async ({ key, field, value }) => {
      const st = useRoiStore.getState();
      const a = st.assumptions.find((x) => x.key === key);
      if (!a) return `Unknown key ${key}`;
      const numeric = field === "low" || field === "expected" || field === "high";
      const v = numeric ? Number(value) : value;
      if (numeric && !Number.isFinite(v as number)) return `Value must be a number`;
      const before = a[field as keyof typeof a];
      st.setAssumption(key as InputKey, field as "low", v as number);
      const original = DEFAULT_ASSUMPTIONS.find((x) => x.key === key)?.[field as keyof typeof a];
      return JSON.stringify({ changed: a.label, field, from: before, to: v, original, scenarios: st.scenarios.map((s) => summarize(s.id)) });
    },
    render: ({ status, args }) => {
      if (status !== "complete") return <Working text="Updating the assumption library..." />;
      const a = useRoiStore.getState().assumptions.find((x) => x.key === args.key);
      const field = args.field === "low" ? "cautious" : args.field === "high" ? "business case" : args.field;
      return (
        <div className="my-2 rounded-lg border border-teal-200 bg-teal-50/60 px-3 py-2 text-xs text-teal-900">
          Library updated: <b>{a?.label}</b> ({field}) is now <b>{String(args.value)}</b>.{" "}
          <Link href="/roi/model" className="underline">
            See the model
          </Link>
        </div>
      );
    },
  });

  useCopilotAction({
    name: "createReport",
    description: "Prepare the printable ROI report for one scenario and open it.",
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
        <Link
          href="/roi/report"
          className="my-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-teal-400"
        >
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
    description:
      "Show link cards for ecoheart resources: our website, services, story and team, contact, the explainer video, the proposal, the model, the report, and the other parts of this site. Use whenever someone asks where to find something.",
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
      const items = pickResources(args as Record<string, unknown>);
      return <LinkCards items={items} note={args.note} />;
    },
  });

  useCopilotAction({
    name: "showGuide",
    description: "Show the step-by-step guide to using this site as a card. Use when someone asks how to use the site, where to start, or what the tabs do.",
    parameters: [],
    handler: async () => "Guide shown as a card. Add one short line pointing to the step that fits their question.",
    render: ({ status }) => (status === "inProgress" ? <Working text="Opening the guide..." /> : <GuideCard steps={SITE_GUIDE} />),
  });

  useCopilotAction({
    name: "updateCostModel",
    description:
      "Change our internal cost model: a role's hours, list rate or internal rate; a monthly running cost; or an offer's price, length or notes. Match the item by its name.",
    parameters: [
      { name: "table", type: "string", enum: ["roles", "run", "offers"], required: true },
      { name: "item", type: "string", description: "Role, run-cost item or offer name (as listed in the cost model)", required: true },
      { name: "field", type: "string", description: "roles: hours, listRate, internalRate. run: monthly. offers: price, weeks, notes", required: true },
      { name: "value", type: "string", description: "New value; numbers as plain digits", required: true },
    ],
    handler: async ({ table: rawTable, item, field: rawField, value }) => {
      const st = useRoiStore.getState();
      const norm = (x: unknown) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const names = {
        roles: st.roles.map((r) => r.role),
        run: st.run.map((r) => r.item),
        offers: st.offers.map((o) => o.name),
      };
      type Table = keyof typeof names;
      const find = (tb: Table) => names[tb].findIndex((n) => norm(n).includes(norm(item)) || norm(item).includes(norm(n)));
      // Be forgiving: the model may say "running costs" or pick the wrong table.
      const tn = norm(rawTable);
      let table: Table = tn.includes("role") || tn.includes("team") ? "roles" : tn.includes("run") || tn.includes("month") || tn.includes("hosting") ? "run" : tn.includes("offer") || tn.includes("price") ? "offers" : "run";
      let i = find(table);
      if (i < 0) {
        const other = (["roles", "run", "offers"] as Table[]).find((tb) => find(tb) >= 0);
        if (other) {
          table = other;
          i = find(other);
        }
      }
      const list = names[table];
      if (i < 0) return `No item matching "${item}". Roles: ${names.roles.join(", ")}. Running costs: ${names.run.join(", ")}. Offers: ${names.offers.join(", ")}`;
      const allowed = table === "roles" ? ["hours", "listRate", "internalRate"] : table === "run" ? ["monthly"] : ["price", "weeks", "notes"];
      const fn = norm(rawField);
      const field =
        allowed.find((f) => norm(f) === fn) ??
        (table === "run" ? "monthly" : table === "offers" ? (fn.includes("week") || fn.includes("length") ? "weeks" : fn.includes("note") ? "notes" : "price") : fn.includes("hour") && !fn.includes("rate") ? "hours" : fn.includes("list") ? "listRate" : fn.includes("rate") || fn.includes("internal") || fn.includes("our") ? "internalRate" : "");
      if (!field) return `Field must be one of ${allowed.join(", ")}`;
      const numeric = !["weeks", "notes"].includes(field);
      const v = numeric ? Number(String(value).replace(/[$,\s]/g, "")) : value;
      if (numeric && !Number.isFinite(v as number)) return "Value must be a number";
      const rows: Record<string, unknown>[] = (table === "roles" ? st.roles : table === "run" ? st.run : st.offers) as never;
      const origRows: Record<string, unknown>[] = (table === "roles" ? DEFAULT_ROLES : table === "run" ? DEFAULT_RUN : DEFAULT_OFFERS) as never;
      const before = rows[i]?.[field];
      const original = origRows[i]?.[field];
      if (table === "roles") st.setRole(i, { [field]: v });
      else if (table === "run") st.setRun(i, { [field]: v });
      else st.setOffer(i, { [field]: v });
      const after = useRoiStore.getState();
      const t = costTotals(after.roles, after.run, after.offers);
      return JSON.stringify({ changed: `${list[i]} ${field}`, from: before, to: v, original, teamCost: fmtMoney(t.teamCost), runPerMonth: t.runMonthly, margin: `${fmtMoney(t.margin)} (${Math.round(t.marginPct * 100)}%)` });
    },
    render: ({ status, args, result }) => {
      if (status !== "complete") return <Working text="Updating the cost model..." />;
      let r: { changed?: string; to?: unknown; margin?: string } = {};
      try { r = JSON.parse(String(result)); } catch {}
      // Only confirm when the handler actually changed something.
      if (!r.changed) return <></>;
      const margin = r.margin ?? "";
      return (
        <div className="my-2 rounded-lg border border-teal-200 bg-teal-50/60 px-3 py-2 text-xs text-teal-900">
          Cost model updated: <b>{String(args.item)}</b> is now <b>{String(r.to)}</b>.{margin && <> Margin on the partner project: <b>{margin}</b>.</>}{" "}
          <Link href="/roi/model" className="underline">See the model</Link>
        </div>
      );
    },
  });

  useCopilotAction({
    name: "resetToOriginal",
    description:
      "Put values back to their original starting values: one assumption (give key), all assumptions, the whole cost model, or one scenario's own overrides (give scenarioId).",
    parameters: [
      { name: "target", type: "string", enum: ["assumption", "allAssumptions", "costModel", "scenario"], required: true },
      { name: "key", type: "string", description: "Assumption key when target is assumption", required: false },
      { name: "scenarioId", type: "string", description: "Scenario id when target is scenario", required: false },
    ],
    handler: async ({ target, key, scenarioId }) => {
      const st = useRoiStore.getState();
      if (target === "assumption") {
        if (!key || !st.assumptions.some((a) => a.key === key)) return `Give a valid assumption key`;
        st.resetAssumption(key as InputKey);
      } else if (target === "allAssumptions") st.resetAssumptions();
      else if (target === "costModel") st.resetCosts();
      else if (target === "scenario") {
        if (!scenarioId || !st.scenarios.some((s) => s.id === scenarioId)) return `Give a valid scenario id`;
        st.updateScenario(scenarioId, { overrides: {} });
      }
      return JSON.stringify({ reset: target, key, scenarioId, stillChanged: changesFromOriginal(useRoiStore.getState()).length });
    },
    render: ({ status, args }) => {
      if (status !== "complete") return <Working text="Putting the original values back..." />;
      const what =
        args.target === "assumption" ? `${args.key}` : args.target === "allAssumptions" ? "all assumptions" : args.target === "costModel" ? "the cost model" : "this scenario's own changes";
      return (
        <div className="my-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
          Back to the original values for <b>{what}</b>.
        </div>
      );
    },
  });

  return null;
}
