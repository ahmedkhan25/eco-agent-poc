// Skills: know-how the Advisor loads only when a task needs it (loadSkill).
// Keep each one short and practical. The team can edit these without touching the code.

export interface Skill {
  id: string;
  title: string;
  when: string;
  body: string;
}

export const SKILLS: Skill[] = [
  {
    id: "value-modeling",
    title: "Value modeling",
    when: "adding a saving, building a new use case, or explaining how value is counted",
    body: `Every benefit is one of four building blocks. Pick the simplest that fits:
- costAvoided: a yearly cost the client already pays x the share avoided (%). Keys: base ($/yr), share (%).
- eventsAvoided: events per year x cost per event x share avoided (%). Keys: count, unitCost ($), share (%). Use when the client thinks in incidents (truck rolls, EMS calls, flooded intersections).
- timeSaved: staff hours saved per year x loaded hourly rate. Keys: hours, rate. Reuse the shared key "hourly" unless the client has a role-specific rate.
- newMoney: dollars at stake per year x improvement (%). Keys: amount ($), share (%). Grants, FEMA reimbursement, carbon credits, avoided fines.
Rules:
- Build with createUseCase, then addValueLine once per line. Every new assumption needs a label, unit, cautious / expected / business case, a source and an owner. Values you make up are ecoheart estimates with low confidence; say so.
- Cautious < expected < business case for shares.
- Avoid double counting: if a line could overlap a line in another use case (the same overtime, the same report hours), give both the same overlap tag. validate will flag it when both are used.
- Non-dollar outcomes (people protected, hours sooner a resident hears back, Citizen Impact Score) go in outcomes, never in the dollar ROI.
- Tag each use case with one of the seven CitySense super-systems: Governance, Economy, Infrastructure, Environment, Social, Safety, Engagement.
- After building, run validate on a scenario that uses it and fix any fails.`,
  },
  {
    id: "client-profile",
    title: "Client profiles",
    when: "starting a new client of any type, or changing a client's details",
    body: `Clients are not only cities: city, county, state agency, tribal nation, tribal organization, nonprofit, utility, company.
- createClient with name, type, state (or country), population served if known, use cases and offer. For a US city, call lookupPublicData first to get the population; size comes from population (Small under 10,000, Mid-size under 100,000, Large under 275,000, Major above).
- For other client types, set size directly from the population served, budget or staff, and say which you used.
- Values resolve in this order: scenario what-if, then the client's own values, then the library. Until a client has its own numbers, the library (Hollywood, FL) numbers are placeholders: say so plainly.
- Localize the biggest drivers first: call listGaps and work down the list.
- Speak to the client type: "the city", "the county", "the nation", "the organization".
- Tribal clients: tribal nations own and govern their data (CARE principles: collective benefit, authority to control, responsibility, ethics). Add a people line for a data sovereignty review and the nation's own consent step, and never assume city programs or rules apply.`,
  },
  {
    id: "city-research",
    title: "Finding a client's own numbers",
    when: "someone asks for local numbers, or listGaps shows placeholders",
    body: `- searchCityDocs works for clients with an indexed document set (Olympia today). Ask a specific question ("storm response overtime 2024 budget"), read the quotes, and only use a number that is stated for that client.
- lookupPublicData gives population and size for US cities.
- Record what you find with fillAssumption, with the source as "Document title, page N" or the public dataset name. It is saved as proposed (teal, "to confirm"). Never mark your own values confirmed; a person confirms them on the Clients tab.
- If a number is for a different year, scope or department, say so in the source and use medium or low confidence.
- If nothing solid is found, keep the placeholder and name the person who would know (risk manager, grants office, public works).`,
  },
  {
    id: "pricing-and-offers",
    title: "Pricing and offers",
    when: "building or changing a price, picking an offer, or comparing with the CitySense ranges",
    body: `- Offers: ROI Snapshot ($35K fixed), Early partner project ($150K fixed, 12 weeks), Ongoing service ($70K a year, range $50K–$90K), CitySense Supported pilot (catalog-priced, public range $150K–$300K, 1–2 use cases), CitySense Full pilot (catalog-priced, public range $750K–$1.2M, 3–5 use cases).
- Catalog items are Sandrine's 22 products, priced by client size, each one-time or yearly. Call listCatalog to see them. One-time work is billed once; the yearly escalator applies to yearly items only.
- The Early partner project price is below the catalog list price for a Mid-size client; describe it as a founding-partner price, not a discount on a finished product.
- Price adjustments (addAdjustment): a percentage or fixed amount with a reason, for year one or every year. Examples: founding-partner discount, nonprofit or tribal rate, grandfathered rate.
- Contracts: years, escalator %, payments (annual, quarterly, monthly). An ongoing offer can follow the main offer from year 2.
- Open question for Ahmed and Marcia: the public CitySense ranges and the catalog prices disagree for some sizes. Report the gap; don't pick a winner.
- Never present ecoheart as having a finished platform or existing pilots; we offer early partner projects shaped with the client.`,
  },
  {
    id: "cost-and-margin",
    title: "Our cost and margin",
    when: "adding team members or SMEs, changing hours or rates, or asking about margin",
    body: `- Cost lines are people (ecoheart team or SMEs), services (hosting, AI usage, data) and shares (a partner or grant covering part of the price).
- People lines have hours, our cost rate, and a charge rate. Leave addToPrice off when the hours are inside a fixed price (they cut margin). Turn it on to bill the hours to the client on top of the price (hours x charge rate).
- An SME example: addCostLine kind people, personType sme, label "Olympia climate and engineering SME", hours 40, costRate 55, payer ecoheart.
- Margin = what we charge minus what it costs us. Our floor is in the workspace (20% by default); validate flags anything below it.
- Margin and internal rates are internal only. Never put them in a client report.`,
  },
  {
    id: "partners-and-funding",
    title: "Partners and funding",
    when: "a third party, partner or grant pays for part of the work",
    body: `- Who pays is a field on every cost line: client, ecoheart, partner or grant.
- A partner or grant covering part of our price: addCostLine kind share, partner name, sharePct or shareAmount, everyYear if it repeats. This lowers what the client pays (and so raises their ROI) but not our revenue.
- A partner paying a cost directly (for example a utility paying an SME): a people or service line with payer partner. It leaves both the client's cost and our margin.
- The client's own spending (micro-grants, its own consultant): payer client. It counts in the client's spend.
- Always name the partner. Check the "who covers what" bar on the Clients tab and in the report.`,
  },
  {
    id: "state-bundles",
    title: "State and regional bundles",
    when: "pricing a state, county group, tribal consortium or region",
    body: `- createBundle with a US state (cities are counted by size from the workbook's city list) or a list of client ids, plus an offer.
- Volume discounts come from the discount table on the Pricing tab (by number of cities; the 751–1,100 band is switched off).
- Results: year-one total, contract total, ARR (yearly part), MRR and quarterly payments. A statewide bundle of every city is a planning ceiling, not a likely deal; say so.
- Open question (ChaiJen): is a state one subscription with many cities, or one per city? The bundle prices one per city.`,
  },
  {
    id: "validation",
    title: "Validation",
    when: "before any report, after building or changing a use case, client or price, or when asked if numbers hold up",
    body: `- Call validate with a scenario id, client id or use-case id. The checks run in code: sources on big drivers, units and ranges, cautious/expected/business order, double counting across use cases, the share of value resting on estimates, placeholders, price inside the offer range, use-case count, margin floor, partner names, HIPAA for non-health clients, tribal data sovereignty, Advisor-proposed values waiting for a person.
- Explain each warn or fail in plain words with one fix. Offer to make the fix; don't make it silently.
- Call sensitivity on a scenario to show the three numbers that matter most and where each breaks even.
- A failing check doesn't block a draft report, but say it is there.`,
  },
  {
    id: "reporting-and-messaging",
    title: "Reports and messaging",
    when: "writing a report, proposal text or anything a client or stakeholder will read",
    body: `- Human-first and plain, no jargon. AI is an accelerator for staff, not a replacement.
- Lead with the answer: net value, return per dollar, payback. Then the biggest driver and the least certain number.
- Run validate first. Mention placeholders and estimates honestly.
- Never claim existing pilots or a finished platform. Frame the ask as an early partner project shaped with the client.
- Use the client's own noun: city, county, nation, agency, organization.
- Never include internal costs, rates or margin in anything for a client.`,
  },
];

export const SKILL_INDEX = SKILLS.map((s) => `- ${s.id}: load when ${s.when}`).join("\n");

export function findSkill(name: unknown): Skill | undefined {
  const k = String(name ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return SKILLS.find((s) => s.id.replace(/[^a-z]/g, "") === k) ?? SKILLS.find((s) => k && (s.id.replace(/[^a-z]/g, "").includes(k) || k.includes(s.id.replace(/[^a-z]/g, ""))));
}
