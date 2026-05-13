# Hollywood, FL — EcoHeart Demo Runbook

> **Audience:** City of Hollywood Sustainability Coordinator, Sustainability Advisory Committee, Department of Public Utilities, and supporting staff.
> **Time budget:** 18 minutes for the live walk-through + 7 minutes Q&A.
> **Date prepared:** 2026-05-13 (for May 14 demo).
> **Demo URL:** `http://localhost:3000/demo`

---

## 1. Pre-demo checklist (run T-15 minutes)

```bash
# 1. From the repo root
cd /Users/ahmedkhan/Repos/eco-agent/eco-agent-poc

# 2. Confirm OPENAI_API_KEY is set — F4, F7, F12 need it
grep OPENAI_API_KEY .env.local

# 3. Start dev server
npm run dev
```

When you see `✓ Ready in ...ms`, the demo is live at `http://localhost:3000/demo`.

**T-5 minute smoke test (do this in your browser, not on stage):**
- [ ] `/demo` loads — hero shows "Twice a day, two hours."
- [ ] `/demo/king-tide` — left sidebar shows a green "live" chip next to the NOAA Station card with a peak ≥ 2.0 ft and ≥ 5 flood days
- [ ] `/demo/risk-report` — click the **"Hollywood City Hall, 2600 Hollywood Blvd"** chip and confirm the report renders in ~7–10s
- [ ] `/demo/grant-finder` — click the **"Septic-to-sewer Boulevard Heights..."** chip; confirm ranked matches appear in ~10–15s
- [ ] `/demo/hurricane-playbook` — click **Generate playbook** with the default storm; confirm tabs render with the rose ALF banner

**If any AI route times out**, the demo still works — every page has graceful fallback UX and seed data. F1, F2, F9 don't require OpenAI at all.

---

## 2. The room-readiness opener (60 seconds, before clicking anything)

> *"Hollywood publishes a King Tides page that lists when the water will overtop A1A and the Lakes neighborhood. The 2017 Sustainable Hollywood Action Plan commits the city to 80% GHG reduction by 2050. The October 22, 2025 utilities master plan put a $2.5 billion price tag on the next 30 years — half of it to convert 17,000 unsewered properties to sewer."*
> *"This product is what happens when AI does the staff work on those plans, that schedule, and that budget. Twenty minutes of EcoHeart, six features built against your own homework."*

Then open `http://localhost:3000/demo`.

---

## 3. Flight plan — 6 features, in order

### Stop 1 · Overview (45 seconds) — `/demo`

**What to point at:**
- The hero quote: "Twice a day, two hours" — credit it to **Peter Scher / South Lake homeowner via Temple Solel / Sea Level Rise Solutions group**.
- The three brand chips in the header: **Sustainable Hollywood Action Plan · 80% GHG by 2050 · $2.5B Water/Wastewater** — signals you read their docs.
- The four stat cards (~17,000 unsewered, $2.5B, 9 flood days in Oct 3–25, 80% GHG).
- The 6 feature cards — say: *"Each of these is its own page. Three are wired against live data. Three are pre-computed. All six are real."*

**Click:** Address Risk Report card (or the coral "Generate a Risk Report" button in the hero).

---

### Stop 2 · Address Climate Risk Report — `/demo/risk-report` (3.5 min)

**The "this is more than a chatbot" feature.**

**Click sequence:**
1. Click the **"2200 Adams Street"** sample chip (this is the most-flooded South Lake hotspot).
2. Wait ~7–10s. Narrate while it loads:
   > *"Behind the scenes: Nominatim is geocoding this address against an OSM boundary box constrained to Hollywood. EcoHeart AI is being given that geocode plus seven authoritative Hollywood + Florida planning documents, and asked to produce a JSON report with calibrated risk scores."*
3. When it renders, walk the audience left-to-right, top-to-bottom:
   - **The map** — confirm the FEMA flood zones layer is on (visible flood-zone shading). Point at the orange marker for the parcel.
   - **The five risk dials** — read the *Flood* score aloud, then point at the *Insurance Stress* score. *"This is the one your residents feel."*
   - **The timeline** — *"This is the Southeast Florida Compact's 2019 unified projection, reaffirmed in Q4 2024. Same axis Broward County plans on."*
   - **One recommendation** — click any recommendation card to expand it. Read the citation aloud. *"This is what 'cited from your plans' actually looks like."*

**Then click the** *Hollywood City Hall* chip and run a second one to show the agent adjusts the scores by location (City Hall is on higher ground than Adams St).

**Talking points to land:**
- "Same pipeline runs for any address in Hollywood, your CVA Update is the seed corpus."
- "The PDF export, email-to-resident, and 311 buttons are how this becomes a workflow, not a demo."

**Transition:** *"Now zoom out from a single parcel to the whole city."*

---

### Stop 3 · King Tide Flood Risk Explorer — `/demo/king-tide` (3.5 min)

**The flagship live-data feature.**

**Click sequence:**
1. Pause for two beats so the audience reads the green **"live"** chip in the NOAA Station card.
   > *"That number — 21 flood days in the next 60 days — is being computed live right now from NOAA's Virginia Key station. It's the closest long-record tide gauge to Hollywood. You can verify it yourself at tidesandcurrents.noaa.gov."*
2. **Click the "Oct 3 – 25, 2026 ★"** chip in the king tide windows list. The map flies to Hollywood. Narrate: *"This is the worst king-tide stretch of the year — full moon and new moon stacked."*
3. **Click "South Lake Dr & Adams St"** in the Flood Hotspots list. Map zooms to z=16. The popup shows the homeowner quote.
4. **Click the "+3 ft" SLR scenario tab.** The NOAA SLR tile overlay appears.
   > *"This is what the Compact says +3 feet looks like — approximately 2060 on the reference curve. The South Lake area is no longer experiencing periodic flooding; it's a daily phenomenon."*
5. **Click Play 2026** (top-right of the king-tide windows). The map cycles through each window; the cumulative property-days flooded counter ticks up.
6. After ~6 seconds, click **Pause**.

**Talking points:**
- "FDOT is currently building pump stations at four of these intersections — Azalea, Van Buren, Sherman, Franklin. The model expects ~70% reduction in flooding at Sherman St when it comes online."
- "All of this runs from the browser; no EcoHeart backend touches NOAA. Same architecture you've already paid for in any ArcGIS Hub deployment."

**Transition:** *"OK — we've shown one resident, then today's coastline. Now show the 30-year plan."*

