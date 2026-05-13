/**
 * Seed data for the 8 Phase-2 concept pages.
 * All values cross-referenced against the Hollywood research dossier (2026-05-13).
 * These pages are static — no live AI calls, just deterministic mockups.
 */

// ─── A1A Coastal Vulnerability ─────────────────────────────────────────
export interface PumpStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  percentComplete: number;
  spentM: number;
  budgetM: number;
  reductionDaysCurrent: number;
  reductionDaysProjected: number;
  status: "active" | "design" | "complete";
}

export const A1A_PUMP_STATIONS: PumpStation[] = [
  {
    id: "azalea",
    name: "Azalea Terr Pump Station",
    lat: 26.03455,
    lng: -80.11268,
    percentComplete: 91,
    spentM: 5.8,
    budgetM: 6.4,
    reductionDaysCurrent: 5,
    reductionDaysProjected: 1,
    status: "active",
  },
  {
    id: "vanburen",
    name: "Van Buren St Pump Station",
    lat: 26.01202,
    lng: -80.11528,
    percentComplete: 73,
    spentM: 4.1,
    budgetM: 5.6,
    reductionDaysCurrent: 7,
    reductionDaysProjected: 2,
    status: "active",
  },
  {
    id: "sherman",
    name: "Sherman St Pump Station",
    lat: 26.02085,
    lng: -80.11402,
    percentComplete: 64,
    spentM: 4.2,
    budgetM: 6.5,
    reductionDaysCurrent: 8,
    reductionDaysProjected: 2,
    status: "active",
  },
  {
    id: "franklin",
    name: "Franklin St Pump Station",
    lat: 26.00352,
    lng: -80.11703,
    percentComplete: 38,
    spentM: 2.4,
    budgetM: 6.2,
    reductionDaysCurrent: 6,
    reductionDaysProjected: 2,
    status: "active",
  },
];

export interface SeawallSegment {
  id: string;
  name: string;
  currentFt: number;
  recommended2060Ft: number;
  lengthFt: number;
}

export const SEAWALL_SEGMENTS: SeawallSegment[] = [
  { id: "sw1", name: "Sherman → Sheridan", currentFt: 4.5, recommended2060Ft: 6.5, lengthFt: 2400 },
  { id: "sw2", name: "Palm → Walnut", currentFt: 4.8, recommended2060Ft: 6.5, lengthFt: 1800 },
  { id: "sw3", name: "Garfield → Tyler", currentFt: 5.1, recommended2060Ft: 6.5, lengthFt: 2200 },
  { id: "sw4", name: "Polk → Buchanan", currentFt: 4.2, recommended2060Ft: 6.5, lengthFt: 1600 },
  { id: "sw5", name: "Filmore → Pierce", currentFt: 5.4, recommended2060Ft: 6.5, lengthFt: 1900 },
  { id: "sw6", name: "Roosevelt → Lincoln", currentFt: 4.6, recommended2060Ft: 6.5, lengthFt: 2100 },
];

export interface DuneZone {
  id: string;
  name: string;
  cover: number; // % native vegetation
  lastRestored: string;
  nestCount: number;
}

export const DUNE_ZONES: DuneZone[] = [
  { id: "z1", name: "Zone 1 (Hallandale Blvd → Polk)", cover: 52, lastRestored: "2024", nestCount: 38 },
  { id: "z2", name: "Zone 2 (Polk → Buchanan)", cover: 41, lastRestored: "2023", nestCount: 31 },
  { id: "z3", name: "Zone 3 (Garfield → Tyler)", cover: 38, lastRestored: "2022", nestCount: 42 },
  { id: "z4", name: "Zone 4 (Tyler → McKinley)", cover: 47, lastRestored: "2024", nestCount: 26 },
  { id: "z5", name: "Zone 5 (McKinley → Sheridan)", cover: 33, lastRestored: "2021", nestCount: 22 },
];

// ─── Tree Canopy & Heat Island ─────────────────────────────────────────
export interface CanopyBlock {
  id: string;
  name: string;
  neighborhood: string;
  lat: number;
  lng: number;
  canopyPct: number; // current
  hviScore: number; // Heat Vulnerability Index 0-100
  heatIndex2040: number; // projected °F days >100
  recommendedTrees: number;
  costUsd: number;
  population: number;
}

