# EcoHeart × Hollywood — "About" Modal Content & Image Prompts

Plain-English explainers for every section of the Hollywood demo, written for a
**non-technical audience** (policymaker, commissioner, city marketer). Each entry
maps the feature onto EcoHeart's published **Methodology** (Scan → Analyze →
Model → Formulate → Respond → Assess) and the **EcoHeart Advantage** stack
(Integrated Data + AI Intelligence + Applied Domain Experts → What Communities Gain).

This document is the deck-ready mirror of `src/lib/demo/about-content.ts`, which
powers the in-app **About** button (top-right of every demo page). Update both
together.

---

## Shared image style (prepend to every prompt)

> Dark navy-to-teal gradient background (#0a1628 → #0f2942), glowing EcoHeart
> teal accents (#2dd4bf) with soft cyan glow, a faint heart-shaped network motif
> in the backdrop. Flat modern explainer infographic, lots of negative space,
> clean sans-serif labels large enough to read on a projector from the back of a
> council chamber. Boardroom-friendly, non-technical, optimistic, premium. 16:9.
> Bottom-left: small EcoHeart heart-network logo + lowercase 'ecoheart' wordmark.
> Thin footer ribbon of tiny line icons reading: Ecoheart · Infrastructure ·
> Resilience · Sustainability · Public-sector decision-making.

Export each diagram at **1280×720 PNG** into `public/demo/about/<slug>.png`.

---

## 0. Overview — The Urban Resilience Platform
**Route:** `/demo` · **Pillar:** EcoHeart × City of Hollywood, FL
**One-liner:** One place where a city's scattered plans, dashboards, and reports become decisions anyone in the room can act on.

**What it is, in plain English.** Cities already own an overwhelming amount of climate data — flood maps, master plans, tide gauges, grant rules, 311 complaints. The problem is never a lack of information; it's that the information is scattered across PDFs and silos that don't talk to each other. EcoHeart is the layer that unifies all of it and, using AI that always cites its sources, turns it into clear answers a commissioner, a grant writer, or a resident can use today.

**What it does for the community.**
- Leaders make faster, evidence-based decisions instead of waiting on a quarterly consultant report.
- Every recommendation links back to the city's own adopted plans and public data — nothing is a black box.
- Residents, staff, and elected officials finally see the same picture, in plain language, on one screen.

**How EcoHeart sets this up for any city.** EcoHeart follows a repeatable six-step method: Scan the city's published plans and live data, Analyze where the risks and gaps are, Model the options, Formulate prioritized actions, Respond with deliverables (reports, grant drafts, playbooks), and Assess the outcome. The same method that built this Hollywood prototype is how we onboard the next city — only the data corpus changes. *(Methodology: Scan · Analyze · Model · Formulate · Respond · Assess)*

**How our platform brings it to fruition.** Most platforms stop at data and dashboards. EcoHeart adds two things competitors can't: an AI intelligence layer that is RAG-grounded so every answer carries a citation, and applied domain experts — 25+ years of public-sector practice in governance, water, climate, and emergency management — who curate the model so it speaks the city's language. Integrated data plus AI plus human expertise is what turns insight into trusted action.

**Image prompt.** Centerpiece: a glowing EcoHeart heart-network hub in the middle. On the left, six small icons feeding IN labeled 'City plans (PDFs)', 'NOAA tides', 'FEMA flood maps', 'Census', 'Grant rules', '311 calls'. Flowing through the heart-hub and emerging on the right as four clean output cards labeled 'Risk Reports', 'Grant Drafts', 'Storm Playbooks', 'System Models'. A thin horizontal process strip beneath reading Scan → Analyze → Model → Formulate → Respond → Assess. Headline top: 'From scattered data to decisions you can act on.'

---

## 1. King Tide Flood Risk Explorer
**Route:** `/demo/king-tide` · **Pillar:** GIS · Flagship · Live NOAA
**One-liner:** A weather forecast for sea-level rise — so the city and its residents can see flood days coming, not just look back at them.

**What it is, in plain English.** A king tide is simply the highest tide of the year, when the sun and moon line up — no storm, no rain, the ocean is just briefly higher than usual and water pushes up through the storm drains. This tool fetches the next 60 days of official NOAA tide predictions live, flags every day the water will crest the flooding threshold for Hollywood's streets, and lets you slide forward to see how those flood days multiply as the sea rises.

**What it does for the community.**
- Residents on streets like South Lake Drive can plan their week around predicted flood days, the way they'd plan around a storm.
- Public Works can pre-stage pumps and barricades for the exact dates water will come up — instead of reacting.
- Commissioners see, in one slider, why a 'nuisance' today becomes a daily problem by 2060 — making the case for investment concrete.

**How EcoHeart sets this up for any city.** For any coastal city, EcoHeart Scans the nearest long-record NOAA tide station, calibrates the local flooding threshold against the streets the city already tracks as hotspots, and overlays the official NOAA sea-level-rise inundation layers. The hard part isn't the chart — it's knowing which station, which threshold, and which neighborhoods matter. That domain calibration is what we bring to each new city. *(Methodology: Scan · Analyze · Model)*

**How our platform brings it to fruition.** The integrated-data layer pulls live from NOAA, FEMA, and the NOAA Office for Coastal Management directly in the browser. The AI/analytics layer turns a static annual prediction into a day-by-day forecast and a cumulative 'property-days flooded' counter. And our coastal-science experts supply the local calibration — the 2.1-foot threshold that actually fires on Hollywood's king tides, not a textbook number — so the tool is trustworthy the day it goes live.

**Image prompt.** A calendar strip of 60 days where certain days glow teal/orange marked 'FLOOD DAY', with a tide-curve line weaving above it cresting a dashed 'flooding threshold' line. To the right, a simplified coastal neighborhood map with three sea-level-rise overlay states shown as a small slider: 'Today', '+1 ft', '+3 ft (≈2060)', the blue water creeping further inland at each step. A live data badge 'NOAA Virginia Key · live'. Headline: 'See the flood days before they arrive.'

---

## 2. Septic-to-Sewer Prioritization Map
**Route:** `/demo/septic-priority` · **Pillar:** GIS · Cross-pillar · Optimizer
**One-liner:** Turns a 30-year, $1.3-billion sewer-conversion sequence into a slider a commissioner can reason about in 90 seconds.

**What it is, in plain English.** About half of Hollywood — roughly 17,000 properties — still relies on individual septic tanks instead of city sewer. As groundwater and the sea rise, those tanks become a public-health and water-quality risk. The city must convert them, but can't do all 17,000 at once, so the question is: which neighborhoods first? This tool lets you weight four fair priorities — groundwater risk, tidal flooding, cost to connect, and helping the residents who most need it — and instantly re-orders the build sequence.

**What it does for the community.**
- Makes the trade-off visible: move a slider toward equity and watch a lower-income tract move up a phase, with the reasoning shown.
- Gives the Sustainability Advisory Committee and residents a shared, transparent basis for a politically hard decision.
- Surfaces which neighborhoods qualify for zero-interest forgivable loans, so cost doesn't fall hardest on those least able to pay.

**How EcoHeart sets this up for any city.** EcoHeart ingests the city's real parcel data, groundwater elevation, and demographics, then Models the build-out as a true optimization problem — finding the best phasing under a real budget and engineering constraints. For any city, the inputs change but the engine is the same: tell it what you value, and it re-sequences the capital plan to match, defensibly. *(Methodology: Analyze · Model · Formulate)*

**How our platform brings it to fruition.** The demo runs a fast client-side sort over 500 representative parcels; in production the same screen drives a real mathematical optimizer (MILP) over all 17,000 parcels with real elevation, groundwater, and Census data. What makes it trustworthy is the domain layer: our civil-engineering and equity-data experts ensure the optimizer weighs the same dimensions the city's Capital Improvement Plan actually weighs — so the output is a usable plan, not an academic exercise.

**Image prompt.** Left side: four labeled sliders 'Groundwater risk', 'Tidal flooding', 'Cost to connect', 'Social equity', one being dragged up. Right side: a neighborhood map re-coloring into six numbered build phases (Phase 1 → 6) as the sliders move, with one tract visibly jumping from Phase 4 to Phase 1 and a small tag 'CDBG-eligible · 0% loans'. A '½ of the city · ~17,000 properties · $1.3B' stat band. Headline: 'Which neighborhood gets sewer first? Make the trade-off visible.'

---

## 3. Address Climate Risk Report
**Route:** `/demo/risk-report` · **Pillar:** RAG + GIS · Flagship
**One-liner:** Type any address; get a one-page, fully-cited climate risk report in about seven seconds.

**What it is, in plain English.** Today, understanding a single property's climate exposure means cross-referencing flood maps, building codes, and a stack of city plans by hand. This tool does it instantly: enter an address and EcoHeart produces a parcel-level report scoring five risks — flood, storm surge, heat, wind, and insurance stress — projected from now to 2100, with specific recommendations. Crucially, every number is tied back to a real source document.

**What it does for the community.**
- A resident or realtor gets a plain-language read on a property's risk and what to do about it.
- Staff turn thirty pages of plans into a one-page, resident-actionable handout instantly.
- Because each claim cites the city's own adopted code and plans, the report is auditable and defensible — not an AI guess.

**How EcoHeart sets this up for any city.** EcoHeart geocodes the address, then Responds by synthesizing a report grounded in a curated reading list of that city's authoritative documents — action plan, vulnerability assessment, utilities plan, building code, regional sea-level projection. For a new city we swap in its document corpus; the workflow 'address → cited report' stays identical. *(Methodology: Scan · Analyze · Respond)*

**How our platform brings it to fruition.** This is the clearest example of why EcoHeart's three layers matter together. Integrated data (free OpenStreetMap geocoding, FEMA flood layers) locates the parcel; AI intelligence synthesizes the narrative; and the Ethical-AI / RAG discipline our experts enforce means the model retrieves and quotes the exact paragraph of the building code rather than inventing one. In production it indexes every city PDF page-by-page, so each score is backed by a clickable citation.

**Image prompt.** Center: a single house pin on a small flood-zone map. Radiating from it, five circular risk dials labeled 'Flood', 'Storm Surge', 'Heat', 'Wind', 'Insurance'. Below, a left-to-right timeline 2026 → 2100 with a rising risk curve. To the right, a 'recommendation' card with a quoted citation chip 'Florida Building Code §1620.1.5' glowing to show traceability. Headline: 'Any address → a cited risk report in 7 seconds.' Small subhead: 'Every number traces to a real document.'

---

## 4. Grant Finder Agent
**Route:** `/demo/grant-finder` · **Pillar:** RAG · Agent
**One-liner:** Describe a project in one sentence; get matched funding programs, a scored eligibility checklist, and a drafted application narrative.

**What it is, in plain English.** Finding and writing climate-resilience grants is one of the most labor-intensive jobs in a sustainability office — and nearly identical from city to city. This agent reverses the work: you describe the project, and it reasons over a catalog of federal and state programs (their eligibility rules, scoring rubrics, match requirements, and deadlines) to find the best fits, score how ready you are, and draft the narrative.

**What it does for the community.**
- Turns roughly a staff-week of grant research and writing into one click plus a review.
- Shows exactly which eligibility boxes the city already checks and which need work, with a 0–100 fit score.
- Helps smaller departments compete for the same federal dollars as cities with full-time grant teams.

**How EcoHeart sets this up for any city.** EcoHeart maintains a structured catalog of grant programs and matches it against what a city already has on the books — its plans, its eligible tracts, its assessments. For any city we point the agent at its evidence pool; the matching and drafting logic is reused. In production a nightly scraper keeps deadlines and new funding notices current. *(Methodology: Scan · Analyze · Formulate · Respond)*

**How our platform brings it to fruition.** Grants are where applied domain expertise is decisive: our team includes specialists who have written winning federal and state resilience applications, and that knowledge is encoded into the catalog the AI reasons over. The integrated-data layer keeps program rules and deadlines fresh; the AI agent does the matching and drafting; the human expertise ensures the output reads the way a reviewer expects — so the city submits, not just generates.

**Image prompt.** Left: a single input card reading 'Septic-to-sewer · Boulevard Heights · ~1,100 properties · $71M'. An arrow into a glowing EcoHeart agent node. Right: three ranked grant-match cards with score badges (94, 88, 81) and a 12-item eligibility checklist where 10 items are green checks and 2 are amber. Below, a small 'Application draft' document icon being generated. Headline: 'Describe the project. Get matched, scored, and drafted.'

---

## 5. SLR Adaptation Pathways
**Route:** `/demo/adaptation-pathways` · **Pillar:** Systems · Systems Modeler
**One-liner:** A living map of cause-and-effect that lets a city see the whole resilience system — and what changes when it pulls a lever.

**What it is, in plain English.** Every coastal city faces the same strategic choice about sea-level rise: Armor it (seawalls and pumps), Accommodate it (elevate and floodproof building by building), or Retreat from it (voluntarily relocate the highest-risk properties). This tool draws each strategy as a 'causal loop diagram' — a picture where every factor is a node and every arrow is a cause-and-effect link — so decision-makers can see the feedback loops, the stakeholders, and the hidden trade-offs of each path on one canvas.

**What it does for the community.**
- Brings a commission or advisory committee onto the same page about a complex, decades-long decision.
- Surfaces the loops that spiral (e.g. armoring invites new development into the protected zone, raising future catastrophic risk) before the city commits.
- The 'Aha! Paradox' step collides the model with an unrelated concept to surface the quiet, load-bearing assumption everyone's been avoiding.

**How EcoHeart sets this up for any city.** EcoHeart's Systems Modeler generates these diagrams from a city's actual plans, then lets staff iterate them with AI. The methodology (rooted in fifty years of systems-thinking practice) is the same for any city; what changes is the corpus the model reads to populate the nodes. *(Methodology: Model · Formulate · Assess)*

**How our platform brings it to fruition.** Systems-thinking has existed as a workshop methodology for decades — EcoHeart is the first to operationalize it as a live, AI-iterable product wired to a city's real plans. The diagram exports as a standalone interactive file a commissioner can open with no special software. Integrated data populates the nodes, the AI iterates and 'humanizes' the model into a readable narrative, and our systems-practice experts ensure the loops reflect real coastal-policy dynamics, not a generic template.

**Image prompt.** A network of glowing teal nodes connected by curved arrows forming two visible loops — one tagged red 'reinforcing (accelerates)' and one tagged blue 'balancing (self-corrects)'. Three labeled tabs above: 'Armor', 'Accommodate', 'Retreat', each showing a different node arrangement. One purple node off to the side labeled 'collide: workforce availability' wired in with a dashed line ('Aha! Paradox'). Headline: 'See the whole system before you pull the lever.'

---

## 6. Hurricane After-Action Playbook
**Route:** `/demo/hurricane-playbook` · **Pillar:** RAG · Emergency Ops
**One-liner:** Encodes the hard lessons of past storms into the preparedness checklist for the next one — automatically, every time.

**What it is, in plain English.** Before a storm, this tool generates five tailored preparedness checklists — for Residents, Assisted Living Facilities, Hospitals, Lift Stations, and Schools — conditioned on the specific storm scenario. After a storm, it switches modes to help draft the federal reimbursement paperwork. The checklists aren't generic: they carry forward the specific, sometimes painful lessons of this city's own history.

**What it does for the community.**
- Vulnerable-population facilities (like assisted-living homes) get a checklist whose first item reflects a real local lesson — e.g. generator and indoor-temperature monitoring.
- Each audience gets the right list — a lift-station operator and a school principal see entirely different, relevant tasks.
- After the storm, staff draft FEMA reimbursement worksheets in the format the agency actually accepts, speeding recovery dollars.

**How EcoHeart sets this up for any city.** EcoHeart Responds by generating each checklist at request time, conditioned on storm category, projected track, and a city-specific context built from local history and facility rosters. For any city we onboard its facility list and its lessons-learned; the generation engine is shared. *(Methodology: Scan · Respond · Assess)*

**How our platform brings it to fruition.** This is where applied expertise becomes literally life-safety: encoding a specific local lesson as item one of the next storm's checklist requires emergency-management and healthcare-operations literacy, not just an AI model. The AI generates and tailors; our domain experts ensure the post-storm output meets federal reimbursement format; and in production the integrated-data layer pulls each facility's real status from the state licensing roster so the playbook is personalized per building.

**Image prompt.** Top: a storm-track cone approaching a coastline. Below it, five tabbed checklist cards labeled 'Residents', 'Assisted Living', 'Hospitals', 'Lift Stations', 'Schools', the 'Assisted Living' card highlighted with a respectful rose-bordered banner reading 'Lesson learned → item #1: generator + indoor-temp monitoring'. A small two-mode toggle 'Pre-storm / Post-storm (FEMA worksheet)'. Headline: 'Last storm's lessons become next storm's first checklist item.'

---

## 7. A1A Coastal Vulnerability Dashboard *(Phase 2)*
**Route:** `/demo/a1a-coastal` · **Pillar:** Phase 2 · GIS
**One-liner:** A guided, mile-by-mile tour of the barrier-island highway — where it floods, what's being fixed, and what gap remains.

**What it is, in plain English.** A1A is the state highway running along Hollywood's beach and barrier island — the lifeline to the Broadwalk and the coastal tax base. This dashboard walks segment by segment through its flood vulnerability: where pump stations are under construction, how many overtopping days each fix prevents, and exactly which stretches of seawall fall short of the regional 2060 height target.

**What it does for the community.**
- Translates a $24.7M construction program into a clear before/after: overtopping days cut from ~26 a year to ~7.
- Shows precisely where the protection gap is — and the dollar cost to close it — so funding asks are specific.
- Protects the beach and Broadwalk economy that the city's tax base depends on.

**How EcoHeart sets this up for any city.** EcoHeart Scans the corridor's elevation, seawall heights, and project list, then presents it as a scrollytelling narrative anyone can follow. For another city this becomes any critical corridor — a coastal road, an evacuation route, a waterfront district — using the same map-and-story engine. *(Methodology: Scan · Analyze · Formulate)*

**How our platform brings it to fruition.** Integrated GIS data supplies the elevations and project footprints; the presentation layer turns them into a board-ready story rather than a raw map; and our coastal-infrastructure experts frame each segment against the regional sea-level target so the city sees not just today's risk but the specific investment that closes the 2060 gap.

**Image prompt.** A stylized barrier-island highway running diagonally, divided into mile segments. Four segments glow with pump-station icons labeled 'Azalea', 'Van Buren', 'Sherman', 'Franklin'. A small bar chart of 'seawall height vs 6.5 ft 2060 target' with some bars short of the line and a '$22M gap to close' tag. A before/after stat: 'Overtopping days 26 → 7'. Headline: 'Every mile of A1A — risk, fix, and remaining gap.'

---

## 8. Tree Canopy & Heat Island Map *(Phase 2)*
**Route:** `/demo/tree-canopy` · **Pillar:** Phase 2 · GIS
**One-liner:** Maps where the city is hottest and who's most exposed — so every shade-tree dollar lands where it helps people most.

**What it is, in plain English.** Tree canopy is the share of ground covered by leaves overhead — more canopy means measurably cooler streets. The 'urban heat island' effect is why paved, treeless blocks run several degrees hotter than leafy ones. This tool maps canopy block by block, scores each against a heat-vulnerability index (who is most at risk — the elderly, low-income, those without air conditioning), and overlays equity so the city can target planting.

**What it does for the community.**
- Directs limited tree-planting budgets to the blocks where shade prevents the most heat illness per resident.
- Gives residents and council a visual case for canopy as health infrastructure, not landscaping.
- Tracks progress toward a canopy goal (Hollywood ~18% today vs a 30% regional target).

**How EcoHeart sets this up for any city.** EcoHeart fuses satellite greenness, heat data, and demographics to Analyze where heat and vulnerability overlap, then Formulates priority planting areas. For any city the layers are the same — canopy, heat, and social vulnerability — recomputed on local data. *(Methodology: Scan · Analyze · Formulate)*

**How our platform brings it to fruition.** The integrated-data layer pulls satellite canopy and Census vulnerability; the analytics layer fuses them into a single per-block priority score; and our equity and public-health expertise ensures the recommendation answers the real question — not 'where are there few trees' but 'where does a new tree protect the most vulnerable person.' That's the difference between a map and a plan.

**Image prompt.** A city grid where blocks are colored on two overlaid scales: green (high canopy) to grey (paved/hot), with a second translucent overlay marking 'high heat-vulnerability' blocks in warm amber. A few priority blocks circled where hot + vulnerable overlap, tagged 'plant here first'. A canopy gauge '18% → 30% target' and a small thermometer comparing a shaded vs unshaded street. Headline: 'Cool the blocks where heat hurts people most.'

---

## 9. Stormwater Outfall & Water Quality *(Phase 2)*
**Route:** `/demo/stormwater` · **Pillar:** Phase 2 · GIS
**One-liner:** Connects the dots between failing septic tanks and the bacteria readings at the city's waterway outfalls.

**What it is, in plain English.** Stormwater outfalls are the pipes that discharge runoff into the Intracoastal waterway. This tool maps every outfall, colors each by its recent bacteria (E. coli) sample, and — when you click one — shows how many septic tanks sit upstream of it. It makes visible the link between two problems that are usually managed in separate departments.

**What it does for the community.**
- Gives the public-health case for sewer conversion: high bacteria readings line up with clusters of septic tanks.
- Helps Public Works prioritize which outfalls and neighborhoods drive water-quality violations.
- Protects the beaches, fishing, and recreation that depend on clean coastal water.

**How EcoHeart sets this up for any city.** EcoHeart Scans outfall sampling data and septic locations and Analyzes the spatial correlation, turning two siloed datasets into one operational story. For any city, the inputs are its own water-quality samples and infrastructure layers; the join logic is reused. *(Methodology: Scan · Analyze)*

**How our platform brings it to fruition.** The power here is integration across silos — water-quality monitoring and wastewater infrastructure rarely sit on one screen. EcoHeart's data layer joins them spatially, the analytics layer flags the correlations, and our environmental-engineering experts frame it so the water-quality story and the septic-conversion story are told as the single story they actually are — strengthening the case for the city's biggest capital program.

**Image prompt.** A waterway (Intracoastal) along one edge with a row of outfall dots colored green-to-red by E. coli level; one red outfall clicked, drawing a 500-ft radius circle that captures ~38 small septic-tank house icons upstream, with a tag '8 exceedances / 12 months'. A connector arrow linking 'septic clusters' to 'bacteria at outfall'. Headline: 'The water-quality story and the septic story are the same story.'

---

## 10. Building Resilience Code Assistant *(Phase 2)*
**Route:** `/demo/code-assistant` · **Pillar:** Phase 2 · RAG
**One-liner:** Answers Florida Building Code and resilience-rule questions in plain English — with the exact paragraph cited every time.

**What it is, in plain English.** Building codes and flood regulations are dense, numbered, and easy to misread — yet they govern every permit and retrofit. This assistant lets staff, designers, or residents ask a question in plain language ('what windows are required on the barrier island?') and get a clear answer that quotes the specific code paragraph it came from, so the answer is verifiable.

**What it does for the community.**
- Cuts the time staff spend hunting through code books to answer permit and retrofit questions.
- Reduces costly permitting mistakes by grounding every answer in the exact, citable rule.
- Makes resilient-building requirements understandable to homeowners doing their own retrofits.

**How EcoHeart sets this up for any city.** EcoHeart indexes the relevant codes and Responds to questions with retrieval-grounded answers — it quotes the source or it declines to answer. For any jurisdiction we load its applicable code set; the cite-or-don't-answer discipline is constant. *(Methodology: Scan · Respond)*

**How our platform brings it to fruition.** This feature is the clearest proof of EcoHeart's 'never a black box' principle. The AI layer reads the question; the RAG layer retrieves the governing paragraph; and our data-ethics discipline forbids an answer that can't cite a source. Integrated data (the code corpus) plus grounded AI plus ethical guardrails turns an intimidating rulebook into a trustworthy assistant.

**Image prompt.** A chat-style panel: a plain-English question bubble 'What openings are required on the barrier island?' and an answer bubble with a highlighted quoted passage and a glowing citation chip 'FBC §1620.1.5 · 8th Ed.'. Beside it, a stack of code-book spines being indexed into a glowing search index. A small 'no citation → no answer' guardrail badge. Headline: 'Plain-English answers. Always with the rule attached.'

---

## 11. Tourism-Climate Feedback Loop *(Phase 2)*
**Route:** `/demo/tourism-loop` · **Pillar:** Phase 2 · Systems
**One-liner:** Shows commissioners, in one diagram, how protecting the dunes and beach protects the tax base.

**What it is, in plain English.** Hollywood's beach, dunes, and Broadwalk drive tourism, which drives the tax revenue that funds city services. Climate damage to that coastline threatens the whole loop. This systems model makes the connection explicit — linking dune health to visitor spending to revenue to the city's capacity to reinvest — so spending on coastal protection reads as economic strategy, not just environmental cost.

**What it does for the community.**
- Reframes dune and beach spending as protecting jobs and revenue, which wins broader political support.
- Helps the commission weigh coastal-protection investment against its long-term return.
- Aligns the tourism economy and the resilience agenda behind the same projects.

**How EcoHeart sets this up for any city.** EcoHeart's Systems Modeler builds the cause-and-effect loop from the city's economic and coastal data, then makes it interactive for briefings. For any tourism- or asset-dependent economy, the same modeling approach maps the local value loop. *(Methodology: Model · Formulate)*

**How our platform brings it to fruition.** Like the Adaptation Pathways tool, this operationalizes systems-thinking — but pointed at the budget. The data layer supplies tourism and revenue figures, the AI layer renders and narrates the loop, and our public-finance and coastal experts ensure the linkages are credible to a CFO. The result translates an environmental investment into the language a commission funds with: tax base.

**Image prompt.** A clean circular feedback loop of four glowing nodes with arrows: 'Healthy dunes & beach' → 'Tourism & visitor spending' → 'City tax revenue' → 'Reinvestment in coastal protection' → back to dunes. A small red arrow showing 'climate damage' weakening the first node and rippling around the loop. A dollar tag on the revenue node. Headline: 'Protecting the dunes protects the tax base.'

---

## 12. 311 Climate Complaint Triage *(Phase 2)*
**Route:** `/demo/triage` · **Pillar:** Phase 2 · RAG + Agent
**One-liner:** Automatically reads, classifies, and prioritizes incoming flood and climate complaints against live tide and radar.

**What it is, in plain English.** 311 is the city's resident service-request line. During flooding it gets flooded itself — with calls that staff must read and route by hand. This agent automatically classifies each incoming flood or climate complaint, checks it against the live tide level and weather radar to see whether it's a real-time event, and prioritizes the queue so the most urgent, corroborated reports rise to the top.

**What it does for the community.**
- Faster response during flood events, when call volume spikes exactly when staff are most stretched.
- Separates true tidal/flood emergencies from routine requests using live conditions, not guesswork.
- Builds a clean, geocoded record of where flooding actually happens, feeding every other tool.

**How EcoHeart sets this up for any city.** EcoHeart Responds to each request by classifying it and cross-checking live tide and radar, then routing it. Built on the open 311 standard, it interoperates with the city's existing system. For any city it connects to the same standard interface. *(Methodology: Scan · Analyze · Respond)*

**How our platform brings it to fruition.** Because it speaks the open 311 standard, integration is weeks, not months. The data layer brings in live tide and radar, the AI agent classifies and prioritizes in real time, and our operations experts tune the routing to the city's actual departments — so a citizen's report becomes the right crew's work order, automatically, while also enriching the city's flood record.

**Image prompt.** An inbox column of incoming complaint cards ('water in street', 'storm drain backflow') flowing through a glowing classifier node that stamps each with a category and priority. Two live gauges feeding the node: a tide gauge and a weather-radar tile. Output: a sorted queue with red 'urgent · tide confirmed' cards on top. A small 'Open311 standard' interoperability badge. Headline: 'Every flood call, classified and prioritized in real time.'

---

## 13. Climate Equity Index Dashboard *(Phase 2)*
**Route:** `/demo/equity` · **Pillar:** Phase 2 · GIS + RAG
**One-liner:** Maps who is most exposed to climate risk and least resourced to recover — and drafts candidate priority zones.

**What it is, in plain English.** Climate impacts don't fall evenly. This dashboard combines flood and heat exposure with social vulnerability — income, age, vehicle access, language — to show which neighborhoods face the highest risk with the fewest resources to adapt. It can then draft candidate 'Adaptation Action Areas': designated zones where a city concentrates its resilience investment.

**What it does for the community.**
- Ensures resilience dollars reach the residents who can least afford to protect themselves.
- Gives the city a defensible, data-backed basis for designating priority investment zones.
- Strengthens applications for equity-focused federal funding that requires this analysis.

**How EcoHeart sets this up for any city.** EcoHeart Analyzes hazard and vulnerability data together and Formulates draft priority areas the city can refine. For any city the index recombines the same families of data — exposure plus social vulnerability — on local numbers. *(Methodology: Scan · Analyze · Formulate)*

**How our platform brings it to fruition.** Equity is core to EcoHeart's Responsible-Innovation principles, so this isn't a bolt-on. The data layer fuses hazard and demographic data; the analytics layer produces a transparent, explainable index (no hidden weighting); and our policy experts shape the draft Adaptation Action Areas to match the frameworks funders recognize — turning a fairness commitment into a fundable, mappable plan.

**Image prompt.** A neighborhood map shaded by a composite 'equity risk' score (cool to hot), with several high-score areas outlined as dashed 'candidate Adaptation Action Area' polygons. A small stacked legend showing the index inputs: 'flood + heat exposure' plus 'income, age, vehicle access, language'. A transparency note 'weights shown, not hidden'. Headline: 'Send resilience where risk is high and resources are low.'

---

## 14. GHG Inventory Auto-Updater *(Phase 2)*
**Route:** `/demo/ghg` · **Pillar:** Phase 2 · RAG + Agent
**One-liner:** Keeps the city's greenhouse-gas inventory and climate disclosure current automatically, instead of as an annual scramble.

**What it is, in plain English.** Cities that commit to emissions targets must count their greenhouse gases every year using a global standard and disclose progress — today, usually a manual, once-a-year project. This tool keeps the inventory continuously updated from the underlying data sources and drafts the disclosure in the required reporting format, so the city's climate commitments stay live and credible.

**What it does for the community.**
- Replaces an annual staff scramble with an always-current emissions picture.
- Keeps the city's public climate disclosure accurate and on time, protecting its credibility and coalition memberships.
- Shows residents real, ongoing progress toward the 80%-by-2050 goal rather than a stale yearly snapshot.

**How EcoHeart sets this up for any city.** EcoHeart Scans the activity data behind emissions (energy, vehicle miles, wastewater), Models the inventory to the global protocol, and Responds with a disclosure-ready draft. For any city the standard is the same; the data feeds are localized. *(Methodology: Scan · Model · Respond · Assess)*

**How our platform brings it to fruition.** This closes EcoHeart's loop with the Assess step — proving outcomes over time. The integrated-data layer connects to the activity sources, the AI layer computes the inventory to the recognized global protocol, and our sustainability experts ensure the output matches the exact disclosure format the city's reporting platform requires — turning an annual compliance burden into a living scoreboard for the climate commitments the city has already made.

**Image prompt.** A live dashboard gauge 'GHG vs 80%-by-2050 target' with a downward-trending line. Feeding into it, three data-source icons 'Energy use', 'Vehicle miles', 'Wastewater' flowing through a glowing 'GPC protocol' engine. Output: an auto-generated 'CDP disclosure' report card with an 'auto-updated' refresh badge. Headline: 'A living emissions scoreboard — not a once-a-year scramble.'

---

*Generated for the EcoHeart × Hollywood, FL demo. Mirror of `src/lib/demo/about-content.ts`.*
