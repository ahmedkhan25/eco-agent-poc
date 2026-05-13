import type { SystemModel } from "@/lib/systems-modeler/types";

/**
 * Three pre-built SystemModel JSONs — one per adaptation pathway.
 * Designed to load into the existing CausalLoopDiagram component (D3 force layout).
 */

export const ARMORING_MODEL: SystemModel = {
  name: "Armoring — Seawalls + Pumps",
  description:
    "Engineering-led pathway: raise seawalls, install pump stations, harden infrastructure. Protects current development footprint at the cost of long-term lock-in and ecological tradeoffs.",
  nodes: [
    { id: "slr", label: "Sea-Level Rise", desc: "Compact 2019 unified projection (reaffirmed 2024).", category: "environment", key: true, example: "≈ 1 ft by 2040, 3.5 ft by 2080 (Compact ref curve)" },
    { id: "armor", label: "Seawall &amp; Pump Investment", desc: "Capital spend on hard infrastructure — FDOT A1A pumps, ULDR-style seawall heights.", category: "solution", key: true, example: "$500M Fortify Lauderdale; ~200 tidal valves installed" },
    { id: "tax", label: "Property Tax Base", desc: "Assessed value supporting the General Fund and CIP.", category: "economic", key: true },
    { id: "insurance", label: "Insurance Premiums", desc: "Carrier pricing for wind &amp; flood; Citizens-vs-private mix.", category: "economic" },
    { id: "newdev", label: "New Construction in Flood Zone", desc: "Permits issued in AE/VE; barrier-island redevelopment.", category: "pressure" },
    { id: "cat", label: "Catastrophic Exposure", desc: "Aggregate $ at risk if armoring fails.", category: "pressure", key: true },
    { id: "tourism", label: "Tourism &amp; Broadwalk Revenue", desc: "Visitor-day spend; hotel occupancy.", category: "economic" },
    { id: "wetlands", label: "Coastal Wetland &amp; Beach Width", desc: "Living-shoreline buffer; nesting habitat.", category: "environment" },
    { id: "ghg", label: "GHG Emissions (Embodied)", desc: "Concrete + steel emissions from hardening.", category: "pressure" },
    { id: "equity", label: "Equity / LMI Burden", desc: "Cost-share borne by lower-income tracts via tax base.", category: "social" },
  ],
  links: [
    { source: "slr", target: "armor", type: "balancing", label: "+", lag: "Years" },
    { source: "armor", target: "cat", type: "balancing", label: "-", lag: "Immediate" },
    { source: "armor", target: "tax", type: "reinforcing", label: "+", lag: "1–5 Years" },
    { source: "tax", target: "armor", type: "reinforcing", label: "+", lag: "Years" },
    { source: "armor", target: "insurance", type: "balancing", label: "-", lag: "1–3 Years" },
    { source: "insurance", target: "newdev", type: "balancing", label: "-", lag: "Years" },
    { source: "armor", target: "newdev", type: "reinforcing", label: "+", lag: "5+ Years" },
    { source: "newdev", target: "cat", type: "reinforcing", label: "+", lag: "10+ Years" },
    { source: "newdev", target: "tax", type: "reinforcing", label: "+", lag: "Years" },
    { source: "armor", target: "wetlands", type: "balancing", label: "-", lag: "Decades" },
    { source: "wetlands", target: "tourism", type: "reinforcing", label: "+", lag: "Years" },
    { source: "tourism", target: "tax", type: "reinforcing", label: "+", lag: "Annual" },
    { source: "armor", target: "ghg", type: "reinforcing", label: "+", lag: "Construction" },
    { source: "armor", target: "equity", type: "reinforcing", label: "+", lag: "Years" },
  ],
  loops: [
    {
      id: "R1",
      type: "R",
      name: "Investment lock-in",
      desc: "Armoring protects the tax base, which funds more armoring, which attracts new development in the same flood zone, which raises catastrophic exposure.",
      nodes: ["armor", "tax", "armor"],
    },
    {
      id: "R2",
      type: "R",
      name: "Build-back-bigger",
      desc: "Insurance availability + hard protection encourages new construction in flood zones, increasing future loss potential.",
      nodes: ["insurance", "newdev", "cat"],
    },
    {
      id: "B1",
      type: "B",
      name: "Ecological erosion",
      desc: "Seawall hardening reduces living-shoreline buffer and beach width, eventually undermining the tourism revenue that supports the tax base.",
      nodes: ["armor", "wetlands", "tourism", "tax"],
    },
  ],
  archetypes: [
    {
      id: "fixes-that-fail",
      name: "Fixes that Fail",
      description: "Armoring resolves visible flooding short-term but creates higher catastrophic exposure long-term as development moves back into the protected zone.",
      relatedLoops: ["R1", "R2"],
    },
  ],
};