export const CANOPY_BLOCKS: CanopyBlock[] = [
  { id: "b1", name: "Block 0341", neighborhood: "South Central Hollywood", lat: 26.0098, lng: -80.1638, canopyPct: 8, hviScore: 84, heatIndex2040: 53, recommendedTrees: 240, costUsd: 72000, population: 2140 },
  { id: "b2", name: "Block 0218", neighborhood: "Liberia", lat: 26.0156, lng: -80.1714, canopyPct: 9, hviScore: 79, heatIndex2040: 51, recommendedTrees: 220, costUsd: 66000, population: 1980 },
  { id: "b3", name: "Block 0427", neighborhood: "Driftwood", lat: 26.0405, lng: -80.1882, canopyPct: 11, hviScore: 71, heatIndex2040: 49, recommendedTrees: 195, costUsd: 58500, population: 1650 },
  { id: "b4", name: "Block 0512", neighborhood: "Boulevard Heights", lat: 26.0301, lng: -80.1795, canopyPct: 12, hviScore: 68, heatIndex2040: 47, recommendedTrees: 180, costUsd: 54000, population: 1820 },
  { id: "b5", name: "Block 0608", neighborhood: "Hollywood Hills", lat: 26.0285, lng: -80.1604, canopyPct: 14, hviScore: 62, heatIndex2040: 46, recommendedTrees: 165, costUsd: 49500, population: 1730 },
  { id: "b6", name: "Block 0719", neighborhood: "Hollywood Lakes", lat: 26.0129, lng: -80.1492, canopyPct: 15, hviScore: 58, heatIndex2040: 45, recommendedTrees: 150, costUsd: 45000, population: 1420 },
  { id: "b7", name: "Block 0833", neighborhood: "Royal Poinciana", lat: 26.0087, lng: -80.1548, canopyPct: 16, hviScore: 55, heatIndex2040: 44, recommendedTrees: 140, costUsd: 42000, population: 1380 },
  { id: "b8", name: "Block 0941", neighborhood: "Emerald Hills", lat: 26.041, lng: -80.1571, canopyPct: 18, hviScore: 51, heatIndex2040: 43, recommendedTrees: 125, costUsd: 37500, population: 1290 },
  { id: "b9", name: "Block 1028", neighborhood: "Park East", lat: 26.0203, lng: -80.151, canopyPct: 19, hviScore: 49, heatIndex2040: 42, recommendedTrees: 110, costUsd: 33000, population: 1110 },
  { id: "b10", name: "Block 1144", neighborhood: "Quadomain", lat: 26.0089, lng: -80.117, canopyPct: 21, hviScore: 45, heatIndex2040: 41, recommendedTrees: 95, costUsd: 28500, population: 980 },
];

export const HOLLYWOOD_CANOPY_AVG = 18; // percent

// ─── Stormwater Outfall + Water Quality ────────────────────────────────
export interface Outfall {
  id: string;
  name: string;
  lat: number;
  lng: number;
  receivingWater: "Intracoastal" | "Atlantic" | "Canal";
  septicWithin500ft: number;
  recentEcoli: number; // CFU/100mL
  status: "exceedance" | "watch" | "ok";
  exceedances12mo: number;
}