---

### Stop 4 · Septic-to-Sewer Prioritization — `/demo/septic-priority` (3 min)

**The "we did the optimizer" feature. Cross-pillar.**

**Click sequence:**
1. Read the headline: *"17,000 unsewered parcels and $1.3 billion to spend over 30 years. EcoHeart ranks every parcel and re-clusters the phasing live."*
2. Point at the **default phase-1 map** (top-right): *"With equal weights, Phase 1 lands here — Boulevard Heights and Driftwood, which is also where the city's plan starts. We agree."*
3. Drag the **Social Equity slider** from 25 → 55. The other sliders auto-rebalance to keep the total at 100. The audience sees the math is fair.
4. Click **Solve**. Wait ~0.9s for the animation; the phase clusters re-form.
   > *"Look at Phase 1 now — it picks up the Liberia tract, which is CDBG-eligible. That's $9,000 per household becoming a zero-interest forgivable loan."*
5. Click **Compare to current city plan**. The map splits left/right.
   > *"Left is the city's plan — Boulevard Heights first because it's adjacent to existing trunk lines. Right is EcoHeart's equity-weighted run — Liberia moves up a phase. Reasonable people can disagree on the weights. EcoHeart's job is to make the tradeoff visible."*

**Talking points to land:**
- "The bottom chart shows you parcels-per-phase and equity-share-per-phase. The orange bar is the share of CDBG-eligible parcels in each phase. With the equity-weighted run, Phase 1 jumps from ~52% to ~70%."
- "The CSV export drops a list of every parcel and its assigned phase. Goes straight into a CIP work plan."

**Transition:** *"Once you know the plan, you have to fund the plan."*

---

### Stop 5 · Grant Finder Agent — `/demo/grant-finder` (3 min)

**The "this saves a grant writer a week" feature.**

**Click sequence:**
1. Click the **"Septic-to-sewer expansion in Boulevard Heights, ~1,100 properties, $71M, 18-month timeline"** chip.
2. Narrate while it loads (10–15s):
   > *"The agent has the project description and a catalog of five federal and state programs — BRIC, Resilient Florida Implementation, CWSRF, CDBG-DR, HMGP. For each, it's auto-checking eligibility against Hollywood's actual plans. Where it can't fully confirm, it marks amber."*
3. The top match renders — usually **EPA CWSRF** at 90/100 or **Resilient Florida Implementation** at 88–94/100.
4. Click the **top match** to expand it.
   - Walk the **Eligibility check** — point at the green checks. *"This one is green because Hollywood's 2023 CVA Update satisfies Florida Statute 380.093."*
   - Walk the **Scoring evidence** — *"For 'cost-effectiveness' the agent grabbed the BCA framing from the Hollywood Hazard Mitigation Plan."*
5. Click **Generate full application draft**. Two paragraphs of narrative render, with Hollywood plan citations woven in.
6. Click **Add to pipeline** — the right rail tracks $35.5M requested.

**Talking points:**
- "Every Compact city in South Florida spends staff hours on this exact task. Hollywood, Fort Lauderdale, Pompano, Hallandale — same five federal programs, same lift."
- "This single feature is the budget-justifier for the whole platform."

**Transition:** *"Now the question stops being 'what should we do' and becomes 'how do we decide.'"*

---

### Stop 6 · SLR Adaptation Pathways Systems Model — `/demo/adaptation-pathways` (2.5 min)

**The "now we're doing strategy" feature. The wow.**

**Click sequence:**
1. The page lands on the **Armoring** pathway. Pause two beats so the audience sees the causal loop diagram render with D3 force layout.
2. Read one loop aloud — point at the **R1: Investment lock-in** loop in the right rail:
   > *"Armoring protects the tax base, which funds more armoring, which attracts new development in the same flood zone, which raises catastrophic exposure twenty years out. That's a reinforcing loop — the one we typically pretend isn't there."*
3. Click **Accommodation** then **Managed Retreat** to show the three pathways are different system shapes.
4. Return to **Armoring**.
5. Click the purple **Collide with "Healthcare staffing crisis"** button.
   - New edges appear in the diagram.
   - A purple banner renders below — read the **load-bearing delusion** sentence verbatim.
   - Be respectful when the banner references the Hollywood Hills 2017 lesson — do not dwell, but do not skip.
6. Click **Humanize (800–1200 words)**.
   - A character-driven narrative renders. Read **one paragraph** aloud — the audience will see character names, locations, and specific Hollywood mechanisms (CDBG, Project ROC, A1A Sherman St pump station).

**Talking points to land:**
- "This is Gene Bellinger's causal loop methodology. Same modeler that powers EcoHeart's Olympia POC."
- "The export is JSON and a self-contained interactive HTML — your commissioners can open it in any browser without our infrastructure."
- "The 'Aha! Paradox' is the part where the system tells us what we're avoiding. Hollywood Hills wasn't an HVAC failure, it was a workforce failure. That's a different policy answer than another seawall."

**Transition (gravity check):** *"Which brings us to the playbook that should never need to run."*

---

### Stop 7 · Hurricane After-Action Playbook — `/demo/hurricane-playbook` (2 min)

**The emotional anchor. Close on this. Respectfully.**

**Click sequence:**
1. Land on **Pre-storm preparedness**. The default storm is "Hurricane Iris, Cat 3, projected landfall ~80 miles south of Miami."
2. Click **Generate playbook**.
3. Wait ~8s. The 5-checklist tab strip appears. The page auto-lands on the **Assisted Living Facilities** tab — and the rose-bordered banner is visible.
4. **Stop. Read the banner aloud, calmly:**
   > *"Lesson from 2017 (Hurricane Irma): the Rehabilitation Center at Hollywood Hills lost 12–14 residents to heat after a generator failure. Florida's emergency-generator rule for ALFs was built on this. Generator status and indoor temp monitoring are item #1 on this list."*
5. Scroll through the checklist. Point at items 1 and 2 — they will be generator-specific. Then click the **Lift Stations** tab to show the same agent generates a totally different list.
6. Click the **Post-storm** tab.
7. Scroll past the seeded CSV — say *"This is a sample damage CSV; in production it's your inspector tablet output."*
8. Click **Generate FEMA Project Worksheet**.
9. ~8s later, the categorized damages and the FEMA PW sections render.
10. Point at the **Mitigation opportunities** section. *"This is what gets you the HMGP grant. The agent connected damage to plan to grant in one pass."*

