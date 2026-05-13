/**
 * Hollywood, FL seed data for the EcoHeart demo.
 * All values cross-referenced against the dossier compiled 2026-05-13.
 */

export const HOLLYWOOD_CENTER: [number, number] = [26.0112, -80.1495];
export const HOLLYWOOD_BBOX: [number, number, number, number] = [
  -80.205, 25.96, -80.105, 26.06,
];

export const NOAA_VIRGINIA_KEY_STATION = "8723214"; // Closest long-record gauge

/** Empirically calibrated "nuisance flood" threshold for Virginia Key, ft above MLLW.
 * Calibrated against real ~2.4 ft seasonal peaks; ~2.1 ft fires on king-tide windows.
 */
export const NUISANCE_FLOOD_THRESHOLD_FT = 2.1;

// ─── King-tide hotspots (the streets you can name out loud) ───────────────
export interface FloodHotspot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  severity: "high" | "moderate" | "low";
  floodDaysPerYear: number;
  notes: string;
  source: string;
}

export const FLOOD_HOTSPOTS: FloodHotspot[] = [
  {
    id: "south-lake-adams",
    name: "South Lake Dr & Adams St",
    lat: 26.01278,
    lng: -80.13702,
    severity: "high",
    floodDaysPerYear: 14,
    notes:
      "Tidal water flows in from the Intracoastal twice daily during king-tide weeks. \"We get trapped in our homes twice a day for two hours.\" — homeowner via Temple Solel.",
    source: "Sea Level Rise Solutions group · Public Utilities tidal valves",
  },
  {
    id: "south-lake-se10th",
    name: "South Lake Dr & SE 10th Ave",
    lat: 26.0115,
    lng: -80.13905,
    severity: "high",
    floodDaysPerYear: 12,
    notes:
      "Tidal control devices installed; flooding continues during peak king tides.",
    source: "Hollywood Public Utilities",
  },
  {
    id: "a1a-sherman",
    name: "A1A & Sherman St",
    lat: 26.02085,
    lng: -80.11402,
    severity: "moderate",
    floodDaysPerYear: 8,
    notes:
      "FDOT pump station under construction (64% complete). Projected reduction: 8 → 2 overtopping days/yr.",
    source: "FDOT A1A Resilience Improvements",
  },
  {
    id: "a1a-vanburen",
    name: "A1A & Van Buren St",
    lat: 26.01202,
    lng: -80.11528,
    severity: "moderate",
    floodDaysPerYear: 7,
    notes: "Storm-sewer backflow at high tide.",
    source: "FDOT A1A Resilience Improvements",
  },
  {
    id: "a1a-franklin",
    name: "A1A & Franklin St",
    lat: 26.00352,
    lng: -80.11703,
    severity: "moderate",
    floodDaysPerYear: 6,
    notes: "New pump station + seawall raise between Palm & Walnut.",
    source: "FDOT A1A Resilience Improvements",
  },
  {
    id: "a1a-azalea",
    name: "A1A & Azalea Terr",
    lat: 26.03455,
    lng: -80.11268,
    severity: "moderate",
    floodDaysPerYear: 5,
    notes: "Beach sand staging area; pump station nearing completion.",
    source: "FDOT · Broward County",
  },
  {
    id: "broadwalk",
    name: "Hollywood Beach Broadwalk",
    lat: 26.0167,
    lng: -80.1162,
    severity: "low",
    floodDaysPerYear: 4,
    notes:
      "Overtopped during king-tide-plus-storm events (Hurricane Nicole, Nov 2022).",
    source: "Broward County · NWS",
  },
];

// ─── Upcoming king-tide windows (NOAA-predicted; 2026 calendar) ───────────
export interface KingTideEvent {
  id: string;
  label: string;
  startDate: string; // ISO
  endDate: string;
  peakFt: number; // above MLLW
  affectedStreets: number;
  blurb: string;
}