export const ACCOMMODATION_MODEL: SystemModel = {
  name: "Accommodation — Raise, Floodproof, Adapt",
  description:
    "Parcel-by-parcel adaptation: elevate buildings, floodproof ground floors, retrofit infrastructure. Distributes the burden, slows growth, preserves the urban form.",
  nodes: [
    { id: "slr", label: "Sea-Level Rise", desc: "Compact 2019 unified projection.", category: "environment", key: true },
    { id: "elev", label: "Building Elevation Program", desc: "FBC §1620 freeboard above BFE; ASCE 24 retrofits.", category: "solution", key: true },
    { id: "fp", label: "Floodproofing &amp; Backflow", desc: "Dry/wet floodproofing, tidal valves, raised utilities.", category: "solution" },
    { id: "cost", label: "Per-parcel Compliance Cost", desc: "Out-of-pocket retrofit cost; CDBG forgiveness loans available.", category: "economic", key: true },
    { id: "insurance", label: "Insurance Premiums", desc: "NFIP + private carrier pricing.", category: "economic" },
    { id: "equity", label: "Equity / LMI Burden", desc: "Lower-income parcels face higher relative cost.", category: "social", key: true },
    { id: "stay", label: "In-place Population Retention", desc: "Households remaining in their neighborhood.", category: "population" },
    { id: "tourism", label: "Tourism &amp; Tax Base", desc: "Broadwalk + downtown revenue.", category: "economic" },
    { id: "ghg", label: "Embodied GHG (Retrofit)", desc: "Materials emissions per retrofit.", category: "pressure" },
    { id: "cap", label: "City CIP Capacity", desc: "Stormwater + seawall capital projects.", category: "policy" },
  ],
  links: [
    { source: "slr", target: "elev", type: "balancing", label: "+", lag: "Years" },
    { source: "elev", target: "cost", type: "reinforcing", label: "+", lag: "Immediate" },
    { source: "cost", target: "equity", type: "reinforcing", label: "+", lag: "Immediate" },
    { source: "equity", target: "stay", type: "balancing", label: "-", lag: "Years" },
    { source: "elev", target: "insurance", type: "balancing", label: "-", lag: "1–3 Years" },
    { source: "fp", target: "insurance", type: "balancing", label: "-", lag: "1–3 Years" },
    { source: "insurance", target: "stay", type: "reinforcing", label: "+", lag: "Years" },
    { source: "stay", target: "tourism", type: "reinforcing", label: "+", lag: "Years" },
    { source: "tourism", target: "cap", type: "reinforcing", label: "+", lag: "Annual" },
    { source: "cap", target: "elev", type: "reinforcing", label: "+", lag: "Years" },
    { source: "elev", target: "ghg", type: "reinforcing", label: "+", lag: "Construction" },
    { source: "slr", target: "fp", type: "balancing", label: "+", lag: "Years" },
  ],
  loops: [
    {
      id: "R1",
      type: "R",
      name: "Insurance virtuous loop",
      desc: "Elevations + floodproofing → lower premiums → households can afford to stay → tax base preserved → CIP funds more retrofits.",
      nodes: ["elev", "insurance", "stay", "tourism", "cap"],
    },
    {
      id: "B1",
      type: "B",
      name: "Equity drag",
      desc: "Compliance cost burdens lower-income parcels, reducing the share of households that can afford to stay.",
      nodes: ["cost", "equity", "stay"],
    },
  ],
  archetypes: [
    {
      id: "tragedy-of-the-commons",
      name: "Tragedy of the Commons (Inverted)",
      description: "Accommodation only works if compliance is broadly distributed — uneven adoption leaves laggard parcels as failure nodes.",
      relatedLoops: ["R1", "B1"],
    },
  ],
};

