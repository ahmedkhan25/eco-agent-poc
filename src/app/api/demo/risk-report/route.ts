import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  postcode?: string;
}

async function geocodeHollywood(address: string): Promise<GeocodeResult | null> {
  const q = `${address}, Hollywood, FL`;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}&viewbox=-80.205,26.060,-80.105,25.960&bounded=1&addressdetails=1`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "EcoHeart-Demo/1.0 (ahmed@seniorhousingcentral.com)",
    },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const j: Array<{ lat: string; lon: string; display_name: string; address?: { postcode?: string } }> =
    await res.json();
  if (!j.length) return null;
  return {
    lat: parseFloat(j[0].lat),
    lng: parseFloat(j[0].lon),
    displayName: j[0].display_name,
    postcode: j[0].address?.postcode,
  };
}

const SYSTEM_PROMPT = `You are EcoHeart, a climate risk research assistant for the City of Hollywood, FL.

Given a single property address, produce a JSON climate risk report. Ground every score and recommendation in real Hollywood and Florida planning documents that you reference by name. Use the following authoritative sources (cite them in 'citations'):

- Sustainable Hollywood Action Plan (2017) — 99 actions across 7 focus areas, 80% GHG by 2050 target
- Hollywood Climate Change Vulnerability Assessment (Hazen and Sawyer 2019/2020; Update in flight via $800K Resilient Florida grant)
- Hollywood Dune Master Plan (FY19, Moffatt & Nichol)
- Hollywood Public Utilities Master Plan presented Oct 22, 2025 — $2.5B 30-year plan, $1.3B septic-to-sewer
- Southeast Florida Regional Climate Compact 2019 Unified SLR Projection (reaffirmed Q4 2024)
- Florida Building Code (HVHZ) — design wind 170+ mph, ASCE 24 elevation
- Florida Statute 380.093 — required vulnerability assessment for state grant eligibility

Be specific: name the FEMA zone (A/AE/VE/X), evac zone (A–E), and reference the Compact SLR curve. For barrier-island and Intracoastal-side addresses, mention 14 projected king-tide flood days per year in the worst hotspots and FDOT pump-station projects. For the Hollywood Hills area, gently reference the 2017 Rehabilitation Center tragedy as context for the generator-rule for ALFs (do not be morbid; reference it as the reason for the standard).

Be realistic: if the address is inland (not coastal), flood scores should be lower than for South Lake/A1A addresses. Tailor to the parcel.

Return STRICT JSON only with this schema:
{
  "address": string,
  "summary": string (1–2 sentences),
  "scores": {
    "flood": { "value": int 0-100, "blurb": string (one short sentence) },
    "surge": { "value": int 0-100, "blurb": string },
    "heat":  { "value": int 0-100, "blurb": string },
    "wind":  { "value": int 0-100, "blurb": string },
    "insurance": { "value": int 0-100, "blurb": string }
  },
  "timeline": [ { "year": 2026, "flood": int, "surge": int, "heat": int }, { "year": 2040, ...}, { "year": 2060, ...}, { "year": 2100, ...} ],
  "recommendations": [
    { "title": string, "action": string, "citation": { "doc": string, "section": string, "quote": string } }
  ] (5–8 items),
  "citations": [ { "doc": string, "section"?: string, "quote": string } ] (3–6 items),
  "confidence": int 0-100
}
`;

export async function POST(req: NextRequest) {
  try {
    const { address } = (await req.json()) as { address?: string };
    if (!address || !address.trim()) {
      return NextResponse.json({ error: "address is required" }, { status: 400 });
    }

    const geo = await geocodeHollywood(address);

    const ctxLines = [
      `User address: ${address}`,
      geo
        ? `Geocoded: lat=${geo.lat.toFixed(5)}, lng=${geo.lng.toFixed(5)}, postcode=${geo.postcode ?? "unknown"}`
        : "Geocoding failed — make a Hollywood-FL-typical assessment and note this.",
      geo && Math.abs(geo.lng + 80.115) < 0.015
        ? "Location indicator: BARRIER ISLAND / OCEAN-FACING — apply higher surge, flood, and wind scores. Reference A1A pump-station projects."
        : "",
      geo && geo.lng > -80.165 && geo.lng < -80.13 && geo.lat < 26.02
        ? "Location indicator: LAKES / INTRACOASTAL-SIDE — South Lake area pattern. Reference 14 king-tide flood days/yr at the worst hotspot."
        : "",
      geo && geo.lng < -80.17
        ? "Location indicator: INLAND / Hollywood Hills / Driftwood — rainfall-driven nuisance flooding dominant; many parcels on septic."
        : "",
    ].filter(Boolean);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: ctxLines.join("\n") },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON", raw },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ...parsed,
      geocode: geo,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[risk-report]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
