# ROI Advisor runbook

How to understand, update, test and ship the ecoheart ROI Advisor at `/roi`.
Written for AI coding agents and for people. Read it all before changing anything.

## 1. What it is

An internal, password-protected section of the eco-agent site. It is the fourth part of the app, next to the Olympia agent, the Systems Modeler and the Florida demo. It is the only part with a password.

- **Live:** https://eco-agent-poc.onrender.com/roi (the password is in section 4)
- **Who it's for:** the ecoheart team, for now. It is not for cities yet.
- **What it does:** someone asks the chat "what if" questions about a city. The agent (Claude) turns each answer into an ROI scenario card on the canvas, compares scenarios, edits the shared assumptions and writes a printable report. Every number comes from one deterministic calculator, never from the model.

Tabs:

| Tab | Route | What it shows |
|---|---|---|
| Workspace | `/roi` | Scenario cards, side-by-side compare, the active scenario with "Tune this scenario" overrides, and starter prompts |
| Model & assumptions | `/roi/model` | The editable assumption library (cautious / expected / business case, source, confidence, owner) and the internal cost model (roles, hours, rates, run costs, offers, margin) |
| Report | `/roi/report` | A printable one-pager for one scenario (Print, or save as PDF) |
| Proposal | `/roi/proposal` | The stakeholder proposal page, shown in an iframe from `public/roi/proposal.html` |

The chat panel ("Ask the Advisor") sits on the right of every tab.

## 2. Where everything lives

- **Repo:** GitHub `ahmedkhan25/eco-agent-poc`. Locally it is `~/Repos/eco-agent/eco-agent-poc` on Ahmed's Mac.
- **Deploy:** Render auto-deploys `main`. See section 8.
- **Stack:** Next.js 15.4 (app router, `src/`), Tailwind v4, zustand, CopilotKit 1.53, Anthropic SDK.

| File | Role |
|---|---|
| `src/middleware.ts` | Password gate. Matches `/roi`, `/roi/:path*` and `/api/roi/:path*` only. |
| `src/lib/roi/access.ts` | Cookie name, 30-day lifetime, password check (`ROI_ACCESS_PASSWORD`, default `eco`), redirect to `/roi/login` |
| `src/app/api/roi/login/route.ts` | POST signs in (sets an httpOnly cookie); DELETE signs out |
| `src/app/roi/login/page.tsx` | Login form |
| `src/app/roi/layout.tsx` | noindex metadata; wraps everything in `RoiShell` |
| `src/components/roi/roi-shell.tsx` | Header tabs, chat panel, CopilotKit provider (`runtimeUrl="/api/roi/copilot"`), chat labels |
| `src/components/roi/roi-agent.tsx` | **What the agent can see and do:** readables and actions, plus the generative-UI cards it draws in the chat |
| `src/lib/roi/prompt.ts` | The agent's instructions (tone, rules, input keys); includes `about.ts` and `guide.ts` |
| `src/lib/roi/about.ts` | ecoheart background (website, services, team), the shareable links (`RESOURCES`), and `EXPLAINER_VIDEO` |
| `src/lib/roi/guide.ts` | The how-to steps (`SITE_GUIDE`) and the page-aware suggestion buttons (`suggestionsFor`) |
| `src/app/roi/explainer/page.tsx` | Explainer tab: plays the video, or shows "coming soon" |
| `src/app/api/roi/copilot/route.ts` | Chat backend on Claude (falls back to OpenAI gpt-4o with no Anthropic key). Also strips thinking from the stream; see section 9. |
| `src/lib/roi/engine.ts` | **The calculator.** `computeRoi(inputs)` and `fmtMoney()` |
| `src/lib/roi/defaults.ts` | **Starting assumptions and cost model** (values, sources, confidence, owners, roles, run costs, offers) |
| `src/lib/roi/store.ts` | zustand state saved to browser localStorage (`ecoheart-roi-v1`): scenarios, compare, report draft, assumptions, cost model |
| `src/components/roi/ui.tsx` | Shared pieces: stats, basis pill, cost bars, mini scenario card, number field |
| `src/app/roi/page.tsx`, `model/page.tsx`, `report/page.tsx`, `proposal/page.tsx` | The four tabs |
| `public/roi/proposal.html`, `public/roi/img/*` | The proposal page and its images and video. These are gated too, because the middleware matches `/roi/*`. |

## 3. How the calculator works

`computeRoi()` in `src/lib/roi/engine.ts` takes 13 inputs:

| Key | Meaning | Unit |
|---|---|---|
| `prem` | Property insurance premium per year | $ |
| `credit` | Premium credit at renewal | % |
| `claims` | Small claims under the deductible per year | $ |
| `claimsCut` | Share of small claims avoided | % |
| `ded` | Wind and water deductibles per year | $ |
| `dedCut` | Share of deductibles avoided | % |
| `ot` | Emergency overtime and pumping per year | $ |
| `otCut` | Share of overtime avoided | % |
| `hrs` | Staff hours saved on insurer and grant reports | hours |
| `hourly` | Fully loaded staff cost per hour | $ |
| `fee` | ecoheart fee | $ |
| `grants` | Number of neighborhood micro-grants | count |
| `grantSize` | Size of each grant | $ |

The math:

- **today** = prem + claims + ded + ot
- **withAdvisor** = prem×(1−credit) + claims×(1−claimsCut) + ded×(1−dedCut) + ot×(1−otCut) + fee + grants×grantSize
- **staffValue** = hrs × hourly
- **spent** = fee + grants × grantSize
- **net** = today − withAdvisor + staffValue
- **saved** = net + spent
- **returnPerDollar** = saved ÷ spent
- **paybackMonths** = spent ÷ (saved ÷ 12), rounded, at least 1

Drivers are the five savings sources, sorted by size.

**How a scenario gets its inputs:** it starts from one column of the assumption library (`low` = Cautious, `expected`, `high` = Business case), and its own `overrides` win over that column. If you edit the library, every scenario that hasn't overridden that key changes too.

Known results with the default library, for checking your changes:

- Expected: **$378K net, $2.5 back per $1, 5-month payback**, $250K spent
- Expected with `credit: 2`: $297K net
- The business-case column reproduces Jerid's $1,042,500 figure (staff hours are 0 there, as in his total)

## 4. Where the numbers come from (model sources)

The starting values come from **Jerid's draft business case for Hollywood, FL (October 2026)**. Each assumption's `source`, `confidence` and `owner` are stored in `src/lib/roi/defaults.ts` and shown on the Model tab.

| Assumption | Cautious / Expected / Business case | Source | Confidence |
|---|---|---|---|
| Premium | $2.7M (all three) | Hollywood property insurance renewal, from the draft business case | high |
| Premium credit | 2% / 5% / 12.5% | Draft business case; to confirm with the broker | low |
| Small claims | $380K | City self-insurance program guidelines; draft business case | medium |
| Claims avoided | 20% / 40% / 100% | ecoheart estimate from upstream green infrastructure | low |
| Deductibles | $500K | City property insurance terms; draft business case | medium |
| Deductibles avoided | 20% / 45% / 90% | ecoheart estimate | low |
| Overtime and pumping | $220K | Public works storm-response costs; draft business case | medium |
| Overtime avoided | 15% / 35% / 80% | ecoheart estimate | low |
| Staff hours saved | 300 / 600 / 0 | Jerid's suggestion; not in the business-case total | low |
| Staff cost per hour | $65 | Typical municipal loaded rate; confirm with city HR | medium |
| ecoheart fee | $150K | Early partner project price | high |
| Micro-grants | 5 / 10 / 15 | Draft business case (15 grants) | medium |
| Grant size | $10K | Draft business case | medium |

The internal cost model (also in `defaults.ts`) has these parts:

- **Six roles, 1,032 hours in total.** The list rate is $200/hr and the internal rates are $85–$120/hr, so team cost is about $105K, or $206K at list rates.
- **Run cost of $875 a month:** hosting $85, database $50, AI usage $600, search and maps $100, monitoring $40.
- **Offers:**
  - ROI Snapshot, $35K
  - Early partner project, $150K for 12 weeks
  - Ongoing service, $70K a year for a mid-size city (range $50K–$90K)
- **Margin** is price − team cost − 3 months of running cost. At the defaults that is about 28%.

Related context lives in the project's shared files, not in this repo:

- `roi-advisor/v2/` holds the proposal source.
- The plan is a Claude Doc called "ROI Advisor internal view: plan".
- Sandrine's pricing workbooks had known errors. The Florida file was a copy of Flagstaff, the state tab had #VALUE!, and Year 2 and Year 3 re-billed one-time items. Don't copy numbers from them without checking.

**Password:** `eco` by default. Set `ROI_ACCESS_PASSWORD` on Render to change it; that also signs everyone out, because the cookie value is a hash of the password.

## 5. How the agent works