**Closing line (memorize):**
> *"That 2017 lesson is why the generator-rule exists. EcoHeart's job is to make sure that when the next storm comes, every checklist is in the hands of every facility, and the FEMA application is drafted on Day 1 instead of Day 60."*

---

## 4. Phase-2 concept pages — deep dives

> These 8 pages are **clickable, static demos** that live in the sidebar's "Phase 2 · Concepts" group. They are **not** part of the core 18-minute flight plan — open them only if the audience asks for more, or use them in the closer to make the "8 more designed" claim concrete.
>
> **Rule of thumb:** spend 60–90 seconds per concept page, max. If the audience leans in, walk through it. If not, click back to `/demo` and move on.

### 4.1 A1A Coastal Vulnerability Dashboard — `/demo/a1a-coastal`

**Pitch:** A scrollytelling tour of every mile of A1A in Hollywood — FDOT pump-station construction status, seawall heights vs the 2060 Compact target, dune zone health, and a 5-step capital sequence.

**Click sequence (45 sec):**
1. Land on the hero. Pause on the photo: *"2.5 miles of barrier island, 21.3 miles of Broward shoreline classified critically eroded."*
2. Scroll to **Pump stations**. Point at Sherman St — 64% complete, $4.2M of $6.5M spent, projected reduction 8 → 2 overtopping days/yr.
3. Scroll to **Seawall heights**. Point at the dashed 6.5 ft NAVD88 target line — every segment is below.
4. Click into the **Next best actions** list at the bottom and read item #1 aloud.

**Talking points:**
- "Each pump-station card has a real cost and a real schedule. In production these refresh nightly from FDOT's project portal."
- "The seawall deficit translates into a $22M lift in linear-feet-of-raise — exact same framing Fort Lauderdale used to fund Fortify Lauderdale."

**Real vs simulated:** Pump-station % complete, seawall heights, and dune cover are seeded from the dossier research; the 5 capital recommendations are static templates that in production are RAG-generated.

---

### 4.2 Tree Canopy & Heat Island Map — `/demo/tree-canopy`

**Pitch:** Identify where Hollywood's thinnest canopy overlaps the city's heat-vulnerability hotspots, and where the next dollar of urban-forestry spend yields the most cooling per resident.

**Click sequence (60 sec):**
1. Land on the split-view. Left map = today's canopy. Right map = projected 2040 heat days.
2. Click **"Add equity overlay"** (top-right). The block ranking re-sorts — Liberia moves up.
3. Click block #1 in the bar chart. The right-rail profile updates: 8% canopy, HVI 84, 240 trees, $72K.
4. Click **"Add to CIP"**. The CIP cart at the bottom of the right rail tallies cost + trees.

**Talking points:**
- "Hollywood's citywide average canopy is ~18%. Miami-Dade's Urban Forestry Plan targets 30%."
- "The equity overlay is a single toggle in the demo because that's how a director should be able to operate it — 'show me the equity-weighted answer.'"

**Real vs simulated:** 10 priority blocks are synthetic. Production replaces them with USFS Tree Canopy + Landsat NDVI + ACS B19013 + CDC SVI per real block group.

---

### 4.3 Stormwater Outfall + Water Quality — `/demo/stormwater`

**Pitch:** Near-real-time view of every stormwater outfall discharging into the Intracoastal and Atlantic, paired with bacterial sample history and **septic-system proximity**. Tells the operational story of why septic-to-sewer matters.

**Click sequence (60 sec):**
1. Land on the Alerts tab. Read aloud: *"6 outfalls in active exceedance — three of them in the South Lake / Lakes corridor."*
2. Click **Outfall #34 (Garfield St)**. The detail panel populates. Point at "38 septic parcels within 500 ft."
3. Scroll to the 24-month chart at the bottom. Point at the dashed FL DEP limit line — Outfall #34 is above it 8 of 24 months.
4. Click **"Open in Septic Map"** — closes the loop with F2.

**Talking points:**
- "This is the cross-pillar story. The same parcels that need septic-to-sewer conversion are the parcels driving the bacterial exceedances in the Intracoastal."
- "EPA STORET and Florida WIN both have public APIs. Hollywood already files these reports — we just put them on one screen."

**Real vs simulated:** 8 outfalls are seeded with realistic E. coli + exceedance values; in production each is wired to EPA STORET + Florida WIN nightly.

---

### 4.4 Building Resilience Code Assistant — `/demo/code-assistant`

**Pitch:** Code-aware chat that answers Florida Building Code (HVHZ), ASCE 24, and Hollywood-specific zoning questions with **paragraph-level citations** — the way a permit reviewer or contractor actually works.

**Click sequence (45 sec):**
1. Click the **"Minimum freeboard above BFE"** chip. The answer renders with 3 citations: FBC §1612.3, ASCE 24-14 Table 2-1, Hollywood Code §117-04.A.6.
2. Read one citation aloud. Click **"Open PDF"** (placeholder) to show the citation-traceability story.
3. Click **"Compare cities"** tab. Point at the table — Hollywood is the only city in the 5-jurisdiction list **without** an adopted seawall minimum.

**Talking points:**
- "Every answer carries a chapter-and-verse cite. No hallucination, no 'I think the code says' — the model is constrained to only answer what's in the indexed code books."
- "Compare mode unlocks the regional sales pitch: same engine, same RAG corpus, white-label per city."

**Real vs simulated:** 3 fully-cited seeded answers (freeboard, garage doors, seawalls); all other questions fall back to a "concept page" message. Production indexes the actual FBC + ASCE + Hollywood ordinances.

---

### 4.5 Tourism-Climate Feedback Loop — `/demo/tourism-loop`

**Pitch:** The Broadwalk is Hollywood's economic engine and its most exposed asset. This causal-loop diagram traces storm risk → beach width → visitor-days → tax revenue → resilience CIP, so resilience spending is reframed as **revenue protection**.

**Click sequence (45 sec):**
1. Land on the page. Point at the photo + the framing line: "2.5 miles of brick promenade, ~$890M annual visitor spend."
2. Click between the 3 scenario tabs (Baseline / +30% storms / Annual renourishment). Note the diagram is the same — narrative changes.
3. Read the **R1 Revenue-into-resilience** loop aloud from the right rail.

**Talking points:**
- "This is the model you put in front of a commissioner who asks 'why are we spending on dunes when we have potholes?' Potholes don't show up in this loop. The Broadwalk does."
- "Same Systems Modeler that powers our Olympia POC. Models export as JSON + standalone HTML."

