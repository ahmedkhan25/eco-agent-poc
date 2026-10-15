# ROI Advisor runbook

How to understand, update, test and ship the ecoheart ROI Advisor at `/roi`.
Written for AI coding agents and for people. Read it all before changing anything.

## 1. What it is

An internal, password-protected section of the eco-agent site, next to the Olympia agent, the Systems Modeler and the Florida demo. It is the only part with a password.

- **Live:** https://eco-agent-poc.onrender.com/roi (password in section 4; `/roi?key=eco` signs people in directly)
- **Who it's for:** the ecoheart team, for now. Not for clients yet.
- **What it does:** someone asks the chat "what if" questions about a client (a city, county, state agency, tribal nation or organization, nonprofit, utility or company). The Advisor (Claude) builds ROI scenario cards from any mix of **use cases**, fills in the client's own numbers with sources, prices the offer, tracks who does and pays for the work, runs checks, and writes a printable report. Every number comes from one deterministic calculator, never from the model.

Tabs:

| Tab | Route | What it shows |
|---|---|---|
| Workspace | `/roi` | Scenario cards; the active scenario with client picker, use-case chips, basis switch, value bars, who covers year one, other outcomes, checks, and "Tune this scenario" (grouped by use case, each value marked library / client's own / proposed) |
| Clients | `/roi/clients` | Client profiles: type, place, people served, size, use cases; the client's own numbers (confirm Advisor proposals here); offer, contract, adjustments; year-by-year deal with margin; people, SMEs, services and partner shares, each with who pays; checks. `?id=<client>` opens one. |
| Use cases | `/roi/model` | Every use case as a card (value lines with their formula, overlap tags, client spending, outcomes, wiring checks), then the editable assumption library |
| Pricing | `/roi/pricing` | Offers at a chosen size vs the public CitySense ranges; Sandrine's 22-item catalog by size; volume discounts; size bands and margin floor; state and regional bundles (ARR, MRR, quarterly) |
| Report | `/roi/report` | Printable one-pager for one scenario (no internal costs or margin). Team checks show below it on screen only. |
| Proposal | `/roi/proposal` | The stakeholder proposal page (`public/roi/proposal.html`) |
| Explainer | `/roi/explainer` | The walkthrough video with chapters |

The chat panel ("Ask the Advisor") sits on the right of every tab. The header shows whether the shared workspace is saved for the team.

## 2. Where everything lives

- **Repo:** GitHub `ahmedkhan25/eco-agent-poc`; locally `~/Repos/eco-agent/eco-agent-poc` on Ahmed's Mac.
- **Deploy:** Render auto-deploys `main`. See section 8.
- **Stack:** Next.js 15.4 (app router, `src/`), Tailwind v4, zustand, CopilotKit 1.53, Anthropic SDK, Supabase Storage.

| File | Role |
|---|---|
| `src/middleware.ts` | Password gate. Matches `/roi`, `/roi/:path*` and `/api/roi/:path*` only. |
| `src/lib/roi/access.ts` | Cookie, password check (`ROI_ACCESS_PASSWORD`, default `eco`), `?key=` sign-in |
| `src/components/roi/roi-shell.tsx` | Header tabs, sync badge, chat panel, CopilotKit provider |
| `src/components/roi/roi-agent.tsx` | **What the Advisor can see and do:** readables, actions and the cards it draws in the chat |
| `src/components/roi/sync.tsx` | `useSharedWorkspace()` (pull on load, poll every 30 s, push 1.2 s after a change) and `SyncBadge` |
| `src/lib/roi/prompt.ts` | The Advisor's instructions: how the model is built, the skills index, the tool workflow, messaging rules |
| `src/lib/roi/skills.ts` | **Skills** the Advisor loads on demand (`loadSkill`): value-modeling, client-profile, city-research, pricing-and-offers, cost-and-margin, partners-and-funding, state-bundles, validation, reporting-and-messaging. Plain text; edit freely. |
| `src/lib/roi/about.ts`, `guide.ts` | ecoheart background, links, explainer video; how-to steps and per-tab suggestion buttons |
| `src/lib/roi/engine.ts` | **The calculator.** Types (use case, value line, assumption), `lineValue`, `computeRoi`, `formulaText`, `fmtMoney` |
| `src/lib/roi/pricing.ts` | Client, offer, catalog, cost-line and bundle types; `sizeFor`, `offerPrice`, `dealSummary`, `bundleSummary` |
| `src/lib/roi/export.ts` | CSV and Excel export: `useCaseWorkbook`, `clientWorkbook` (internal), `scenarioWorkbook`, `download` (Excel loads `exceljs` only on click) |
| `src/lib/roi/validate.ts` | Checks in code: `checkModel`, `validateScenario`, `validateClient`, `sensitivity`, `gaps` |
| `src/lib/roi/defaults.ts` | **Starting values:** assumption library, the four starter use cases, offers with cost templates, adjustment presets, the three starter clients |
| `src/lib/roi/data/catalog.ts` | Sandrine's 22 catalog items by size (hours × people already multiplied out) |
| `src/lib/roi/data/state-counts.ts`, `us-cities.json` | Cities by size per state (bundles); 19,479 US places with population (server-side lookup only) |
| `src/lib/roi/store.ts` | zustand store (localStorage `ecoheart-roi-v1`, version 2 with a v1 migration), derived values (`scenarioResult`, `resolveKey`, `clientDeal`, `changesFromOriginal`) |
| `src/app/api/roi/state/route.ts` | GET/PUT the shared workspace in Supabase Storage (bucket `roi-advisor`, file `workspace.json`) |
| `src/app/api/roi/city-docs/route.ts` | Searches a client's indexed documents (Olympia: S3 Vectors `olympia-rag-vectors` / `olympia-pages-idx`, us-west-2, OpenAI `text-embedding-3-small` at 1024 dims) |
| `src/app/api/roi/lookup/route.ts` | Population and size for a US city |
| `src/app/api/roi/copilot/route.ts` | Chat backend on Claude; strips thinking from the stream (section 9) |
| `src/app/roi/*/page.tsx` | The tabs |

## 3. How the model works

### Use cases are built from four blocks

A **use case** is a list of value lines. Each line is one of four blocks, so a new kind of saving never needs new math:

| Block | Formula | Keys |
|---|---|---|
| Cost avoided | yearly cost × share avoided (%) | `base`, `share` |
| Events avoided | events a year × cost per event × share avoided (%) | `count`, `unitCost`, `share` |
| Time saved | staff hours × hourly rate | `hours`, `rate` |
| New money won | dollars at stake × improvement (%) | `amount`, `share` |

Each key points at an assumption in the library. A use case can also have **client costs** (what the client spends itself, count × unit cost, e.g. neighborhood grants) and **outcomes** (non-dollar results such as hours sooner a resident hears back; never in the dollar ROI). Lines that could count the same saving in two use cases share an **overlap** tag, and validation warns when both are used.

Starter use cases (in `defaults.ts`): **Storm and insurance** (Jerid's Hollywood case: premium credit, small claims, deductibles, overtime, staff time, plus neighborhood grants), **Grant Finder**, **Hurricane after-action** (FEMA reimbursement), **311 complaint triage**. Each is tagged with one of the seven CitySense super-systems.

### Values resolve in three layers

scenario what-if override **>** the client's own value **>** the library column (Cautious = `low`, Expected, Business case = `high`).

The library values are Hollywood, FL's numbers and act as placeholders for everyone else. A client's own value has a source, confidence, owner and a status: **proposed** (found by the Advisor, waiting for a person) or **confirmed**.

### The calculator

`computeRoi(models, values, fee, extraClientCosts)`:

- each line's value from its block; cost-type lines also give "today" and "with the Advisor" for the bars
- **saved** = sum of all line values
- **fee** = what the client pays ecoheart in year one: the deal's year-one price after partner and grant shares, unless the scenario overrides `fee`
- **spent** = fee + client costs (+ services the client pays for directly)
- **net** = saved − spent; **return per $1** = saved ÷ spent; **payback** = spent ÷ (saved ÷ 12) months, at least 1

**Regression check (must hold):** Hollywood, storm and insurance, Expected = **$378K net, $2.5 back per $1, 5-month payback, $250K spent** ($150K fee + $100K grants; saved $628K = 135 + 152 + 225 + 77 + 39). With `credit` 2%: **$297K net**.

### Pricing, cost and who pays (`pricing.ts`)

- **Catalog:** Sandrine's 22 items by size (Small under 10K people, Mid-size under 100K, Large under 275K, Major above; editable bands). Each is one-time or yearly, US / EU / everywhere. Fixed vs her workbook: GDPR and the EU AI Act are yearly; HIPAA and CCPA are US-only.
- **Offers:** ROI Snapshot $35K; Early partner project $150K (12 weeks); Ongoing service $70K a year (range $50–90K); CitySense Supported pilot (catalog-priced, public range $150–300K, 1–2 use cases); CitySense Full pilot (catalog-priced, $750K–$1.2M, 3–5 use cases). Each offer carries a cost template (team roles and running costs) copied to a client that picks it.
- **Client deal:** offer + optional ongoing offer from year 2, contract years, yearly increase (yearly items only; one-time work is billed once), payments, price adjustments (% or $, year one or every year).
- **Cost lines**, each with **who pays** (client, ecoheart, partner, grant):
  - *people*: our team or an SME (hours in year one and after, cost rate, charge rate, "bill on top" adds hours × charge rate to the price). Example: Olympia climate and engineering SME, 40 h at $55.
  - *service*: one-time and monthly amounts, keeps running or not.
  - *share*: a named partner or grant covering a % or $ of the price, once or every year. Lowers what the client pays, not our revenue.
- `dealSummary()` gives year-by-year price, shares, client pays, our cost, margin, ARR, MRR, payments and the "who covers year one" split. Margin floor (default 20%) lives on the Pricing tab.
- **Bundles:** a state (cities counted by size) and/or a list of clients, an offer, years and increase; volume discounts from the workbook table (the 751–1,100 band is switched off). A state is priced one subscription per city (open question from ChaiJen).

### Checks (`validate.ts`)

Run in code, shown on the Workspace, Clients, Use cases and Report tabs, and returned to the Advisor by `validate`: wiring and units of each use case; sources and owners on any driver over 5% of value; cautious ≤ expected ≤ business case; double counting; share of value resting on estimates; library placeholders for non-Hollywood clients; price inside the offer's range; use-case count for the offer; margin floor; unnamed partners; people without a rate; HIPAA for non-health clients; tribal data sovereignty (CARE); Advisor proposals waiting for a person. `sensitivity()` gives the inputs that move net value most and their break-even; `gaps()` lists a client's values still to fill, biggest impact first.

## 4. Where the numbers come from

- Storm and insurance library values: **Jerid's draft business case for Hollywood, FL (Oct 2026)**. Sources, confidence and owners are on the Use cases tab.
- Grant Finder, Hurricane after-action and 311 triage values are **ecoheart estimates** (low confidence) until a client confirms them.
- Catalog, size bands, discount table and state city counts: **Sandrine's pricing workbooks**, with the fixes listed in `roi-advisor/pricing-qa/pricing-workbook-qa.md` in the project files. Don't copy numbers from the workbooks without checking.
- CitySense ranges: the CitySense pilot PDF.
- Internal team rates and running costs: ecoheart estimates in `defaults.ts` (internal only).
- Design notes: `roi-advisor/multi-model-design.md` in the project files.

**Password:** `eco` by default. Set `ROI_ACCESS_PASSWORD` on Render to change it (this signs everyone out). `/roi?key=eco` signs a visitor in for 30 days.

## 5. How the Advisor works

Model: `CLAUDE_MODEL` from `src/lib/llm.ts` (env `CHAT_MODEL`, default `claude-opus-5-5`); OpenAI `gpt-4o` fallback without an Anthropic key.

**Skills.** The prompt lists the skills; before specialized work the Advisor calls `loadSkill` and follows that skill's text. To teach it something new, add or edit a skill in `skills.ts`; no code change needed.

**Readables** (what it sees): its instructions, the page, use cases, the library, client profiles with their deal (internal), offers, scenarios with results, active/compare ids, bundles, and every value changed since the original.

**Actions** (`roi-agent.tsx`; each changes the store and draws a card in the chat; handlers accept JSON strings because Claude often sends them that way):

| Area | Actions |
|---|---|
| Know-how | `loadSkill` |
| Scenarios | `createScenario` (client, use cases, basis, overrides), `updateScenario`, `compareScenarios` |
| Clients | `createClient` (any client type), `updateClient` (details, use cases, offer, contract) |
| Client numbers | `listGaps`, `searchCityDocs` (indexed documents, quotes with page), `lookupPublicData` (US population and size), `fillAssumption` (saved as **proposed**, with source) |
| Use cases | `createUseCase`, `addValueLine` (creates any new assumptions it needs, marked "by the Advisor"), `updateAssumption` (shared library) |
| Cost and funding | `addCostLine` (people, SME, service, partner/grant share; shows who pays), `updateCostLine` (or remove), `addAdjustment` |
| Pricing | `listCatalog`, `updateCatalogItem`, `updateOffer`, `createBundle` |
| Quality | `validate` (scenario, client or use case), `sensitivity` |
| Output | `createReport`, `exportData` (use case, client cost model or scenario to CSV or Excel), `shareLinks`, `showGuide`, `resetToOriginal` |

Rules in `prompt.ts` you must keep: the Advisor never does the math; it never marks its own values confirmed; it runs `validate` before reports and after changes; it keeps internal costs, rates and margin out of client text; it never claims pilots or a finished platform.

### Export to CSV or Excel

Every use-case card (Use cases tab), each client (Clients tab, "Cost model") and the active scenario (Workspace) has **CSV** and **Excel** buttons, and the Advisor can do it with `exportData`. Excel files have one sheet per table; CSV stacks the tables with a `# Sheet name` line between them.

- **Use case:** about, value lines (block, formula, keys, overlap, yearly value), assumptions (all three columns, plus one client's values if given).
- **Client cost model (internal):** deal summary with margin, year by year, cost lines with who pays, who covers year one, adjustments, the client's own numbers, catalog items.
- **Scenario:** summary, value by line, costs today vs with the Advisor, every input with where it came from, outcomes.

## 6. Shared storage (Supabase)

- Shared for the whole team: assumption library, use cases, clients, catalog, offers, discounts, size bands, bundles, margin floor. Scenarios on the canvas, compare and the report draft stay in each browser.
- Stored as one JSON file, `workspace.json`, in the private Supabase Storage bucket `roi-advisor` (created on first use), through `/api/roi/state` with `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL`. No database tables.
- Each save sends the version it started from; if a teammate saved first, the server answers 409 with their copy, the browser loads it and the badge says so. Last write wins otherwise.
- The file is uploaded with `cacheControl: "0"` so reads are never served from Supabase's cache.
- `ROI_WORKSPACE_FILE` overrides the file name (local tests use `workspace-test.json`).
- Without the Supabase env vars the badge says "This browser only" and everything still works locally.
- Check it: `curl -s -b <cookie> https://eco-agent-poc.onrender.com/api/roi/state | head -c 200` should show `"shared":true`.
- To reset the team copy to the code defaults, delete `workspace.json` in the bucket; the next browser to load seeds it from its own copy (so clear that browser's site data first).

## 7. Common changes (recipes)

**Add a use case.** Easiest: ask the Advisor ("Draft a use case for tree canopy and heat"). It loads the value-modeling skill, calls `createUseCase` and `addValueLine`, and the result is shared with the team. To ship it as a starter for everyone, add it to `DEFAULT_MODELS` in `defaults.ts` with its assumptions in `DEFAULT_ASSUMPTIONS` (all three columns, source, confidence, owner).

**Change a starting value.** Edit `defaults.ts`. The team copy in Supabase keeps old values until someone resets them (reset buttons on each tab) or the file is deleted.

**Add a client.** Clients tab, "Add a client", or ask the Advisor. Starter clients are in `DEFAULT_CLIENTS`.

**Index a client's documents.** Build an S3 Vectors index like Olympia's, add a branch in `city-docs/route.ts`, add the id to `Client.docsIndex`, and set it on the client.

**Change prices or costs.** Pricing tab or Clients tab; or `DEFAULT_OFFERS` / `data/catalog.ts` in code.

**Change how the Advisor behaves.** `prompt.ts` for rules, `skills.ts` for know-how, a new `useCopilotAction` in `roi-agent.tsx` for a new ability (handler changes the store and returns JSON; render draws a small card).

**Change the store shape.** Bump `version` in `store.ts` and extend the `migrate` function, so saved browsers keep their scenarios.

**Proposal page, explainer video, ecoheart background.** Unchanged: `public/roi/proposal.html`; `public/roi/explainer.mp4` with chapters in `EXPLAINER_VIDEO` (`about.ts`); `ECOHEART_CONTEXT` and `RESOURCES` in `about.ts`. Keep images and video small (free plan, 512 MB).

## 8. Test before every push (required)

Ahmed's rule: test a **production build** locally and check real behavior, **including the AI-driven changes**, not only that pages load or that the calculator is right.

```bash
cd ~/Repos/eco-agent/eco-agent-poc
npx tsc --noEmit -p .
rm -rf .next/cache/webpack
npm run build && npx next start -p 3123
```

Checks:
1. `/roi` returns **307** without the cookie; `/`, `/systems-modeler`, `/demo` return **200**.
2. Log in (`/roi?key=eco`). Workspace, Clients, Use cases, Pricing, Report, Proposal and Explainer render with styles (screenshot).
3. Regression: the Hollywood starter card shows **$378K net, $2.5 per $1, 5 mo**.
4. `/api/roi/state` returns `"shared":true` and the header badge reads "Shared with the team".
5. Chat, each must produce a card and change the shared state:
   - "What does Flagstaff, AZ get back if the insurance credit is only 2%?" → new card marked **from chat**.
   - "Draft a use case for tree canopy and heat…" → a new use case on the Use cases tab with Advisor-created assumptions.
   - "What numbers is Olympia missing? Look them up in Olympia's documents…" → quotes with pages, and values marked **proposed** on the Clients tab.
   - "Add an Olympia SME at $55 an hour for 40 hours…" → a people line on Olympia and the new margin.
   - "A partner utility covers 30% of Olympia's year-one price…" → a share line and the who-pays bar.
   - "Set up a tribal nation in Washington…" → a client of type tribal nation, and validate flags data sovereignty.
   - "Validate the active scenario" → a checks card.
   - "Export Olympia's cost model to Excel" → an `.xlsx` downloads; the Export buttons on each tab download CSV and Excel.
   - Ask for a report → `/roi/report` with the summary and no margin in it.

The full chat run is scripted in `.tmp-roi/ai-test.js` (not committed; copy in the project files at `roi-advisor/mm-build/test/`). It waits on `data-copilotkit-in-progress`, logs each reply and the saved state, and saves screenshots and downloads to `/tmp/roi-ai-test`. Start the local server with `ROI_WORKSPACE_FILE=workspace-test.json npx next start -p 3123` so tests write to their own file in the bucket and never touch the team's `workspace.json`. Never run chat tests against the live site: they edit the team's shared workspace. `.tmp-roi/qa-prompts.json` holds a 10-ask QA set; pass it with `PROMPTS="$(cat .tmp-roi/qa-prompts.json)"`. The server log prints one `[roi-advisor] tool <name> args: <keys>` line per tool call, so a call with missing arguments shows up there.

Headless check on the Mac: playwright-core in `/tmp/pwtest`, Chromium at `~/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`. Open any page with `?key=eco`, type into `.roi-chat textarea`, press Enter, wait up to 90 s for the card.

## 9. Deploy

- `git push origin <branch>:main` from Ahmed's Mac. Cloud sessions can't push to this repo. Ahmed prefers local work pushed straight to main, without PRs.
- Render (free plan, service `srv-d4ech595pdvs73fppm1g`, in "Ahmed Khan's Workspace") builds `main` with `npm install --legacy-peer-deps && npm run build`.
- Use the Render API, not the dashboard. The key is `RENDER_API_KEY` in the gitignored `.env.local` on the Mac. The `render` CLI login is a different account and can't see this service.

```bash
K=$(grep '^RENDER_API_KEY' .env.local | cut -d= -f2- | tr -d '"')
# list deploys
curl -s -H "Authorization: Bearer $K" "https://api.render.com/v1/services/srv-d4ech595pdvs73fppm1g/deploys?limit=3"
# start one by hand (if auto-deploy didn't fire)
curl -s -X POST -H "Authorization: Bearer $K" -H "Content-Type: application/json" \
  -d '{"clearCache":"do_not_clear"}' https://api.render.com/v1/services/srv-d4ech595pdvs73fppm1g/deploys
```

- If the API answers `503 deploys is currently unavailable`, check https://status.render.com. Render outages block builds for everyone; wait and retry.
- The free plan sleeps when idle, and the first request takes about 50 seconds. Open the site early before a demo.
- After it goes live, repeat checks 1 to 5 from section 8 on https://eco-agent-poc.onrender.com.

## 10. Gotchas we already hit

1. **Middleware location.** Next only loads `src/middleware.ts` in this project; the root `middleware.ts` (a Supabase session refresh) has never run. Put gate logic in `src/middleware.ts` and keep its `matcher` limited to `/roi` and `/api/roi`, so the rest of the app stays open.
2. **Missing Tailwind styles after adding files.** The webpack cache reused old CSS, so new classes (layout, colors, the chat sidebar) silently disappeared in the production build. Run `rm -rf .next/cache/webpack` before building.
3. **Chat cards silently missing with Claude.** CopilotKit 1.53 runs Anthropic through its AI SDK agent. It turns Claude's thinking into an empty "reasoning" message, and the client then drops the tool call that follows: no card and no reply, with no error shown. Opus 5.5 rejects `thinking: disabled`. The fix is in `route.ts`: a custom `fetch` on the Anthropic client removes `thinking` and `redacted_thinking` blocks from the response stream. Keep it unless a CopilotKit upgrade fixes this; after any upgrade, re-run check 4 in section 7.
4. **The adapter's own settings are mostly ignored.** The runtime builds its own model from the adapter's `getLanguageModel()` (model name plus the client's fetch). Overriding `process()` or `max_tokens` on the adapter has no effect.
5. **CopilotKit inspector popup.** It is hidden with `showDevConsole={false} enableInspector={false}` on `<CopilotKit>`.
6. **Original vs current values.** The originals always come from the code (`defaults.ts`); the shared copy lives in Supabase and scenarios in the browser. That is how the Advisor and the tabs show what changed (teal fields, reset arrows) and undo it.
7. **The chat's `instructions` never reach the model.** CopilotKit 1.53's built-in agent drops system messages, which is how `<CopilotChat instructions>` is sent. The Advisor's role, rules, ecoheart background and how-to guide are passed as a `useCopilotReadable` in `roi-agent.tsx` instead. Put new behavior rules in `prompt.ts`, `about.ts` or `guide.ts`, and they flow through that readable.
8. **Login must not start the chat.** `RoiShell` skips CopilotKit on `/roi/login`, because the API is behind the gate.
9. **Chat hangs on "Working..." after two steps at once.** When Claude called two browser actions in parallel, only one result came back, and the next request failed with `AI_MissingToolResultsError: Tool result is missing for tool call` (visible in the Render log). The copilot route now sets `disable_parallel_tool_use` on every request, so the Advisor runs one step at a time.
10. **Doubled or half-empty cards.** A call with bad or missing arguments returns a refusal ("No scenario with id ...") and the model retries, so both calls drew a card. `useAction` in `roi-agent.tsx` wraps `useCopilotAction` and renders nothing when the result is a refusal (the `FAILED` pattern). Start new refusal messages with one of those words, and register new actions with `useAction`.
11. **Message ids repeat across replies.** The stream's content-block indexes restart at 0 for every response, so later replies merged into earlier ones. The copilot route offsets each response's indexes.
12. **Model renames arguments.** Handlers accept common aliases where it happened (`addValueLine`: useCaseId, name), and `createReport` falls back to the active scenario.
13. **One lost result used to kill the whole chat.** Browser actions run in the browser and send their result back with the next request. If a result never comes back (the handler threw, the page was refreshed or navigated mid-step, or the connection dropped), the history keeps a tool call with no result, and the AI SDK rejects every later request with `AI_MissingToolResultsError` until the page is refreshed. The copilot route now fills each missing result with a note ("this step did not finish") before the run starts (`repairHistory`), and logs `[roi-advisor] repaired missing result`. `useAction` also catches handler errors so a crash becomes an answer, not a missing result.

## 11. Messaging rules (for anything the agent or pages say)

- Ecoheart is a **platform**; never call it a pilot, and never claim existing pilots.
- The full platform isn't built. Frame work as **early partner projects** co-developed with the client.
- Be human-first: AI is an accelerator, not a replacement, and there is no jargon.
- Lead with city ROI and how funds get allocated.
- Marcia Drake is the only person named in public material.
- Stakeholder-facing visuals follow ecoheart.ai's style: DM Sans plus italic Playfair headings, slate ink, teal #0D9488 and paper #F7F6F2.

## 12. Planned next steps

- Decide which prices win where the catalog and the CitySense ranges disagree, and whether a state is one subscription or one per city (Ahmed and Marcia).
- Index more clients' documents for `searchCityDocs`.
- A client-facing version later, without the internal cost and pricing tabs.
- Update the explainer video's modeling scene for use cases, clients and pricing.