The model is Claude: `CLAUDE_MODEL` from `src/lib/llm.ts`, which is env `CHAT_MODEL`, default `claude-opus-5-5`. The same `ANTHROPIC_API_KEY` is used as the rest of the app. Without the key, the chat falls back to OpenAI `gpt-4o`.

The browser registers the agent's tools in `roi-agent.tsx` with `useCopilotAction`. Each action changes the zustand store and draws a card in the chat (`render`).

| Action | What it does |
|---|---|
| `createScenario(name, city, question, basis, overrides?, notes?)` | Adds a card, makes it active, opens the Workspace. Returns the calculated numbers for the agent to quote. |
| `updateScenario(id, name?, basis?, overrides?, resetKeys?, notes?)` | Merges overrides and recalculates |
| `compareScenarios(ids[])` | Shows 2 to 4 scenarios side by side |
| `updateAssumption(key, field, value)` | Edits the shared library (`low`, `expected`, `high`, `source`, `confidence`, `owner`) |
| `createReport(scenarioId, audience, summary, nextSteps[])` | Saves the agent's summary and opens `/roi/report` |
| `shareLinks(ids[], note?)` | Shows link cards with the ecoheart logo (website, services, story and team, contact, explainer, proposal, model, report, other site sections) |
| `showGuide()` | Shows the step-by-step "how to use this site" card |

Suggestion buttons under the chat come from `suggestionsFor(pathname, scenarioCount)` in `guide.ts`. They are fixed lists (no AI call), change by tab, and always include "How do I use this site?" and "What can you do?".

Readables (what the agent sees): the current page, the assumption library, every scenario with its calculated results, which scenario is active and which are compared, and the internal cost model.

Rules in `prompt.ts`, which you must keep:

- The agent never does the math; it calls actions and quotes their results.
- It speaks plainly and human-first, with no jargon.
- It is honest about low-confidence numbers.
- It never claims ecoheart has pilots or a finished platform. We offer early partner projects shaped with a city.

## 6. Common changes (recipes)

**Change a starting assumption or its source.** Edit `DEFAULT_ASSUMPTIONS` in `src/lib/roi/defaults.ts`. Browsers that already saved state keep their old values until someone clicks "Reset to starting values" on the Model tab. To force new defaults on everyone, bump the persist key in `store.ts` (`ecoheart-roi-v1` to `-v2`); that also wipes saved scenarios.

**Add a new value driver** (for example, "heat-day overtime"):
1. In `engine.ts`, add the key(s) to `InputKey`, add a line to `lines`, and add a driver to `drivers`.
2. In `defaults.ts`, add an `Assumption` with all three columns, a source, a confidence and an owner.
3. In `roi-agent.tsx`, add the key to `INPUT_KEYS` with a plain description.
4. In `prompt.ts`, add the key to the list of override keys.
5. In `ui.tsx`, give the key a bar color in `CostBars`; add a legend entry in `src/app/roi/page.tsx`.
6. Bump the persist key in `store.ts` (old saved state lacks the new key).
7. Re-check the "known results" in section 3, or update them here.

**Change the cost model or prices.** Edit `DEFAULT_ROLES`, `DEFAULT_RUN` and `DEFAULT_OFFERS` in `defaults.ts`. The margin formula is `costTotals()` in `store.ts`.

**Change what the agent says or how it behaves.** Edit `src/lib/roi/prompt.ts`. To give it a new ability, add a `useCopilotAction` in `roi-agent.tsx` with `handler` (change the store and return JSON) and `render` (a small card).

**Change the model.** Set `CHAT_MODEL` on Render; this also changes the main chat agent. To change only the ROI chat, change `model:` in `src/app/api/roi/copilot/route.ts`.

**Update the proposal page.** Replace `public/roi/proposal.html` (a full HTML document with noindex) and the images in `public/roi/img/`. Keep images small (well under 200 KB each, ideally); the free Render plan has 512 MB.

**Publish the explainer video.** Put the MP4 at `public/roi/explainer.mp4` (keep it small: about 720p and under 20 MB, because the free plan has 512 MB of memory), then set `EXPLAINER_VIDEO.ready = true` in `src/lib/roi/about.ts`. The Explainer tab then plays it, and the Advisor's link card stops saying "coming soon". The file is password-protected like everything under `/roi`.

**Update what the Advisor knows about ecoheart.** Edit `ECOHEART_CONTEXT` and `RESOURCES` in `src/lib/roi/about.ts`. Source: www.ecoheart.ai (home, /services, /story).