export const OUTFALLS: Outfall[] = [
  { id: "of-34", name: "Outfall #34 (Garfield St)", lat: 26.01685, lng: -80.13901, receivingWater: "Intracoastal", septicWithin500ft: 38, recentEcoli: 540, status: "exceedance", exceedances12mo: 8 },
  { id: "of-27", name: "Outfall #27 (Adams St)", lat: 26.01275, lng: -80.13701, receivingWater: "Intracoastal", septicWithin500ft: 42, recentEcoli: 612, status: "exceedance", exceedances12mo: 11 },
  { id: "of-19", name: "Outfall #19 (Tyler St)", lat: 26.01089, lng: -80.13905, receivingWater: "Intracoastal", septicWithin500ft: 31, recentEcoli: 380, status: "exceedance", exceedances12mo: 6 },
  { id: "of-42", name: "Outfall #42 (Sheridan St)", lat: 26.03098, lng: -80.13851, receivingWater: "Intracoastal", septicWithin500ft: 24, recentEcoli: 290, status: "watch", exceedances12mo: 3 },
  { id: "of-08", name: "Outfall #08 (Hollywood Blvd)", lat: 26.0167, lng: -80.16002, receivingWater: "Canal", septicWithin500ft: 18, recentEcoli: 410, status: "exceedance", exceedances12mo: 5 },
  { id: "of-51", name: "Outfall #51 (Pierce St)", lat: 26.018, lng: -80.139, receivingWater: "Intracoastal", septicWithin500ft: 27, recentEcoli: 188, status: "watch", exceedances12mo: 2 },
  { id: "of-12", name: "Outfall #12 (Polk St)", lat: 26.00802, lng: -80.13902, receivingWater: "Intracoastal", septicWithin500ft: 22, recentEcoli: 95, status: "ok", exceedances12mo: 0 },
  { id: "of-66", name: "Outfall #66 (Atlantic Shores)", lat: 26.0078, lng: -80.116, receivingWater: "Atlantic", septicWithin500ft: 4, recentEcoli: 62, status: "ok", exceedances12mo: 0 },
];

// 24 months of monthly samples for the top-alert outfall, with seasonal pattern.
function makeBacteriaSeries(seed: number, baseline: number): { month: string; ecoli: number; rainfallIn: number; tideFt: number }[] {
  let s = seed;
  const rand = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const months = ["Jun '24", "Jul '24", "Aug '24", "Sep '24", "Oct '24", "Nov '24", "Dec '24", "Jan '25", "Feb '25", "Mar '25", "Apr '25", "May '25", "Jun '25", "Jul '25", "Aug '25", "Sep '25", "Oct '25", "Nov '25", "Dec '25", "Jan '26", "Feb '26", "Mar '26", "Apr '26", "May '26"];
  return months.map((m, i) => {
    // Higher in wet season (Jun-Oct) — months 0-4, 12-16
    const wet = (i % 12 >= 0 && i % 12 <= 4) ? 1 : 0.4;
    const ecoli = Math.round(baseline + baseline * wet * (0.6 + rand() * 1.2));
    return {
      month: m,
      ecoli,
      rainfallIn: Number((wet * (3 + rand() * 6)).toFixed(1)),
      tideFt: Number((2.0 + rand() * 0.8).toFixed(2)),
    };
  });
}

export const OUTFALL_SERIES = makeBacteriaSeries(20260514, 250);

// ─── Code Assistant ────────────────────────────────────────────────────
export const QUICK_QUESTIONS = [
  "Minimum freeboard above BFE in Hollywood?",
  "Garage door wind rating for HVHZ?",
  "Seawall top elevation requirement?",
  "Solar setback from property line?",
  "EV charger permit requirements?",
  "Tree removal permit thresholds?",
  "Tidal valve installation requirements?",
  "ALF emergency generator standards?",
];

export interface CodeAnswer {
  question: string;
  body: string;
  citations: { doc: string; section: string; page: string; quote: string }[];
}