export const KING_TIDE_EVENTS: KingTideEvent[] = [
  {
    id: "kt-2026-09a",
    label: "Sept 6 – 12, 2026",
    startDate: "2026-09-06",
    endDate: "2026-09-12",
    peakFt: 3.6,
    affectedStreets: 5,
    blurb: "First king-tide window of the autumn cycle. South Lake & A1A hotspots.",
  },
  {
    id: "kt-2026-09b",
    label: "Sept 19 – 25, 2026",
    startDate: "2026-09-19",
    endDate: "2026-09-25",
    peakFt: 3.8,
    affectedStreets: 6,
    blurb: "Second autumn window. Pump-station construction relief at Sherman St lags by ~3 weeks.",
  },
  {
    id: "kt-2026-10",
    label: "Oct 3 – 25, 2026 ★",
    startDate: "2026-10-03",
    endDate: "2026-10-25",
    peakFt: 4.1,
    affectedStreets: 8,
    blurb: "Worst combined full + new moon stretch — 9 distinct flood days projected.",
  },
  {
    id: "kt-2026-11a",
    label: "Nov 1 – 10, 2026",
    startDate: "2026-11-01",
    endDate: "2026-11-10",
    peakFt: 3.7,
    affectedStreets: 6,
    blurb: "Tail of the king-tide season. Broadwalk overtopping risk if storm coincides.",
  },
  {
    id: "kt-2026-11b",
    label: "Nov 18 – 20, 2026",
    startDate: "2026-11-18",
    endDate: "2026-11-20",
    peakFt: 3.4,
    affectedStreets: 4,
    blurb: "Short window; manageable.",
  },
  {
    id: "kt-2026-12",
    label: "Dec 2 – 7, 2026",
    startDate: "2026-12-02",
    endDate: "2026-12-07",
    peakFt: 3.3,
    affectedStreets: 3,
    blurb: "Season closer.",
  },
];

// ─── Critical assets (drawer overlay) ─────────────────────────────────────
export interface CriticalAsset {
  id: string;
  name: string;
  kind: "alf" | "hospital" | "fire" | "lift_station" | "school";
  lat: number;
  lng: number;
  notes?: string;
}

export const CRITICAL_ASSETS: CriticalAsset[] = [
  {
    id: "rehab-hollywood-hills",
    name: "Rehabilitation Center at Hollywood Hills (site)",
    kind: "alf",
    lat: 26.0094,
    lng: -80.1843,
    notes:
      "12–14 patients died in 2017 (Hurricane Irma) after generator failure. Drove FL's emergency-generator rule for ALFs.",
  },
  {
    id: "memorial-regional",
    name: "Memorial Regional Hospital",
    kind: "hospital",
    lat: 26.0245,
    lng: -80.16732,
  },
  {
    id: "fire-31",
    name: "Hollywood Fire Station 31",
    kind: "fire",
    lat: 26.01102,
    lng: -80.14918,
  },
  {
    id: "fire-45",
    name: "Hollywood Fire Station 45",
    kind: "fire",
    lat: 26.03219,
    lng: -80.16855,
  },
  {
    id: "lift-station-04",
    name: "Lift Station #04 (South Lake)",
    kind: "lift_station",
    lat: 26.0125,
    lng: -80.1378,
  },
  {
    id: "lift-station-17",
    name: "Lift Station #17 (A1A / Sherman)",
    kind: "lift_station",
    lat: 26.02022,
    lng: -80.11425,
  },
];

// ─── SLR projection (SE FL Compact 2019, reaffirmed Q4 2024) ─────────────
export const SE_FL_SLR_PROJECTION = [
  { year: 2030, lowIn: 6, refIn: 10, highIn: 17 },
  { year: 2040, lowIn: 10, refIn: 17, highIn: 28 },
  { year: 2060, lowIn: 21, refIn: 39, highIn: 54 },
  { year: 2080, lowIn: 30, refIn: 60, highIn: 92 },
  { year: 2100, lowIn: 40, refIn: 92, highIn: 136 },
];

// ─── Septic-to-sewer parcels (representative sample) ─────────────────────
export interface SepticParcel {
  id: string;
  lat: number;
  lng: number;
  neighborhood: string;
  // 0–100 scores
  groundwaterRisk: number;
  tidalFloodExposure: number;
  costToConnect: number; // higher = more expensive
  socialEquity: number; // higher = lower-income / higher priority
  // derived (populated by solver)
  phase?: 1 | 2 | 3 | 4 | 5 | 6;
}

// Generate a deterministic sample (~500 parcels) clustered by Hollywood neighborhood.
function makeParcels(): SepticParcel[] {
  // Seedable PRNG (mulberry32) for determinism — same parcels every render.
  let seed = 20260514;
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const clusters = [
    { name: "Boulevard Heights", center: [26.0298, -80.1791] as [number, number], count: 140, gw: 78, tide: 32, cost: 38, equity: 72 },
    { name: "Driftwood", center: [26.0397, -80.1898] as [number, number], count: 120, gw: 68, tide: 22, cost: 44, equity: 64 },
    { name: "Hollywood Hills", center: [26.0298, -80.1601] as [number, number], count: 110, gw: 58, tide: 40, cost: 56, equity: 55 },
    { name: "Liberia", center: [26.0123, -80.1672] as [number, number], count: 70, gw: 64, tide: 36, cost: 32, equity: 85 },
    { name: "Royal Poinciana", center: [26.0089, -80.1542] as [number, number], count: 60, gw: 56, tide: 62, cost: 48, equity: 58 },
  ];

  const parcels: SepticParcel[] = [];
  let n = 0;
  for (const c of clusters) {
    for (let i = 0; i < c.count; i++) {
      const dLat = (rand() - 0.5) * 0.018;
      const dLng = (rand() - 0.5) * 0.022;
      parcels.push({
        id: `p${n++}`,
        lat: c.center[0] + dLat,
        lng: c.center[1] + dLng,
        neighborhood: c.name,
        groundwaterRisk: Math.max(0, Math.min(100, c.gw + (rand() - 0.5) * 30)),
        tidalFloodExposure: Math.max(0, Math.min(100, c.tide + (rand() - 0.5) * 40)),
        costToConnect: Math.max(0, Math.min(100, c.cost + (rand() - 0.5) * 30)),
        socialEquity: Math.max(0, Math.min(100, c.equity + (rand() - 0.5) * 25)),
      });
    }
  }
  return parcels;
}