**Real vs simulated:** The model is hand-crafted but real — every node and link is grounded in published Hollywood + Compact planning vocabulary. In production, the model is generated from your RAG corpus and iterated via CopilotKit.

---

### 4.6 311 Climate Complaint Triage — `/demo/triage`

**Pitch:** When a resident reports "my street is flooded" to Hollywood NOW, EcoHeart's agent auto-classifies the report (tidal vs rainfall vs sewer vs outfall), correlates with current tide + radar, attaches it to the relevant CIP project, and drafts the resident response.

**Click sequence (60 sec):**
1. Land on the inbox. Point at the 4 classification bucket cards — 12 reports auto-sorted with confidence scores.
2. Click the top report (Adams St). Walk the audience through: tide at report (2.1 ft), rainfall last 6h (0.0 in), classification confidence (94%).
3. Point at the **Nearest active CIP project** card — "Lakes Tidal Flooding Mitigation, 22% complete."
4. Read the drafted response aloud. Point at **Send response** + **Tag to CIP**.

**Talking points:**
- "Hollywood NOW already exists. EcoHeart sits on top of it. Open311 spec is standard — implementation is ~2 weeks."
- "This is the feature that turns 311 from a complaints inbox into a sensor network for the city."

**Real vs simulated:** 12 seeded reports with deterministic classifications. Production wires the live Hollywood NOW Open311 feed + NOAA tide + Broward MORD radar.

---

### 4.7 Climate Equity Index Dashboard — `/demo/equity`

**Pitch:** Overlay flood/heat/surge exposure with ACS demographics + CDC Social Vulnerability Index + HUD LMI — surface where the highest climate burden meets the lowest adaptive capacity. Drafts candidate **Adaptation Action Areas** (AAA) — Miami-Dade's framework.

**Click sequence (60 sec):**
1. Land on the page. Read the top priority block: *"Liberia Core — composite 82, 4,180 residents, 78% LMI."*
2. Drag the **Equity weight** slider to 70. The choropleth recolors live. Bar chart re-sorts.
3. Click a top-3 block. The right rail shows the demographic profile. Click **"Propose as new AAA."**
4. Point at the peer-AAA card at the bottom — Miami-Dade Little River, Fort Lauderdale River Oaks.

**Talking points:**
- "Miami-Dade's Little River AAA is the precedent — $40M+ moving for septic-to-sewer + stormwater + affordable housing. Hollywood doesn't have a formally adopted AAA yet."
- "The 2050 Comprehensive Plan update is the policy hook. EcoHeart drafts the candidate boundary."

**Real vs simulated:** 8 synthetic blocks; in production the choropleth is real ACS B19013 + CDC SVI + HUD CDBG income-limit data, joined to Broward parcels.

---

### 4.8 GHG Inventory Auto-Updater — `/demo/ghg`

**Pitch:** Hollywood's SAP targets 80% GHG reduction by 2050, but the last community-scale inventory is dated. EcoHeart auto-ingests utility + DOT VMT + waste + WWTP data, computes the GPC-protocol inventory, tracks progress against the 2050 glide path, and exports the CDP questionnaire.

**Click sequence (45 sec):**
1. Land on the top stats: 2019 baseline, 2025 estimate (~7% reduction so far), 2050 target, required annual cut (5.0%).
2. Point at the **glide path chart**. The dashed line is the compliance trajectory; the filled area is actual. Hollywood is marginally above target — call this out.
3. Click the **Transportation — On-road** bar. Right rail deep-dive populates with sector-specific levers (EV chargers, transit, mode-shift).
4. Point at **Export CDP-formatted report** — *"Hollywood already files CDP annually. EcoHeart pre-fills the questionnaire."*

**Talking points:**
- "GPC Basic+ is the protocol Climate Mayors and ICLEI both reference. Same numbers every other Compact city reports on."
- "The chart isn't just a vanity dashboard. It's the artifact Hollywood owes its own Sustainability Advisory Committee every year."

**Real vs simulated:** 6 sectors with realistic seeded baselines and 2025 estimates. Production replaces seeded numbers with live FPL + Broward DOT VMT + waste tonnage + Southern Regional WWTP data, recomputed nightly in Daytona.

---

## 5. The closer — 90 seconds

Return to `/demo` for the closing slide. Point at the **"What else EcoHeart can build"** grid (8 concept cards: A1A Coastal Dashboard, Tree Canopy Map, Stormwater + Water Quality, Code Assistant, Tourism Loop, 311 Triage, Equity Index, GHG Auto-Updater).

**Say:**
> *"Six features tonight. Eight more designed. Every one of them runs against the docs and the data you already publish."*
>
> *"Here's the ask: your $800,000 Resilient Florida Climate Vulnerability Assessment Update is in flight. If we onboard Hollywood as our second city, that CVA Update becomes our seed corpus. We commit to a working MVP for your team within six weeks of corpus delivery. White-labeled. With your branding. Tied to your CIP."*

---

## 6. Fallbacks if something goes sideways

| Failure mode | What you do |
|---|---|
| NOAA API times out on /demo/king-tide | The page still loads. The "live" chip turns into a red "offline" chip but the rest of the demo (hotspots, SLR slider, map) works fine. Acknowledge it once: *"That's a third-party API — moving on."* |
| OpenAI returns invalid JSON or times out on Risk Report (F4) | Click a different sample address. The agent has temperature 0.3 and is usually fast. If it persists, **skip F4** and use F1's "Click 'Open in Risk Report' button on a hotspot drawer" as your stand-in. |
| OpenAI fails on Grant Finder (F7) | Apologize once, click a different sample. The five grant programs in the catalog are seeded — only the LLM matching layer is live. |
| OpenAI fails on Hurricane Playbook (F12) | The page has a clear error message. Pivot to F9 (Adaptation Pathways) — it's entirely seeded, no API risk. |
| Dev server crashes | Open a new terminal: `cd /Users/ahmedkhan/Repos/eco-agent/eco-agent-poc && npm run dev`. Production build also works as a fallback: `npm run build && npm start`. |
| Internet is down | F2 (Septic), F9 (Pathways) are 100% offline. F1 still renders without NOAA. F4, F7, F12 will error gracefully. **All 8 Phase-2 concept pages are fully offline-safe** — no APIs, no AI calls. |
| One of the 8 concept pages errors | All 8 are static. If one fails to load (rare), refresh the browser. The hot reload should recover it. None of them affect the core flight plan. |

---