export const SEEDED_ANSWERS: Record<string, CodeAnswer> = {
  freeboard: {
    question: "Minimum freeboard above BFE in Hollywood?",
    body:
      "Hollywood requires the lowest finished floor of new construction in Special Flood Hazard Areas to be elevated to or above the Base Flood Elevation (BFE) plus 1 foot of freeboard. For Coastal A Zones (LiMWA) and VE Zones the requirement increases to BFE + 2 ft, consistent with ASCE 24-14 Flood Design Class 2 — the standard Florida Building Code (FBC) 8th Edition adopts by reference.\n\nNote: many parts of Hollywood are seaward of the Limit of Moderate Wave Action (LiMWA), so the 2 ft freeboard applies more broadly than it would inland.",
    citations: [
      { doc: "Florida Building Code 8th Edition (2023)", section: "§1612.3", page: "236", quote: "Buildings and structures shall be designed and constructed in accordance with the provisions of ASCE 24." },
      { doc: "ASCE 24-14", section: "Table 2-1", page: "9", quote: "Flood Design Class 2: BFE + 1 ft (or DFE, whichever is greater). For Coastal A and V Zones: BFE + 2 ft." },
      { doc: "Hollywood Code of Ordinances", section: "§ 117-04.A.6", page: "—", quote: "Lowest finished floor elevation shall be no less than the BFE plus one (1) foot freeboard." },
    ],
  },
  garage: {
    question: "Garage door wind rating for HVHZ?",
    body:
      "Garage doors in Hollywood (entirely within the High-Velocity Hurricane Zone) must be rated for the local design wind speed — typically 170+ mph (Risk Category II). Doors must carry a Miami-Dade NOA or Florida Product Approval for impact resistance under TAS 201/202/203 (large and small missile impact). Single-family garage doors at coastal sites typically need a +DP/-DP rating of at least ±50 psf for one-story applications.",
    citations: [
      { doc: "Florida Building Code 8th Edition (2023)", section: "§1620.1.5", page: "302", quote: "All exterior glazing and door assemblies in the HVHZ shall be impact-resistant per TAS 201 and TAS 203." },
      { doc: "FBC Test Application Standards", section: "TAS 201-94", page: "—", quote: "Impact Test Procedures for Exterior Wall Coverings." },
    ],
  },
  seawall: {
    question: "Seawall top elevation requirement?",
    body:
      "Hollywood does not yet have an adopted minimum seawall top elevation citywide, though the city's Climate Vulnerability Assessment recommends 6.5 ft NAVD88 by 2060 to align with the Southeast Florida Compact's reference SLR curve. Fort Lauderdale's ULDR § 47-19.3 (adopted March 2023) sets a 5 ft NAVD88 minimum today, rising to 6 ft by 2035. Hollywood's draft 2050 Comprehensive Plan is expected to follow Fort Lauderdale's model.",
    citations: [
      { doc: "Hollywood Climate Change Vulnerability Assessment (Hazen and Sawyer)", section: "Recommendation 7", page: "87", quote: "Establish a citywide minimum seawall top elevation of 6.5 ft NAVD88 by 2060." },
      { doc: "Fort Lauderdale ULDR", section: "§ 47-19.3", page: "—", quote: "All new and reconstructed seawalls along navigable waters shall be a minimum of 5.0 ft NAVD88." },
      { doc: "SE FL Climate Compact 2019 Unified SLR Projection", section: "Compact ref curve", page: "12", quote: "Approximately 1.5 ft SLR by 2060 (50th percentile)." },
    ],
  },
};

// ─── Tourism-Climate Feedback Loop (CLD seed) ──────────────────────────
import type { SystemModel } from "@/lib/systems-modeler/types";

