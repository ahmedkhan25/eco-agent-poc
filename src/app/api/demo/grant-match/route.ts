import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GRANT_CATALOG } from "@/lib/demo/hollywood-data";

export const runtime = "nodejs";
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are EcoHeart's Grant Finder for the City of Hollywood, FL.

You are given a candidate project description and a JSON catalog of grant programs. Match the project to the 3–4 best-fit grant programs from the catalog and produce a structured analysis.

For each match, score 0–100 based on:
- Eligibility fit (does the project actually qualify?)
- Scoring criteria fit (does the project hit the rubric?)
- Hollywood-specific context (LMI tracts, CVA Update completed, §380.093 compliance, climate-vulnerable assets)

For each match, evaluate every line of the program's eligibility list as "green" (we satisfy this), "amber" (probably / needs work), or "red" (does not apply / not yet satisfied). Cite a Hollywood plan or fact when stating green/amber.

Draft a 2-paragraph application narrative for the top-ranked program that explicitly cites Hollywood documents (Sustainable Hollywood Action Plan, Climate Change Vulnerability Assessment, Public Utilities Master Plan, Hazard Mitigation Plan, Compact SLR projection, Florida Statute 380.093).

Return STRICT JSON only:
{
  "matches": [
    {
      "grantId": string,
      "score": int 0-100,
      "summary": string (one sentence — why this is a fit),
      "eligibilityCheck": [
        { "item": string, "status": "green"|"amber"|"red", "note": string }
      ],
      "scoringEvidence": [ { "criterion": string, "evidence": string } ] (3–5 items),
      "draftNarrative": string (2 paragraphs, only for the TOP match — empty for others),
      "estimatedRequest": string (e.g. "$35.5M with 50% local match"),
      "nextStep": string
    }
  ]
}
`;

export async function POST(req: NextRequest) {
  try {
    const { project } = (await req.json()) as { project?: string };
    if (!project?.trim()) {
      return NextResponse.json({ error: "project description required" }, { status: 400 });
    }

    const catalog = GRANT_CATALOG.map((g) => ({
      id: g.id,
      name: g.name,
      agency: g.agency,
      programType: g.programType,
      maxAward: g.maxAward,
      matchRequirement: g.matchRequirement,
      cycle: g.cycle,
      eligibility: g.eligibility,
      scoringCriteria: g.scoringCriteria,
      blurb: g.blurb,
    }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `PROJECT:\n${project}\n\nGRANT CATALOG:\n${JSON.stringify(catalog, null, 2)}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { matches?: Array<{ grantId: string }> };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Model returned invalid JSON", raw }, { status: 502 });
    }

    // Attach the full program data to each match
    const matches = (parsed.matches ?? []).map((m) => {
      const program = GRANT_CATALOG.find((g) => g.id === m.grantId);
      return { ...m, program };
    });

    return NextResponse.json({ matches, project });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[grant-match]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