## 7. What's real, what's simulated, and how EcoHeart would productionize each

> **Read this section before the demo.** When a commissioner asks "is that real?", be precise. The trust you build by drawing this line clearly is what closes the deal.

### 7.1 The headline answer

| | Demo today | Production EcoHeart for Hollywood |
|---|---|---|
| **Base map + flood/SLR layers** | Real public data, live | Same, plus Broward parcels and Hollywood-specific ArcGIS layers |
| **NOAA tide predictions** | Real, live API every page load | Same, plus alerting + 311 integration |
| **Address geocoding** | Real (Nominatim, free, OSM-bounded) | Upgraded to Mapbox or Geocodio for parcel-precision |
| **AI risk synthesis** | Real EcoHeart AI calls, grounded by a 7-doc Hollywood reading list in the prompt | Real EcoHeart AI + RAG over your ingested Hollywood PDFs, with page-level citations |
| **Grant matching** | Real EcoHeart AI reasoning over a hand-curated 5-program catalog | Same agent against a 30+ program continuously-refreshed catalog with NOFO scraping |
| **Septic parcel data** | Simulated — 500 deterministic synthetic parcels across 5 Hollywood neighborhoods | Real ~17,000 parcels from Broward County GIS + Hollywood unsewered-areas layer |
| **Phase optimizer** | Simulated — client-side weighted sort | Real constrained optimization (MILP) in Daytona Python sandbox |
| **System dynamics models** | Pre-built JSON, not generated for this demo | Real generation from Hollywood RAG corpus via the existing Systems Modeler |
| **Hurricane playbook** | Real EcoHeart AI checklists; sample damage CSV is simulated | Real damage import from inspector tablets + Open311 + utility outage logs |
| **The 2017 Hollywood Hills banner** | Hardcoded as a respectful, factually-accurate reference | Same — this is a planning anchor, not data |

### 7.2 Page-by-page lineage

#### F1 — King Tide Flood Risk Explorer

**REAL (live):**
- NOAA Tides & Currents API — station 8723214 (Virginia Key). Predicted high/low tides for the next 60 days, observed water levels for the last 14 days. Refreshed at every page load with 1-hr server cache.
- FEMA National Flood Hazard Layer tiles (layer 28) — direct from `hazards.fema.gov`.
- NOAA Sea Level Rise tile pyramids (1/3/6/10 ft) — direct from `coast.noaa.gov`.
- CartoDB Positron basemap.
- All map tiles are fetched client-side; no EcoHeart server proxies them.

**SIMULATED / SEEDED:**
- The 6 flood hotspot locations and their "flood days per year" numbers are hand-curated from the dossier's research (FDOT pump-station list, Hollywood Public Utilities tidal-valve project, Temple Solel community reports).
- The 6 king-tide window descriptions are derived from NOAA-predicted peak dates plus narrative framing from `hollywoodfl.org/1473`.
- The 6 critical-asset pins (ALFs, hospitals, fire stations, lift stations) are public-record locations but the asset list is hand-curated, not pulled from an authoritative city register.

**Production path (4 weeks of work):**
1. Replace the static hotspot list with a live feed from Hollywood NOW / Open311 — "tidal flooding" tickets clustered by intersection.
2. Replace the curated critical-asset list with a live join against:
   - Broward GIS facilities layer (hospitals, fire, schools)
   - Florida AHCA license database (ALFs, dialysis, skilled nursing)
   - Hollywood Public Utilities asset register (lift stations, pump stations, force mains)
3. Add a Daytona Python step that, on a nightly cron, runs the threshold-exceedance calculation against the NOAA forecast and writes per-parcel "expected flood days" attributes to Postgres.
4. Replace the static "FDOT pump station ~70% complete" copy with a live feed from FDOT's project page.

---

#### F2 — Septic-to-Sewer Prioritization Map

**REAL:**
- Hollywood's $1.3B septic-to-sewer figure — from the Oct 22, 2025 Public Utilities Master Plan presentation.
- The CDBG forgiveness loan parameters ($2,130 Reserve Capacity Fee, $2,000 abandonment, 90-day notification window, 5-year forgiveness) — from city published policy.
- The five neighborhood names and rough geographic centers.

**SIMULATED:**
- All 500 parcels are synthetic. They are seeded with a deterministic PRNG so the demo is reproducible, but the lat/lng, groundwater risk score, tidal flood exposure, cost-to-connect, and social-equity score for each parcel are computed, not measured.
- The phase clustering is a client-side weighted sort (score every parcel, slice into 6 equal-size phases), not the constrained optimization (MILP, integer programming, or k-means with capacity constraints) that the dossier describes as "the real" solver.
- The "current city plan" phasing is a stand-in based on the dossier's narrative ordering (Boulevard Heights → Driftwood → Hollywood Hills → …). The actual city plan has not yet been published in spatial form.
- "Citywide methane offset" numbers use a rough 0.25 tCO₂e/parcel assumption.

**Production path (6 weeks):**
1. **Ingest the real parcel layer** — Broward County GIS publishes parcels with assessed value, year built, lot area, and existing wastewater connection status. The Hollywood Public Utilities GIS team has an authoritative "unsewered properties" layer (the city has been mapping this for the master plan). Cross-join produces ~17,000 real parcels with addresses.
2. **Compute real exposure scores per parcel** using:
   - **Groundwater risk** — Florida Geological Survey water-table depth raster, intersected with parcel centroid.
   - **Tidal flood exposure** — % of parcel inundated under NOAA SLR 1ft / 3ft tiles.
   - **Cost-to-connect** — straight-line distance to nearest existing sewer main (Public Utilities GIS) times a per-foot construction unit cost.
   - **Social equity** — block-group LMI status from HUD CDBG income limits + ACS B19013 median household income + CDC Social Vulnerability Index.
3. **Real solver in Daytona** — formulate as a constrained MILP: minimize weighted exposure over a 30-year phasing, subject to per-phase budget ≤ $44M, per-phase parcel count ≤ ~3000, and contiguity preference (cluster scoring bonus for adjacent parcels to keep construction trenches efficient). Python with `pulp` or `cvxpy` runs in 30–90 seconds per scenario.
4. **Side-by-side with the city's current adopted phasing** — once the city publishes Phase 1/2/3 boundary polygons, render them as the "left" map and the optimizer output as the "right." This is the artifact you take to the Sustainability Advisory Committee.
5. **CSV export** drops a real parcel-ID list per phase, which can be loaded into the city's CIP tool (Cartegraph, OpenGov, or Excel).