export const TOURISM_CLIMATE_MODEL: SystemModel = {
  name: "Tourism × Climate Feedback Loop — Hollywood Broadwalk",
  description:
    "How storm frequency, beach width, tourism revenue, and resilience CIP capacity interact. Use this to make the case that resilience spending is revenue protection, not optional.",
  nodes: [
    { id: "storm", label: "Storm Frequency", desc: "Hurricane + tropical storm passes per year impacting Broward.", category: "environment", key: true },
    { id: "beach", label: "Beach Width", desc: "Hollywood Beach sand depth and dune buffer.", category: "environment", key: true },
    { id: "broadwalk", label: "Broadwalk Visitor-Days", desc: "Annual visitor-days along the 2.5-mile Broadwalk.", category: "economic", key: true },
    { id: "hotels", label: "Hotel Occupancy", desc: "Annual occupancy rate at beachfront hotels.", category: "economic" },
    { id: "tax", label: "Sales + Bed Tax Revenue", desc: "Combined tourism-driven tax revenue to General Fund.", category: "economic", key: true },
    { id: "cip", label: "Resilience CIP Capacity", desc: "$ available for pump stations, dune restoration, seawalls.", category: "policy", key: true },
    { id: "insurance", label: "Insurance Premiums (Beachfront)", desc: "Commercial property insurance for hotels + restaurants.", category: "economic" },
    { id: "dune", label: "Dune Health", desc: "Native vegetation cover %, nesting success.", category: "environment" },
    { id: "ren", label: "Renourishment & Restoration", desc: "Sand truck-haul + dune planting cycles (Broward County).", category: "solution" },
    { id: "events", label: "Major Events + Festivals", desc: "Broadwalk concerts, food festivals, beach events.", category: "social" },
  ],
  links: [
    { source: "storm", target: "beach", type: "balancing", label: "-", lag: "Immediate" },
    { source: "beach", target: "broadwalk", type: "reinforcing", label: "+", lag: "Seasons" },
    { source: "broadwalk", target: "hotels", type: "reinforcing", label: "+", lag: "Seasons" },
    { source: "hotels", target: "tax", type: "reinforcing", label: "+", lag: "Annual" },
    { source: "tax", target: "cip", type: "reinforcing", label: "+", lag: "Annual" },
    { source: "cip", target: "ren", type: "reinforcing", label: "+", lag: "Years" },
    { source: "ren", target: "beach", type: "reinforcing", label: "+", lag: "Years" },
    { source: "ren", target: "dune", type: "reinforcing", label: "+", lag: "Years" },
    { source: "dune", target: "beach", type: "reinforcing", label: "+", lag: "Years" },
    { source: "storm", target: "insurance", type: "reinforcing", label: "+", lag: "1–3 Years" },
    { source: "insurance", target: "hotels", type: "balancing", label: "-", lag: "Years" },
    { source: "broadwalk", target: "events", type: "reinforcing", label: "+", lag: "Annual" },
    { source: "events", target: "broadwalk", type: "reinforcing", label: "+", lag: "Annual" },
  ],
  loops: [
    { id: "R1", type: "R", name: "Revenue-into-resilience", desc: "Healthy beach → visitor-days → tax revenue → CIP capacity → renourishment → healthy beach.", nodes: ["beach", "broadwalk", "tax", "cip", "ren"] },
    { id: "B1", type: "B", name: "Storm erosion", desc: "Storms erode the beach faster than renourishment can rebuild it.", nodes: ["storm", "beach"] },
    { id: "B2", type: "B", name: "Insurance drag", desc: "Higher storm frequency drives commercial premiums, suppressing hotel margins and occupancy.", nodes: ["storm", "insurance", "hotels"] },
  ],
  archetypes: [
    { id: "limits-to-growth", name: "Limits to Growth", description: "Tourism growth is bounded by the resilience of the beach itself — without sustained CIP reinvestment, revenue eventually erodes.", relatedLoops: ["R1", "B1"] },
  ],
};

// ─── 311 Climate Complaint Triage ──────────────────────────────────────
export interface TriageReport {
  id: string;
  receivedAt: string;
  address: string;
  neighborhood: string;
  raw: string;
  classification: "tidal" | "rainfall" | "sewer" | "outfall";
  confidence: number;
  tideAtReport: number;
  rainfallLast6h: number;
  nearestCipId: string;
  nearestCipName: string;
  nearestCipPct: number;
}

