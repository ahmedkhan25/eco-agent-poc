import cities from "@/lib/roi/data/us-cities.json";
import { sizeFor } from "@/lib/roi/pricing";

// Population and size band for US places, from the city list in Sandrine's
// workbook (2025 estimates, everycityintheusa.com). Gated by src/middleware.ts.

const STATES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT", delaware: "DE",
  "district of columbia": "DC", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR",
  pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();

export async function GET(req: Request) {
  const url = new URL(req.url);
  let name = norm(url.searchParams.get("name") ?? "");
  let state = (url.searchParams.get("state") ?? "").trim();
  // "Olympia, WA" in one field
  const parts = (url.searchParams.get("name") ?? "").split(",");
  if (parts.length > 1 && !state) {
    name = norm(parts[0]);
    state = parts[1].trim();
  }
  const abbr = state.length === 2 ? state.toUpperCase() : STATES[norm(state)] ?? "";
  if (!name) return Response.json({ error: "Give a place name" }, { status: 400 });
  const rows = (cities as [string, string, number][])
    .filter(([n, st]) => norm(n) === name && (!abbr || st === abbr))
    .slice(0, 5)
    .map(([n, st, pop]) => ({ name: n, state: st, population: pop, size: sizeFor({ population: pop }) }));
  return Response.json({
    matches: rows,
    source: "US city list in Sandrine's pricing workbook (2025 population estimates, everycityintheusa.com)",
  });
}