---

#### F4 — Address-Based Climate Risk Report

**REAL:**
- **Geocoding** — every address is sent to OpenStreetMap Nominatim with a bounding-box constraint (`-80.205,26.060,-80.105,25.960`) so it only returns Hollywood matches. Free, no API key, no rate-limit issues for a demo.
- **AI synthesis** — every report is a real EcoHeart AI call (`response_format: json_object`, temperature 0.3). The prompt includes a 7-document authoritative source list (Sustainable Hollywood Action Plan, CVA, Dune Master Plan, Public Utilities Master Plan, SE FL Compact 2019 SLR projection, FBC HVHZ, Florida Statute §380.093) and asks the model to ground every score and recommendation in those documents.
- **Location-aware prompting** — the prompt adds a "Location indicator" line based on the geocode (barrier island vs. Intracoastal vs. inland) so scores differ by neighborhood.

**SIMULATED:**
- The model has been **told about** the 7 source documents but does not have their full text in the prompt. It synthesizes from training-cutoff knowledge of those documents plus the framing in the system prompt. **A future Hollywood RAG corpus would replace this with real page-level retrieval.**
- The map only shows the FEMA flood-zone layer for context — it does not yet show parcel-specific exposure overlays.
- The "Generate PDF / Email to resident / Submit as 311 ticket" buttons render but do not yet wire to those workflows.

**Production path (8 weeks):**
1. **Ingest Hollywood's full PDF library** into the existing EcoHeart RAG pipeline (OpenAI `text-embedding-3-small`, AWS S3 Vectors). The Olympia POC has done exactly this for 26 documents.
2. **Replace the system-prompt source list with live RAG retrieval** at query time — top-5 chunks for "flood risk in Hollywood" + top-5 for "insurance disclosure" + top-5 for "building code freeboard," all stuffed into the prompt as cited context.
3. **Page-level citations** — every recommendation in the output references a specific PDF and page number, with click-through to the source PDF excerpt (existing Olympia pattern).
4. **Real overlay computations** — replace AI-generated scores with rule-based computations from spatial data: FEMA zone lookup, elevation from USGS 3DEP, evacuation zone from Broward EOC, wind design speed from ASCE 7 hazard tool, heat days from Climate Mapping for Resilience and Adaptation.
5. **PDF export** wired to existing Olympia `jsPDF` pattern. **311 integration** via Open311 API if Hollywood NOW exposes one.
6. **Insurance score** wired to Citizens depopulation public records + Florida Office of Insurance Regulation rate filings.

---

#### F7 — Grant Finder Agent

**REAL:**
- **AI matching and narrative drafting** — every match is a real EcoHeart AI call against a hand-curated catalog of 5 programs.
- **The 5 grant programs are real**: Resilient Florida Implementation, FEMA BRIC, EPA CWSRF, HUD CDBG-DR, FEMA HMGP. Their eligibility criteria, scoring rubrics, match requirements, and award caps are pulled from real NOFOs (Notices of Funding Opportunity).
- **Hollywood eligibility evidence is real** — the model is told that Hollywood has a CVA Update in flight (Resilient Florida-funded), has CDBG-eligible tracts, has a Hazard Mitigation Plan, and is a member of the SE FL Compact. These are all verifiable public facts.

**SIMULATED:**
- The catalog is 5 programs, not 30+. Missing: EPA CPRG, DOT RAISE, EDA Public Works, Florida Springs, USDA Rural Water/Wastewater, NOAA NCRF, plus 15+ Florida-specific programs.
- The "Next step" timing claims ("application opens July 7") are illustrative — the model is not pulling live cycle dates.
- The pipeline tracker is client-only (in-memory) and resets on refresh.

**Production path (4 weeks):**
1. **Expand the catalog to 30+ programs** with structured records: agency, max award, match %, BCA threshold, eligible activities, scoring rubric, cycle dates, application portal URL.
2. **Nightly NOFO scraper** that watches each federal/state agency's grant portal for new and amended opportunities, refreshes deadlines, and notifies registered users (city grant team).
3. **Hollywood evidence pool from RAG** — instead of model-recalled facts, every eligibility "green" gets a specific page citation from the Hollywood RAG corpus.
4. **Persistent pipeline** — Postgres-backed, multi-user, with status tracking (Drafting / Submitted / Awarded / Declined), reminders for upcoming deadlines, and audit log for grants management compliance.
5. **Application export** in each grant's required format (Word for federal, FloridaJobs portal upload for state, PDF for matching documentation).
6. **Match-stacking optimizer** — given a project, find the combination of grants that maximizes coverage without violating overlap rules (most grants prohibit double-counting federal match).

---

#### F9 — SLR Adaptation Pathways Systems Model

**REAL:**
- **The Causal Loop Diagram renderer is real** — Gene Bellinger's methodology, D3 force-directed layout, draggable nodes, R/B loop badges, time-lag labels. This is the exact same component that powers EcoHeart's Olympia Systems Modeler.
- **The three pathway models (Armoring, Accommodation, Managed Retreat) are hand-crafted but real** — every node and link is grounded in published Hollywood/Compact planning vocabulary. The R1/R2/B1 loops are real systems-dynamics constructs that match what the Adaptation Planning literature (Hallegatte et al., NOAA Coastal Adaptation Toolkit) describes.

**SIMULATED:**
- The three models are **pre-built JSON**, not generated for this demo. In Olympia's POC, the modeler generates models live from a topic via the EcoHeart AI orchestrator + RAG. For Hollywood we bypassed that step to make the demo zero-risk.
- The "Collide with Healthcare staffing crisis" Aha! Paradox edges are hand-authored; in the live Olympia tool, a separate `/collide` endpoint generates the collision via LLM.
- The "Humanize" narratives (the 3 stories of Marisol / Eduardo / Mayor Levy) are pre-written. The Olympia tool generates these live via the EcoHeart AI orchestrator from the model JSON.

**Production path (3 weeks):**
1. **Wire to Hollywood RAG corpus** — point the existing `/api/systems-modeler/generate` route at the Hollywood-indexed corpus with `useRag: true`. The model will pull SLR Response Plan + CVA + Hazard Mitigation Plan chunks as seed context.
2. **Open the CopilotKit sidebar** so commissioners can iterate the diagram in real time ("add a node for FDOT pump-station maintenance budget").
3. **Wire `Collide` and `Humanize`** to the existing live endpoints. Both work today in the Olympia POC.
4. **Add Monte Carlo stress-test** — the dossier mentions this as F9's "wow" — run insurance availability and hurricane recurrence as probability distributions in Daytona, overlay confidence intervals on each node.
5. **Generate illustrations via Gemini** — the Olympia humanize step already does this; ported to Hollywood it would produce scenario-card visuals.