function buildTriageReports(): TriageReport[] {
  const r: TriageReport[] = [];
  const samples = [
    { addr: "2200 Adams St", n: "South Lake", raw: "Water on the street again, 8am yesterday, ankle deep", cls: "tidal" as const, conf: 94, tide: 2.1, rain: 0.0, cip: "lakes-tidal", cipName: "Lakes Tidal Flooding Mitigation", pct: 22 },
    { addr: "1815 Van Buren St", n: "Beach", raw: "Storm drain backing up onto A1A, again", cls: "tidal" as const, conf: 91, tide: 2.0, rain: 0.1, cip: "fdot-vanburen", cipName: "FDOT Pump Station — Van Buren", pct: 73 },
    { addr: "5950 Sherman St", n: "Hollywood Hills", raw: "Yard flooded, won't drain, after heavy rain Saturday", cls: "rainfall" as const, conf: 88, tide: 1.2, rain: 4.8, cip: "hills-stormwater", cipName: "Hollywood Hills Stormwater Retrofit", pct: 12 },
    { addr: "1100 N 21st Ave", n: "Liberia", raw: "Sewage smell coming from manhole, intermittent", cls: "sewer" as const, conf: 86, tide: 1.5, rain: 0.0, cip: "liberia-sewer", cipName: "Liberia Sewer Extension", pct: 4 },
    { addr: "725 Garfield St", n: "Lakes", raw: "Water rising from the drain, brown color, smells", cls: "outfall" as const, conf: 89, tide: 2.0, rain: 0.0, cip: "outfall-34", cipName: "Outfall #34 Investigation", pct: 0 },
    { addr: "4530 Polk St", n: "Driftwood", raw: "Pool of water on my driveway, doesn't drain", cls: "rainfall" as const, conf: 84, tide: 1.4, rain: 3.2, cip: "driftwood-storm", cipName: "Driftwood Stormwater Retrofit", pct: 8 },
    { addr: "150 N Surf Rd", n: "Beach", raw: "Broadwalk flooded again, businesses closed at noon", cls: "tidal" as const, conf: 96, tide: 2.4, rain: 0.0, cip: "broadwalk-resilience", cipName: "Broadwalk Resilience Program", pct: 18 },
    { addr: "2310 Adams St", n: "South Lake", raw: "Same flood as last month, on Adams", cls: "tidal" as const, conf: 95, tide: 2.2, rain: 0.0, cip: "lakes-tidal", cipName: "Lakes Tidal Flooding Mitigation", pct: 22 },
    { addr: "1290 Sherman St", n: "Beach", raw: "Pump station construction blocking my driveway", cls: "tidal" as const, conf: 70, tide: 0.9, rain: 0.0, cip: "fdot-sherman", cipName: "FDOT Pump Station — Sherman St", pct: 64 },
    { addr: "830 N 14th Ct", n: "Hollywood Hills", raw: "Cracked road, water bubbling up through pavement", cls: "sewer" as const, conf: 81, tide: 1.1, rain: 0.2, cip: "hills-mains", cipName: "Hollywood Hills Water Main Replacement", pct: 35 },
    { addr: "445 Tyler St", n: "Lakes", raw: "After every storm, my yard floods + neighbor's septic seeps", cls: "rainfall" as const, conf: 73, tide: 1.6, rain: 2.8, cip: "lakes-tidal", cipName: "Lakes Tidal Flooding Mitigation", pct: 22 },
    { addr: "2095 N Park Rd", n: "Park East", raw: "Storm drain clogged with debris, called twice", cls: "rainfall" as const, conf: 79, tide: 1.3, rain: 1.4, cip: "park-east-storm", cipName: "Park East Drainage Improvements", pct: 6 },
  ];
  samples.forEach((s, i) => {
    r.push({
      id: `t${i + 1}`,
      receivedAt: `2026-05-${String(13 - Math.floor(i / 3)).padStart(2, "0")}T${String(8 + (i % 8)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}:00`,
      address: s.addr,
      neighborhood: s.n,
      raw: s.raw,
      classification: s.cls,
      confidence: s.conf,
      tideAtReport: s.tide,
      rainfallLast6h: s.rain,
      nearestCipId: s.cip,
      nearestCipName: s.cipName,
      nearestCipPct: s.pct,
    });
  });
  return r;
}

export const TRIAGE_REPORTS = buildTriageReports();

// ─── Climate Equity Index ──────────────────────────────────────────────
export interface EquityBlock {
  id: string;
  name: string;
  neighborhood: string;
  lat: number;
  lng: number;
  // 0-100 scores
  floodExposure: number;
  heatExposure: number;
  surgeExposure: number;
  // demographics
  lmiPct: number; // % below 80% AMI
  svi: number; // CDC Social Vulnerability Index 0-1 → x100
  noVehiclePct: number;
  over65Pct: number;
  population: number;
}