**Add a tab.** Add the page under `src/app/roi/<name>/page.tsx` (a client component) and add it to `TABS` in `roi-shell.tsx`. It is password-protected automatically.

## 7. Test before every push (required)

Ahmed's rule: test a **production build** locally and check the real behavior, not only that pages load.

```bash
cd ~/Repos/eco-agent/eco-agent-poc
npx tsc --noEmit -p .                  # types
rm -rf .next/cache/webpack             # see gotcha 9.2 if you added new files/classes
npm run build && npx next start -p 3123
```

Then check all of these:
1. `curl -s -o /dev/null -w '%{http_code}' localhost:3123/roi` returns **307** (sent to login).
2. `/`, `/systems-modeler` and `/demo` return **200** with no password.
3. Log in with `eco`. Workspace, Model, Report and Proposal all render with styles; check a screenshot.
4. In the chat, ask: "What does Flagstaff, AZ get back if the insurance credit is only 2%?" A new card marked **"from chat"** should appear, at **$297K net**.
5. Ask for a report for a city manager. The page should switch to `/roi/report` with the agent's summary.
6. Images and the hero video load on the Proposal tab.

Headless check on the Mac: playwright-core is installed in `/tmp/pwtest`, with Chromium at `~/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`. Log in by filling `#roi-password`. Type into `.roi-chat textarea` and press Enter. Wait up to 60 seconds for `text=from chat`.

## 8. Deploy

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
- After it goes live, repeat checks 1, 3 and 4 from section 7 on https://eco-agent-poc.onrender.com.

## 9. Gotchas we already hit

1. **Middleware location.** Next only loads `src/middleware.ts` in this project; the root `middleware.ts` (a Supabase session refresh) has never run. Put gate logic in `src/middleware.ts` and keep its `matcher` limited to `/roi` and `/api/roi`, so the rest of the app stays open.
2. **Missing Tailwind styles after adding files.** The webpack cache reused old CSS, so new classes (layout, colors, the chat sidebar) silently disappeared in the production build. Run `rm -rf .next/cache/webpack` before building.
3. **Chat cards silently missing with Claude.** CopilotKit 1.53 runs Anthropic through its AI SDK agent. It turns Claude's thinking into an empty "reasoning" message, and the client then drops the tool call that follows: no card and no reply, with no error shown. Opus 5.5 rejects `thinking: disabled`. The fix is in `route.ts`: a custom `fetch` on the Anthropic client removes `thinking` and `redacted_thinking` blocks from the response stream. Keep it unless a CopilotKit upgrade fixes this; after any upgrade, re-run check 4 in section 7.
4. **The adapter's own settings are mostly ignored.** The runtime builds its own model from the adapter's `getLanguageModel()` (model name plus the client's fetch). Overriding `process()` or `max_tokens` on the adapter has no effect.
5. **CopilotKit inspector popup.** It is hidden with `showDevConsole={false} enableInspector={false}` on `<CopilotKit>`.
6. **Saved state is per browser.** There is no shared storage yet (Supabase tables `roi_assumption_sets` and `roi_scenarios` are planned). Clearing site data resets everything.
7. **The chat's `instructions` never reach the model.** CopilotKit 1.53's built-in agent drops system messages, which is how `<CopilotChat instructions>` is sent. The Advisor's role, rules, ecoheart background and how-to guide are passed as a `useCopilotReadable` in `roi-agent.tsx` instead. Put new behavior rules in `prompt.ts`, `about.ts` or `guide.ts`, and they flow through that readable.
8. **Login must not start the chat.** `RoiShell` skips CopilotKit on `/roi/login`, because the API is behind the gate.

## 10. Messaging rules (for anything the agent or pages say)

- Ecoheart is a **platform**; never call it a pilot, and never claim existing pilots.
- The full platform isn't built. Frame work as **early partner projects** co-developed with a city.
- Be human-first: AI is an accelerator, not a replacement, and there is no jargon.
- Lead with city ROI and how funds get allocated.
- Marcia Drake is the only person named in public material.
- Stakeholder-facing visuals follow ecoheart.ai's style: DM Sans plus italic Playfair headings, slate ink, teal #0D9488 and paper #F7F6F2.

## 11. Planned next steps

- Shared storage in Supabase, so the team sees the same scenarios.
- An explainer video for the internal team (Higgsfield, narrator Julian).
- An evidence search action (find sources for an assumption) and a "what would change this" sensitivity view.
- A city-facing version later, without the cost model tab.