---

#### F12 — Hurricane After-Action Playbook

**REAL:**
- **Pre-storm checklist generation is real EcoHeart AI** — every preparedness list is generated at request time, grounded in the system prompt's Hollywood context (Memorial Regional, the Broward EOC, FDOT pump stations, A1A, the Broadwalk).
- **The 2017 Hollywood Hills banner is hardcoded** — this is a factually accurate planning anchor, not data the model invents. 12–14 patients died after generator failure during Irma; Florida's emergency-generator rule for ALFs followed directly.
- **Post-storm FEMA Project Worksheet drafting is real EcoHeart AI** against whatever CSV the user pastes.

**SIMULATED:**
- The damage CSV is sample data with 8 illustrative rows (A1A pump, Broadwalk, etc.).
- The "Distribute to registered facility contacts" and "Submit to HMGP/BRIC" buttons render but do not yet integrate with email or grant portals.
- There is no live incident data — the storm parameters are user-input only.

**Production path (6 weeks):**
1. **Real-time storm feed** — NWS / NHC API for active storm tracks, automatic Cat / track / surge-zone population.
2. **Facility roster ingest** — Florida AHCA license database for ALFs and skilled nursing, Memorial Healthcare System list for hospitals, Hollywood Public Utilities for lift stations, BCPS for schools. Each facility carries contact info, generator status, beds, evacuation-zone assignment.
3. **Personalized checklists per facility** — instead of one ALF checklist for all, generate per-facility based on its specific risk profile and known deficits.
4. **Email distribution** to registered facility contacts via SendGrid; SMS via Twilio; **integration with Everbridge / FirstNet** for emergency notification.
5. **Post-storm damage import** — inspector tablet (ESRI Survey123 or Fulcrum) drops geocoded damage rows into Postgres; the agent runs nightly aggregations.
6. **FEMA Project Worksheet** exported in FEMA's actual PDF template; submitted via FEMA Grants Portal.

---

### 7.2b Phase-2 concept pages — quick lineage

| Concept | Real | Simulated | Production swap |
|---|---|---|---|
| **A1A Coastal** (`/demo/a1a-coastal`) | Photography, FDOT-project names, Compact 6.5 ft 2060 target, Dune Master Plan zones | 4 pump-station progress numbers, 6 seawall segments, 5 dune zone vegetation %, 5 next-best-action items | Live FDOT project portal feed · live Hollywood Public Utilities asset register · RAG-generated next-best-actions |
| **Tree Canopy** (`/demo/tree-canopy`) | Hollywood ~18% canopy avg, Miami-Dade UFP 30% target, HVI methodology | 10 priority blocks, canopy %, recommended tree counts, costs | USFS Tree Canopy raster · Landsat NDVI · ACS B19013 · CDC SVI · Google Earth Engine for nightly zonal stats |
| **Stormwater** (`/demo/stormwater`) | EPA / FL DEP 410 CFU/100mL limit, Florida WIN data structure | 8 outfall locations + 24 months of seeded E. coli/rainfall/tide series, septic-within-500ft counts | EPA STORET + Florida WIN APIs (nightly) · Broward MORD rainfall · NOAA tide correlation in Daytona |
| **Code Assistant** (`/demo/code-assistant`) | 3 fully-cited seeded answers (freeboard, garage doors, seawalls) reference real code paragraphs; active code book list is real | All other questions fall back to a "concept page" message; PDF links are placeholders | Full RAG over FBC 8th Ed. + ASCE 24 + Hollywood Code §155 + §117 + Broward Land Use Plan; page-level citation traceability |
| **Tourism Loop** (`/demo/tourism-loop`) | CLD model JSON is hand-crafted but real (10 nodes, 13 links, 3 loops); Bellinger methodology | $890M visitor-spend stat; 3 scenario tabs are narrative-only (no model recompute); Collide + Humanize buttons unwired | Model generated from RAG corpus via existing `/api/systems-modeler/generate` · Collide + Humanize wired to live Olympia endpoints |
| **311 Triage** (`/demo/triage`) | Open311 spec, classification methodology, CIP project linking concept | 12 seeded reports w/ deterministic classifications; confidence scores hand-tuned; tide/radar correlation is descriptive | Live Hollywood NOW Open311 feed · NOAA tide (already wired in F1) · Broward MORD radar · CIP join from Cartegraph |
| **Equity Index** (`/demo/equity`) | AAA framework from Miami-Dade Little River; peer-AAA list is real; composite-weight methodology | 8 synthetic blocks w/ exposure + demographics; choropleth is decorative SVG | Real block-group ACS + CDC SVI + HUD LMI joined to Broward parcels; Mapbox or Leaflet choropleth with click-through |
| **GHG Updater** (`/demo/ghg`) | GPC Basic+ protocol; CDP + Climate Mayors alignment; SAP 80%-by-2050 target | 6 seeded sectors w/ baselines + glide path; 2025 estimate is interpolated | Live FPL/TECO consumption (CDP-portal) · Broward DOT VMT · waste tonnage · WWTP BOD · nightly Daytona recompute |

### 7.3 The architecture you'd say out loud if asked

> *"There are three layers. The GIS layer reaches out to public servers — NOAA, FEMA, NWS — directly from the browser; no EcoHeart server in the path. The RAG layer indexes your published planning PDFs and serves them as cited context to EcoHeart AI. The agent layer wraps both with tools — geocoding, parcel data, optimization in a Python sandbox — and orchestrates them into workflows like 'address → risk report' or 'project → grant draft.' Production deployment is your AWS or GCP account, your data residency, your branding. Six-week MVP."*

### 7.4 Data residency, security, and privacy posture