export const RETREAT_MODEL: SystemModel = {
  name: "Managed Retreat — Buyouts &amp; TDRs",
  description:
    "Strategic relocation: voluntary buyouts in the highest-risk zones, transfer of development rights to inland tracts, conversion of risk zones to wetland.",
  nodes: [
    { id: "slr", label: "Sea-Level Rise", desc: "Compact 2019 unified projection.", category: "environment", key: true },
    { id: "buyout", label: "Voluntary Buyouts (HMGP)", desc: "FEMA-funded acquisition of repetitive-loss properties.", category: "policy", key: true },
    { id: "tdr", label: "Transfer of Development Rights", desc: "Density credits transferred to upland tracts.", category: "policy" },
    { id: "inland", label: "Inland Development", desc: "Higher-density development in receiving tracts.", category: "pressure" },
    { id: "wet", label: "Restored Wetland &amp; Living Shoreline", desc: "Acquired parcels rewilded as ecological buffer.", category: "environment", key: true },
    { id: "tax", label: "Tax Base Erosion (Coastal)", desc: "Loss of assessed value in retreated zones.", category: "economic", key: true },
    { id: "tax_inland", label: "Tax Base Growth (Inland)", desc: "Receiving-tract assessed value.", category: "economic" },
    { id: "equity", label: "Community Displacement", desc: "Cultural &amp; social cost of relocation.", category: "social", key: true },
    { id: "cat", label: "Catastrophic Exposure", desc: "Lifetime $ at risk.", category: "pressure" },
    { id: "tourism", label: "Tourism Revenue (Broadwalk)", desc: "Broadwalk-anchored visitor revenue.", category: "economic" },
  ],
  links: [
    { source: "slr", target: "buyout", type: "balancing", label: "+", lag: "Decades" },
    { source: "buyout", target: "wet", type: "reinforcing", label: "+", lag: "Years" },
    { source: "wet", target: "cat", type: "balancing", label: "-", lag: "Decades" },
    { source: "buyout", target: "tax", type: "reinforcing", label: "-", lag: "Immediate" },
    { source: "buyout", target: "equity", type: "reinforcing", label: "+", lag: "Years" },
    { source: "buyout", target: "tdr", type: "reinforcing", label: "+", lag: "1–3 Years" },
    { source: "tdr", target: "inland", type: "reinforcing", label: "+", lag: "3–10 Years" },
    { source: "inland", target: "tax_inland", type: "reinforcing", label: "+", lag: "Years" },
    { source: "tax_inland", target: "tax", type: "balancing", label: "-", lag: "Decades" },
    { source: "wet", target: "tourism", type: "reinforcing", label: "+", lag: "5–10 Years" },
    { source: "tourism", target: "tax_inland", type: "reinforcing", label: "+", lag: "Annual" },
  ],
  loops: [
    {
      id: "B1",
      type: "B",
      name: "Risk reduction loop",
      desc: "Buyouts → wetland restoration → reduced catastrophic exposure over decades.",
      nodes: ["buyout", "wet", "cat"],
    },
    {
      id: "R1",
      type: "R",
      name: "TDR rebalancing",
      desc: "Buyouts unlock development rights → inland intensification → inland tax base growth compensates coastal loss.",
      nodes: ["buyout", "tdr", "inland", "tax_inland"],
    },
  ],
  archetypes: [
    {
      id: "shifting-the-burden",
      name: "Shifting the Burden",
      description: "Managed retreat shifts the burden from disaster recovery (reactive) to land-use redesign (proactive) — but introduces displacement cost.",
      relatedLoops: ["B1", "R1"],
    },
  ],
};

export const PATHWAY_MODELS = {
  armoring: ARMORING_MODEL,
  accommodation: ACCOMMODATION_MODEL,
  retreat: RETREAT_MODEL,
};