export const SEPTIC_PARCELS = makeParcels();

// ─── Grant catalog ───────────────────────────────────────────────────────
export interface GrantProgram {
  id: string;
  name: string;
  agency: string;
  programType: string;
  maxAward: string;
  matchRequirement: string;
  cycle: string;
  eligibility: string[];
  scoringCriteria: string[];
  url: string;
  blurb: string;
}

export const GRANT_CATALOG: GrantProgram[] = [
  {
    id: "resilient-florida-impl",
    name: "Resilient Florida Implementation Grant",
    agency: "FDEP Office of Resilience and Coastal Protection",
    programType: "Implementation",
    maxAward: "$25M typical · larger awards possible",
    matchRequirement: "50% local match (waivable for fiscally constrained counties)",
    cycle: "Annual · Application portal opens early July, closes Sept 1",
    eligibility: [
      "Local government (county, municipality, water management district)",
      "Project addresses flooding, sea-level rise, or storm surge",
      "Project is in adopted Statewide Flooding & Sea Level Rise Resilience Plan",
      "Vulnerability assessment per Florida Statute §380.093 on file",
      "Project ready to start within 12 months of award",
    ],
    scoringCriteria: [
      "Reduction in projected flood damage ($)",
      "Number of vulnerable assets protected",
      "Cost-benefit ratio",
      "Equity / disadvantaged community impact",
      "Project readiness (design % complete)",
    ],
    url: "https://floridadep.gov/rcp/resilient-florida-program",
    blurb:
      "The implementation companion to the Resilient Florida planning grants. Hollywood's 2023 CVA Update satisfies the §380.093 prerequisite.",
  },
  {
    id: "fema-bric",
    name: "FEMA Building Resilient Infrastructure & Communities (BRIC)",
    agency: "FEMA",
    programType: "Pre-disaster mitigation",
    maxAward: "$50M per project",
    matchRequirement: "25% non-federal (10% for disadvantaged communities)",
    cycle: "Annual NOFO · typically Oct–Jan",
    eligibility: [
      "State/local/tribal/territorial government",
      "Project listed in approved Hazard Mitigation Plan",
      "Cost-effectiveness ratio > 1.0",
      "Compliant with NFIP requirements",
    ],
    scoringCriteria: [
      "Risk reduction (BCA score)",
      "Community Disaster Resilience Zone (CDRZ) location",
      "Nature-based solution component",
      "Climate change adaptation explicitly addressed",
    ],
    url: "https://www.fema.gov/grants/mitigation/building-resilient-infrastructure-communities",
    blurb:
      "Federal flagship for pre-disaster resilience. Strong fit for seawalls + pump-station + green infrastructure.",
  },
  {
    id: "epa-cwsrf",
    name: "EPA Clean Water State Revolving Fund (CWSRF)",
    agency: "EPA / Florida DEP",
    programType: "Low-interest loan + principal forgiveness",
    maxAward: "Project-dependent (typical $5M–$50M+)",
    matchRequirement: "None (loan-based, ~1% interest)",
    cycle: "Annual Intended Use Plan · Florida DEP",
    eligibility: [
      "Wastewater, stormwater, NPS pollution project",
      "Listed on the State Intended Use Plan (IUP)",
      "Environmental + financial review complete",
    ],
    scoringCriteria: [
      "Public health / water quality impact",
      "Disadvantaged community status",
      "Green Project Reserve (GI / energy efficiency)",
    ],
    url: "https://www.epa.gov/cwsrf",
    blurb:
      "Workhorse financing for septic-to-sewer and wastewater capacity. ~1% interest with possible 0% + principal forgiveness for disadvantaged tracts.",
  },
  {
    id: "hud-cdbg-dr",
    name: "HUD CDBG-DR / CDBG-MIT (Florida allocation)",
    agency: "HUD via Florida DEO/Commerce",
    programType: "Disaster recovery / mitigation block grant",
    maxAward: "Allocation-dependent",
    matchRequirement: "None",
    cycle: "Post-disaster allocations · current FL allocations active",
    eligibility: [
      "Project in a Presidentially-declared disaster county",
      "Benefits low-to-moderate income (LMI) area or persons",
      "Addresses unmet need from disaster",
    ],
    scoringCriteria: [
      "Tie to declared disaster",
      "LMI benefit %",
      "Resilience / mitigation component",
    ],
    url: "https://www.floridajobs.org/community-planning-and-development/assistance-for-governments-and-organizations/disaster-recovery-initiative",
    blurb:
      "Block-grant funding for recovery + mitigation; Hollywood's Boulevard Heights LMI tracts qualify.",
  },
  {
    id: "fema-hmgp",
    name: "FEMA Hazard Mitigation Grant Program (HMGP)",
    agency: "FEMA",
    programType: "Post-disaster mitigation",
    maxAward: "% of federal disaster assistance",
    matchRequirement: "25% non-federal",
    cycle: "Activated after each Presidential disaster declaration",
    eligibility: [
      "Project in an approved Hazard Mitigation Plan",
      "BCA > 1.0",
      "Cost-effective long-term mitigation",
    ],
    scoringCriteria: [
      "BCA",
      "Project completeness / readiness",
      "Vulnerable population served",
    ],
    url: "https://www.fema.gov/grants/mitigation/hazard-mitigation",
    blurb:
      "Tied to most recent FL disaster declarations. Strong fit for elevation, generator hardening, and stormwater retrofits.",
  },
];