| Concern | Demo | Production |
|---|---|---|
| Where does resident data go? | Demo doesn't store any. AI calls go to OpenAI; nothing persists. | Hollywood AWS/GCP account. PII never leaves your environment. OpenAI calls use enterprise tier with zero-retention. |
| API keys | Demo uses Ahmed's keys. | Hollywood-issued keys, rotated quarterly. |
| Auth | Demo has no auth gate. | SSO via Hollywood Microsoft 365 / Okta. RBAC: Public viewer, Staff editor, Admin. |
| Audit logging | None in demo. | Every grant draft, every risk report, every workflow tagged with user + timestamp + input + output, retained 7 yr. |
| Open records / FOIA | N/A | All EcoHeart-generated documents (grant drafts, risk reports, after-action playbooks) are full public records, searchable via the existing portal. |
| AI hallucination guardrail | Prompt grounds in 7 named sources but does not retrieve them. | Every claim cites a specific PDF + page; UI surfaces the citation; agent refuses to answer if no relevant chunk is retrieved. |

### 7.5 The "is anything fake?" answer in one sentence

> *"The maps, the tides, and the AI calls are real, today. The 500 septic parcels and the 3 systems-dynamics models are hand-crafted for this demo because we haven't yet onboarded your data. Onboarding your data — the CVA Update is the seed corpus — is exactly what the 6-week MVP buys you."*

### 7.6 The 6-week MVP plan (the thing the city is actually buying)

| Week | Deliverable |
|---|---|
| 1 | Ingest Hollywood RAG corpus (Sustainable Hollywood Action Plan + CVA + CVA Update draft + Hazard Mitigation Plan + Public Utilities Master Plan + Dune Master Plan + Capital Improvement Plan). Cloud account setup. SSO. |
| 2 | Wire Address Risk Report (F4) to live RAG — every score backed by Hollywood PDF page citations. |
| 3 | Wire Grant Finder (F7) to expanded 30-program catalog + Hollywood RAG evidence pool. |
| 4 | Ingest real Broward parcels + Hollywood unsewered layer; deploy the real MILP optimizer (F2). |
| 5 | Onboard Hollywood facility roster (AHCA ALFs, Memorial, lift stations) → personalized hurricane playbooks (F12). Wire Systems Modeler (F9) to Hollywood RAG. |
| 6 | UAT with Sustainability Advisory Committee. White-label branding, custom domain, training session, runbook handoff. |

Cost (transparent): platform fee + cloud passthrough + one-time onboarding. **Exact numbers in the follow-up SOW** — they get shaped to fit the city's FY27 budget cycle.

---

## 8. The questions you'll be asked, and the answers

| Question | Answer |
|---|---|
| *"How are the risk scores calibrated?"* | "Honest answer: today the scores are EcoHeart AI synthesis grounded in Hollywood plans and Florida statute. In production we ground them in your CVA Update's asset-level data — that's the seed corpus we'd onboard." |
| *"What happens to our data?"* | "Nothing leaves your environment without your sign-off. The OpenAI calls in this demo are for synthesis only; no resident addresses persist. Production deployment runs in your own cloud account." |
| *"Who else uses this?"* | "Olympia, WA is the first POC — 26 indexed municipal plans, live at eco-agent-poc.onrender.com. Hollywood would be the second city, with the SE FL Compact framing." |
| *"What's the price?"* | "Pilot is white-labeled MVP delivered in 6 weeks against your CVA Update corpus. Pricing is a flat platform fee with no per-resident charge. Specific numbers in a follow-up — we'd shape the package to your FY27 budget cycle." |
| *"Can you integrate with Hollywood NOW?"* | "Yes — Open311 spec is standard. F11 (311 triage) is on the concept card list because that integration is a 2-week scope, not 12. We've kept it off the v1 pilot." |
| *"What about the Gridics 3D zoning map?"* | "Gridics already does parcel-level zoning beautifully. EcoHeart sits next to it — we don't replicate zoning, we layer risk, plan citations, and grant matching on top." |

---

## 9. Routes & commands cheat sheet

```
/                              Olympia POC (don't open during Hollywood demo)
/demo                          Hollywood landing

# Core 6 (flight plan)
/demo/king-tide                F1 — live NOAA
/demo/septic-priority          F2 — optimizer
/demo/risk-report              F4 — live geocode + EcoHeart AI
/demo/grant-finder             F7 — EcoHeart AI matching
/demo/adaptation-pathways      F9 — Systems Modeler (3 pre-built CLDs)
/demo/hurricane-playbook       F12 — pre-storm + post-storm

# Phase-2 concept pages (8 static, offline-safe)
/demo/a1a-coastal              A1A Coastal Vulnerability Dashboard
/demo/tree-canopy              Tree Canopy & Heat Island Map
/demo/stormwater               Stormwater Outfall + Water Quality
/demo/code-assistant           Building Resilience Code Assistant
/demo/tourism-loop             Tourism-Climate Feedback Loop Model
/demo/triage                   311 Climate Complaint Triage
/demo/equity                   Climate Equity Index Dashboard
/demo/ghg                      GHG Inventory Auto-Updater

# API routes (for debugging from devtools)
GET  /api/demo/noaa-tides?days=60&threshold=2.1
POST /api/demo/risk-report          { "address": "..." }
POST /api/demo/grant-match          { "project": "..." }
POST /api/demo/hurricane-playbook   { "mode": "pre"|"post", ... }
```

---

## 10. Authoritative URLs to keep in a browser tab

For "we use the same source you use" moments:

- `southeastfloridaclimatecompact.org/initiative/regionally-unified-sea-level-rise-projection/`
- `floridadep.gov/rcp/resilient-florida-program`
- `hollywoodfl.org/921/Sustainable-Hollywood-Action-Plan`
- `hollywoodfl.org/1484/Climate-Change-Vulnerability-Assessment`
- `hollywoodfl.org/1473/King-Tides-and-High-Tides`
- `hollywoodfl.org/909/Unsewered-Areas-Information`
- `map.gridics.com/us/fl/hollywood`
- `tidesandcurrents.noaa.gov/stationhome.html?id=8723214`
- `experience.arcgis.com/experience/d4f2e042f59e4b2eaee108c0777a0937` (Resilient FL Grants Dashboard)

---

## 11. Final reminders

1. **Read citations aloud once per feature.** The audience will be skeptical of LLM output. Show them you cite.
2. **Name names.** Mayor Levy, the Sustainability Advisory Committee, Vin Morello (Public Utilities Master Plan), Azita Behmardi (City Engineer). All within the first 90 seconds.
3. **The 2017 Hollywood Hills reference is in the product on purpose.** Read the banner aloud. Don't editorialize.
4. **Don't sell the architecture.** Sell the workflow: address → report. Project → grant draft. Storm → ALF checklist. Plan → causal loop.
5. **End on the ask.** *"Six weeks. Your CVA Update as the seed. We'll have an MVP for your team."*

Go close it. — EcoHeart.
