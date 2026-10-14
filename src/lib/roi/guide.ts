// How-to content for the ROI Advisor: the agent's guide card and the chat's suggestion buttons.

export interface GuideStep {
  title: string;
  body: string;
  href?: string;
}

export const SITE_GUIDE: GuideStep[] = [
  { title: "Ask a what-if", body: "Type a question about a city in the chat, for example \"What if Flagstaff's insurance credit is only 2%?\". The Advisor builds a scenario card on the Workspace.", href: "/roi" },
  { title: "Read the card", body: "Each card shows net value in year one, dollars back per $1 spent, payback months, and where the value comes from. Every number comes from one shared calculator.", href: "/roi" },
  { title: "Tune it yourself", body: "Under \"Tune this scenario\", change any input. Changed values turn teal; the reset arrow puts the library value back. Switch Cautious, Expected or Business case at the top.", href: "/roi" },
  { title: "Compare options", body: "Tick Compare on two to four cards, or ask the Advisor to compare them, and they line up side by side.", href: "/roi" },
  { title: "Check the assumptions", body: "Model & assumptions lists every number with its source, confidence and owner, plus our internal cost model. Edits there flow into every scenario.", href: "/roi/model" },
  { title: "Make a report", body: "Ask for a report for a named reader, or press Report on a card. Print it or save it as a PDF.", href: "/roi/report" },
  { title: "Share the story", body: "The Proposal tab has the visual proposal for stakeholders; the Explainer tab has the walkthrough video.", href: "/roi/proposal" },
];

export const GUIDE_TEXT = `How to use this site (use for "how do I use this?" questions; call showGuide to show the steps as a card):
${SITE_GUIDE.map((s, i) => `${i + 1}. ${s.title}: ${s.body}`).join("\n")}
- Your work is saved in this browser only, for now. The section is internal and password protected.`;

const ALWAYS = [
  { title: "How do I use this site?", message: "How do I use this site? Show me the steps." },
  { title: "What can you do?", message: "What can you do for me here? Keep it short." },
];

export function suggestionsFor(pathname: string, scenarioCount: number) {
  let page: { title: string; message: string }[];
  if (pathname.startsWith("/roi/model")) {
    page = [
      { title: "Least certain numbers", message: "Which assumptions are least certain, and who should confirm them?" },
      { title: "Our margin", message: "What's our margin on the early partner project, and what drives it?" },
      { title: "Set cautious credit to 3%", message: "Set the cautious premium credit in the library to 3% and tell me what changes." },
    ];
  } else if (pathname.startsWith("/roi/report")) {
    page = [
      { title: "Rewrite for city council", message: "Rewrite this report for a city council audience." },
      { title: "What to confirm first", message: "What should we confirm with the city before sending this report?" },
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
      { title: "New coastal city case", message: "Build a case for a 60,000-person coastal city with a $1.5M insurance premium." },
      ...(scenarioCount >= 2
        ? [{ title: "Compare my scenarios", message: "Compare the scenarios on my canvas and tell me which is strongest and why." }]
        : [{ title: "Cautious vs expected", message: "Compare a cautious and an expected case for Hollywood." }]),
      { title: "Write a report", message: "Write a one-page report on the active scenario for a city manager." },
      { title: "Explainer video", message: "Where can I watch the explainer video?" },
    ];
  }
  return [...ALWAYS, ...page];
}