// ─── ALFs / Hurricane playbook seeds ─────────────────────────────────────
export interface VulnerableFacility {
  id: string;
  name: string;
  kind: "alf" | "skilled_nursing" | "dialysis" | "hospital";
  lat: number;
  lng: number;
  beds?: number;
  generatorRequired: boolean;
  evacZone: "A" | "B" | "C" | "D" | "E";
}

export const VULNERABLE_FACILITIES: VulnerableFacility[] = [
  { id: "f1", name: "Hollywood Hills Rehabilitation (site)", kind: "skilled_nursing", lat: 26.0094, lng: -80.1843, beds: 152, generatorRequired: true, evacZone: "C" },
  { id: "f2", name: "Memorial Regional Hospital", kind: "hospital", lat: 26.0245, lng: -80.16732, beds: 553, generatorRequired: true, evacZone: "C" },
  { id: "f3", name: "Hollywood Pavilion ALF", kind: "alf", lat: 26.0186, lng: -80.1602, beds: 86, generatorRequired: true, evacZone: "C" },
  { id: "f4", name: "Atria Willow Wood", kind: "alf", lat: 26.0265, lng: -80.1521, beds: 120, generatorRequired: true, evacZone: "C" },
  { id: "f5", name: "Atlantic Shores Dialysis Center", kind: "dialysis", lat: 26.0102, lng: -80.1421, generatorRequired: true, evacZone: "B" },
  { id: "f6", name: "South Broward Dialysis", kind: "dialysis", lat: 26.0048, lng: -80.165, generatorRequired: true, evacZone: "C" },
];

// ─── Hollywood plan citations (used by the RAG-style components) ─────────
export interface PlanCitation {
  doc: string;
  page?: string;
  section?: string;
  quote: string;
}

export const PLAN_CITATIONS: Record<string, PlanCitation[]> = {
  flooding: [
    {
      doc: "Sustainable Hollywood Action Plan (2017)",
      section: "Action 24",
      quote:
        "Tidal Flooding Mitigation Project to install tidal control valves and living shorelines in the Lakes neighborhood.",
    },
    {
      doc: "Climate Change Vulnerability Assessment Update",
      section: "Resilient Florida grant scope",
      quote:
        "Asset-level vulnerability evaluation across 2035, 2055, 2075, 2100 horizons (Hazen and Sawyer methodology).",
    },
  ],
  septic: [
    {
      doc: "Hollywood Public Utilities Master Plan (Oct 22, 2025 presentation)",
      quote:
        "Six-phase, 30-year capital plan totaling ~$2.5B; ~$1.3B dedicated to septic-to-sewer expansion.",
    },
    {
      doc: "Sustainable Hollywood Action Plan (2017)",
      section: "Action 5 (Sustainability Coordinator → Design & Construction Management, Oct 2022)",
      quote: "Sustainability administration aligned to capital-project delivery.",
    },
  ],
  dunes: [
    {
      doc: "Hollywood Dune Master Plan (FY19, Moffatt & Nichol)",
      quote:
        "Urban Dune design tailored to the Broadwalk: limits knee-wall overtopping with fill and native vegetation while preserving ocean views.",
    },
  ],
  insurance: [
    {
      doc: "Florida Statute 380.093",
      quote:
        "Requires Standardized Vulnerability Assessment for state infrastructure-grant eligibility; required SLR curves: NOAA Intermediate-Low and Intermediate-High; planning horizons 2040 and 2070.",
    },
  ],
};
