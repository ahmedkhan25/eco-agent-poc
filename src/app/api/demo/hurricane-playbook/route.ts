import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PRE_STORM_SYSTEM = `You are EcoHeart's hurricane-preparedness assistant for the City of Hollywood, FL.

Given a hurricane name, projected track, and category, generate five tabbed preparedness checklists for: Residents, Assisted Living Facilities (ALFs) & Skilled Nursing, Hospitals, Lift Stations (Public Utilities), and K-12 Schools.

Critical context that MUST inform the ALF checklist (without being morbid):
- 2017 Hurricane Irma: 12–14 patients died at the Rehabilitation Center at Hollywood Hills after generator failure pushed indoor temperatures to lethal levels.
- This led directly to Florida's emergency-generator rule for ALFs and skilled nursing.
- Reference it once, respectfully, as the standard's origin — make the generator+indoor-temp checks the FIRST items on the ALF list.

The checklists must:
- Be Hollywood-specific (mention Memorial Regional Hospital, the Broward EOC, Hollywood Public Utilities, the Broadwalk, A1A pump stations where relevant)
- Cite Hollywood plans where relevant (Sustainable Hollywood Action Plan, Hollywood Hazard Mitigation Plan / Broward Local Mitigation Strategy)
- Be concrete (numbers, hours, specific equipment)
- Cite the storm Cat, surge zone, and expected timeline

Return STRICT JSON only:
{
  "header": { "stormName": string, "category": string, "track": string, "advisoryAt": string, "expectedImpactWindow": string },
  "summary": string (1 sentence),
  "checklists": {
    "residents":     { "title": string, "subtitle": string, "items": [ {"label": string, "detail": string, "priority": "critical"|"high"|"normal"} ] },
    "alfs":          { "title": string, "subtitle": string, "items": [...] },
    "hospitals":     { "title": string, "subtitle": string, "items": [...] },
    "liftStations":  { "title": string, "subtitle": string, "items": [...] },
    "schools":       { "title": string, "subtitle": string, "items": [...] }
  },
  "citations": [ { "doc": string, "section"?: string, "quote": string } ] (2–4 items)
}

For ALFs, include a top-of-list note explaining the 2017 lesson and why generators + indoor-temp monitoring are first. Each checklist should have 6–8 items.`;

const POST_STORM_SYSTEM = `You are EcoHeart's FEMA Project Worksheet drafter for the City of Hollywood, FL.

Given a CSV of damage observations (location, asset type, description, estimated cost), draft an aggregated FEMA Project Worksheet–style report eligible for HMGP / BRIC / Public Assistance. Use the Hollywood Hazard Mitigation Plan and Florida Hazard Mitigation Plan as the governing planning documents.

Return STRICT JSON only:
{
  "summary": string (2 sentences),
  "totalEstimatedCost": string,
  "categorized": [ {"category": string, "subtotal": string, "items": [ {"asset": string, "cost": string, "note": string} ] } ],
  "fema": {
    "scope": string,
    "damageDescription": string,
    "workDescription": string,
    "mitigationOpportunities": string
  },
  "citations": [ { "doc": string, "quote": string } ] (1–2 items)
}`;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { mode: "pre" | "post"; stormName?: string; category?: string; track?: string; damageCsv?: string };

    if (body.mode === "pre") {
      if (!body.stormName) {
        return NextResponse.json({ error: "stormName required" }, { status: 400 });
      }
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        temperature: 0.3,
        messages: [
          { role: "system", content: PRE_STORM_SYSTEM },
          {
            role: "user",
            content: `Storm: ${body.stormName}\nCategory: ${body.category ?? "Cat 3"}\nProjected track: ${body.track ?? "landfall ~80 miles south of Miami"}\nGenerate the playbook.`,
          },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      return NextResponse.json(parsed);
    }

    if (body.mode === "post") {
      if (!body.damageCsv) {
        return NextResponse.json({ error: "damageCsv required" }, { status: 400 });
      }
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        temperature: 0.3,
        messages: [
          { role: "system", content: POST_STORM_SYSTEM },
          {
            role: "user",
            content: `Damage CSV:\n${body.damageCsv}\n\nDraft the FEMA Project Worksheet.`,
          },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      return NextResponse.json(parsed);
    }

    return NextResponse.json({ error: "mode must be 'pre' or 'post'" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[hurricane-playbook]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