export const EQUITY_BLOCKS: EquityBlock[] = [
  { id: "e1", name: "Liberia Core", neighborhood: "Liberia", lat: 26.0156, lng: -80.1714, floodExposure: 72, heatExposure: 79, surgeExposure: 31, lmiPct: 78, svi: 82, noVehiclePct: 22, over65Pct: 19, population: 4180 },
  { id: "e2", name: "South Lake South", neighborhood: "South Lake", lat: 26.0098, lng: -80.1380, floodExposure: 91, heatExposure: 64, surgeExposure: 72, lmiPct: 58, svi: 64, noVehiclePct: 14, over65Pct: 28, population: 2940 },
  { id: "e3", name: "Boulevard Heights South", neighborhood: "Boulevard Heights", lat: 26.0285, lng: -80.1801, floodExposure: 41, heatExposure: 71, surgeExposure: 18, lmiPct: 71, svi: 75, noVehiclePct: 18, over65Pct: 16, population: 3210 },
  { id: "e4", name: "Driftwood North", neighborhood: "Driftwood", lat: 26.0405, lng: -80.1882, floodExposure: 38, heatExposure: 68, surgeExposure: 14, lmiPct: 64, svi: 68, noVehiclePct: 16, over65Pct: 18, population: 2870 },
  { id: "e5", name: "Hollywood Hills Central", neighborhood: "Hollywood Hills", lat: 26.0298, lng: -80.1601, floodExposure: 35, heatExposure: 62, surgeExposure: 12, lmiPct: 52, svi: 55, noVehiclePct: 12, over65Pct: 22, population: 2640 },
  { id: "e6", name: "Royal Poinciana", neighborhood: "Royal Poinciana", lat: 26.0089, lng: -80.1542, floodExposure: 64, heatExposure: 56, surgeExposure: 65, lmiPct: 56, svi: 58, noVehiclePct: 14, over65Pct: 31, population: 2010 },
  { id: "e7", name: "Park East Inner", neighborhood: "Park East", lat: 26.0203, lng: -80.151, floodExposure: 48, heatExposure: 54, surgeExposure: 41, lmiPct: 49, svi: 52, noVehiclePct: 10, over65Pct: 24, population: 1980 },
  { id: "e8", name: "Highland Gardens", neighborhood: "Highland Gardens", lat: 26.0078, lng: -80.176, floodExposure: 32, heatExposure: 67, surgeExposure: 9, lmiPct: 69, svi: 71, noVehiclePct: 18, over65Pct: 17, population: 2240 },
];

// ─── GHG Inventory ─────────────────────────────────────────────────────
export interface GhgSector {
  sector: string;
  emissions2019: number; // tCO2e
  emissions2025: number;
  target2030: number;
  target2050: number;
}

export const GHG_SECTORS: GhgSector[] = [
  { sector: "Buildings — Residential", emissions2019: 412000, emissions2025: 394000, target2030: 290000, target2050: 82000 },
  { sector: "Buildings — Commercial", emissions2019: 268000, emissions2025: 261000, target2030: 188000, target2050: 54000 },
  { sector: "Transportation — On-road", emissions2019: 524000, emissions2025: 498000, target2030: 360000, target2050: 105000 },
  { sector: "Transportation — Marine/Air", emissions2019: 36000, emissions2025: 38000, target2030: 28000, target2050: 8000 },
  { sector: "Waste — Landfill + WWTP", emissions2019: 89000, emissions2025: 84000, target2030: 61000, target2050: 18000 },
  { sector: "Industrial Process", emissions2019: 42000, emissions2025: 39000, target2030: 28000, target2050: 8000 },
];

export const GHG_BASELINE_2019 = GHG_SECTORS.reduce((s, x) => s + x.emissions2019, 0);
export const GHG_CURRENT_2025 = GHG_SECTORS.reduce((s, x) => s + x.emissions2025, 0);
export const GHG_TARGET_2050 = GHG_SECTORS.reduce((s, x) => s + x.target2050, 0);

// Glide path: 2019 baseline → 2030 (33% reduction) → 2050 (80% reduction)
export const GHG_GLIDE_PATH = [
  { year: 2019, baseline: GHG_BASELINE_2019, target: GHG_BASELINE_2019, actual: GHG_BASELINE_2019 },
  { year: 2022, baseline: GHG_BASELINE_2019, target: 1300000, actual: 1340000 },
  { year: 2025, baseline: GHG_BASELINE_2019, target: 1200000, actual: GHG_CURRENT_2025 },
  { year: 2028, baseline: GHG_BASELINE_2019, target: 1080000, actual: null },
  { year: 2030, baseline: GHG_BASELINE_2019, target: 955000, actual: null },
  { year: 2035, baseline: GHG_BASELINE_2019, target: 800000, actual: null },
  { year: 2040, baseline: GHG_BASELINE_2019, target: 620000, actual: null },
  { year: 2045, baseline: GHG_BASELINE_2019, target: 440000, actual: null },
  { year: 2050, baseline: GHG_BASELINE_2019, target: GHG_TARGET_2050, actual: null },
];
