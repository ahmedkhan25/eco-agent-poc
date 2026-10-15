// How-to content for the ROI Advisor: the agent's guide card and the chat's suggestion buttons.

export interface GuideStep {
  title: string;
  body: string;
  href?: string;
}

export const SITE_GUIDE: GuideStep[] = [
  { title: "Ask a what-if", body: "Type a question about a client in the chat, for example \"What if Flagstaff's insurance credit is only 2%?\". The Advisor builds a scenario card on the Workspace.", href: "/roi" },
  { title: "Read the card", body: "Each card shows net value in year one, dollars back per $1 spent, payback, where the value comes from, who pays, and any checks to look at.", href: "/roi" },
  { title: "Tune it yourself", body: "Pick the client and use cases, switch Cautious, Expected or Business case, and change any input under \"Tune this scenario\". Changed values turn teal.", href: "/roi" },
  { title: "Set up a client", body: "Clients holds each city, county, agency, tribal nation or organization: its own numbers (with sources), use cases, offer, contract, team, SMEs and partners who pay part.", href: "/roi/clients" },
  { title: "Add a use case", body: "Use cases lists every kind of saving, built from four blocks: cost avoided, events avoided, time saved and new money won. Ask the Advisor to draft a new one.", href: "/roi/model" },
  { title: "Check pricing", body: "Pricing has Sandrine's catalog by client size, our offers and the CitySense pilot tiers, volume discounts and state bundles.", href: "/roi/pricing" },
  { title: "Export", body: "Download a use case, a client's cost model or a scenario as CSV or Excel with the Export buttons, or ask the Advisor.", href: "/roi/model" },
  { title: "Make a report", body: "Ask for a report for a named reader, or press Report on a card. It lists what is still to confirm and the checks. Print it or save it as a PDF.", href: "/roi/report" },
  { title: "Share the story", body: "The Proposal tab has the visual proposal; the Explainer tab has the walkthrough video.", href: "/roi/proposal" },
];

export const GUIDE_TEXT = `How to use this site (use for "how do I use this?" questions; call showGuide to show the steps as a card):
${SITE_GUIDE.map((s, i) => `${i + 1}. ${s.title}: ${s.body}`).join("\n")}
- Use cases, clients and pricing are shared with the whole team. Scenarios on the canvas are saved in this browser only. The section is internal and password protected.`;

const ALWAYS = [
  { title: "How do I use this site?", message: "How do I use this site? Show me the steps." },
  { title: "What can you do?", message: "What can you do for me here? Keep it short." },
];

export function suggestionsFor(pathname: string, scenarioCount: number) {
  let page: { title: string; message: string }[];
  if (pathname.startsWith("/roi/model")) {
    page = [
      { title: "New use case", message: "Draft a new use case for tree canopy and heat: fewer heat-related EMS calls and lower cooling costs." },
      { title: "Least certain numbers", message: "Which assumptions are least certain, and who should confirm them?" },
      { title: "Check the use cases", message: "Validate every use case and tell me if any are wired wrong." },
      { title: "Export to Excel", message: "Export the storm and insurance use case with Olympia's values to Excel." },
    ];
  } else if (pathname.startsWith("/roi/clients")) {
    page = [
      { title: "Fill in Olympia", message: "What numbers is Olympia missing? Look them up in Olympia's documents and propose values with sources." },
      { title: "Add an SME", message: "Add an Olympia climate manager and engineering SME at $55 an hour for 40 hours to Olympia, and tell me the new margin." },
      { title: "Partner covers 30%", message: "A partner utility covers 30% of Olympia's year-one price. Add it and show who pays what." },
      { title: "Tribal client", message: "Set up a tribal nation in Washington serving about 5,000 people, using Grant Finder and storm and insurance, and check it." },
    ];
  } else if (pathname.startsWith("/roi/pricing")) {
    page = [
      { title: "Price a Supported pilot", message: "Price a CitySense Supported pilot for a Mid-size city and check it against the public range." },
      { title: "Arizona bundle", message: "What does the Arizona statewide bundle come to, and what's the ARR?" },
      { title: "Our margin", message: "What's our margin on each client, and what drives it?" },
      { title: "Export a cost model", message: "Export Olympia's cost model to Excel." },
    ];
  } else if (pathname.startsWith("/roi/report")) {
    page = [
      { title: "Rewrite for council", message: "Rewrite this report for a city council audience." },
      { title: "What to confirm first", message: "What should we confirm with the client before sending this report?" },
    ];
  } else if (pathname.startsWith("/roi/proposal") || pathname.startsWith("/roi/explainer")) {
    page = [
      { title: "Who is ecoheart?", message: "Who is ecoheart and who is on the team? Share the links." },
      { title: "Explainer video", message: "Where can I watch the explainer video?" },
      { title: "Proposal in 3 lines", message: "Summarize the ROI Advisor proposal in three short lines." },
    ];
  } else {
    page = [
      { title: "Flagstaff at 2% credit", message: "What does Flagstaff, AZ get back if the insurance credit is only 2%?" },
      { title: "Olympia: storm + grants", message: "Build a scenario for Olympia with storm and insurance plus Grant Finder, and check it." },
      ...(scenarioCount >= 2
        ? [{ title: "Compare my scenarios", message: "Compare the scenarios on my canvas and tell me which is strongest and why." }]
        : [{ title: "Cautious vs expected", message: "Compare a cautious and an expected case for Hollywood." }]),
      { title: "What matters most?", message: "Which three numbers matter most in the active scenario, and where does each break even?" },
      { title: "Write a report", message: "Write a one-page report on the active scenario for a city manager." },
    ];
  }
  return [...ALWAYS, ...page];
}