// ── Pre-written "Humanize" narratives (avoid live LLM dependency on demo day) ──
export const PATHWAY_NARRATIVES: Record<keyof typeof PATHWAY_MODELS, string> = {
  armoring: `**The Engineer's Pathway.** Marisol has lived in the Lakes neighborhood for 24 years. The seawall raise on her block — the one Public Utilities argued for, the one the City Commission approved unanimously after the Oct 2025 master-plan presentation — went in last spring. She doesn't see the king tides anymore. Her flood insurance dropped 18%. The neighbor across the street, a contractor named Ray, just broke ground on a $1.2M build on a parcel that flooded twice a year through 2023.

Five blocks west, at A1A and Sherman, Dennis Levin manages a 14-room hotel that survived Hurricane Nicole by inches. FDOT's new pump station is 64% complete, and Dennis is already planning the next renovation cycle. He doesn't think about sea-level rise the way Marisol does, because the engineering has, for now, made it invisible. The city has bought him another twenty years.

But Maria, who runs a sea-turtle monitoring crew with the Project ROC volunteers, watches the beach narrow each year. The seawall stops the water — and stops the dune from migrating inland. The 42 nests she counted on Zone 3 last season may be 30 next year. The Broadwalk is brilliantly engineered and slowly drained of the ecology it was built to celebrate. **Armoring buys time. It does not buy a future.**`,

  accommodation: `**The Homeowner's Pathway.** When the city's accommodation program rolled out — modeled on Miami Beach's Sunset Harbour playbook but funded with Resilient Florida + CDBG — the first cohort was 487 homes in Driftwood and Hollywood Hills. Mr. Eduardo Reyes elevated his bungalow on Cleveland St using the zero-interest CDBG forgiveness loan, abandoned the septic tank, hooked into the new sewer main, and replaced his old AC with a heat-pump unit pre-staged for the 2030 grid update.

It took 11 months. His daughter cried twice. His mother-in-law moved in for the duration. But when Hurricane Iris brushed past in 2027, his ground floor stayed dry, his power flickered for 14 hours instead of 5 days, and his flood insurance — the one the new private carrier picked up after Citizens depopulated his policy in 2026 — held its rating.

Across town in Liberia, the Velazquez family applied for the same program. Their cost share, after CDBG, was $9,400 — most of their savings. They paused. Then they applied. Then they discovered the contractor backlog stretched 19 months. Their bungalow flooded twice the next summer. **Accommodation works at the parcel scale. It works at the city scale only if the city carries the laggards through.**`,

  retreat: `**The Civic Pathway.** It was Mayor Levy's second term, and the buyout pilot — 36 parcels in the lowest stretch of South Lake — had been on the table for three years. The Sustainability Advisory Committee had argued for it. The CVA Update made the actuarial case undeniable. And the families themselves, after one too many tidal flood weeks, had asked.

The Lakes Pilot took five years. Thirty-two of the 36 households accepted. The four holdouts stayed; the city built them new tidal valves and a slightly raised street and asked nothing of them. Where the houses had been, the Public Utilities team and the Project ROC volunteers planted sea oats and railroad vine. By 2034 it was a city park, then a sponge, then — by 2042 — a recognizable salt marsh again.

The tax base of the Lakes dropped 11%. The TDR transfers — moved to the Boulevard Heights corridor, where the new sewer mains had created developable density — added back 19%, mostly in affordable housing the city had needed for a decade. The Compact's 2019 Q4 projection, reaffirmed yet again in 2034, predicted what the marsh now buffered. **Retreat, when it works, doesn't feel like loss. It feels like the city finally choosing what it wanted to be.**`,
};

// ── Aha! Paradox collision: Healthcare Staffing Crisis ──
export interface CollisionEdge { from: string; to: string; lag: string; label: string }
export interface AhaCollision {
  concept: string;
  loadbearingDelusion: string;
  newEdges: CollisionEdge[];
  isomorphMapping: string;
  newAnnotation: string;
}

export const HEALTHCARE_STAFFING_COLLISION: AhaCollision = {
  concept: "Healthcare staffing crisis",
  loadbearingDelusion:
    "We've been modeling resilience as a property/infrastructure problem. The 2017 Hollywood Hills tragedy was not, ultimately, an HVAC failure — it was a staffing-availability failure (locums couldn't reach the facility, generators were under-maintained because the contract was outsourced). Climate adaptation is fundamentally a workforce-availability problem.",
  newEdges: [
    { from: "armor", to: "stay", lag: "Years", label: "+ (Healthcare workforce stays if Cat. exposure low)" },
    { from: "cat", to: "stay", lag: "Years", label: "- (Repeated trauma drives clinical workforce out)" },
    { from: "stay", to: "tourism", lag: "Annual", label: "+ (Tourism workforce overlap with healthcare)" },
  ],
  isomorphMapping:
    "The seawall is to the building as the on-call ALF director is to the facility. Both are 'fixes that fail' if the supporting workforce — maintenance contractors, locum nurses, generator technicians — exits the region under repeated stress.",
  newAnnotation:
    "Reference: 2017 Rehabilitation Center at Hollywood Hills generator failure following Hurricane Irma — 12–14 patient deaths drove Florida's emergency-generator rule for ALFs. The lesson: hardening the building without anchoring the workforce produces brittle resilience.",
};
