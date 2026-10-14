// What the ROI Advisor knows about ecoheart, and the links it can share.
// Sources: www.ecoheart.ai (home, /services, /story) as of Oct 2026, plus team notes.

export interface Resource {
  id: string;
  title: string;
  description: string;
  href: string;
  external?: boolean;
  ready?: boolean; // false shows "coming soon" instead of a link
}

// Flip `ready` to true once public/roi/explainer.mp4 is in place (see ROI_ADVISOR_RUNBOOK.md).
export const EXPLAINER_VIDEO = {
  src: "/roi/explainer.mp4",
  poster: "/roi/img/hero-city.jpg",
  ready: false,
};

export const RESOURCES: Resource[] = [
  { id: "website", title: "ecoheart.ai", description: "Our public website: who we are and what we do", href: "https://www.ecoheart.ai", external: true },
  { id: "services", title: "Our services", description: "Smart city data, AI, community projects and the team's expertise", href: "https://www.ecoheart.ai/services", external: true },
  { id: "story", title: "Our story and team", description: "Why ecoheart exists, our principles and our founders", href: "https://www.ecoheart.ai/story", external: true },
  { id: "contact", title: "Contact ecoheart", description: "How cities and partners reach us", href: "https://www.ecoheart.ai/contact", external: true },
  { id: "explainer", title: "ROI Advisor explainer video", description: "How the Advisor works, how to use the calculator, and how the agent works out ROI", href: "/roi/explainer", ready: EXPLAINER_VIDEO.ready },
  { id: "proposal", title: "ROI Advisor proposal", description: "The visual proposal: team, cost, how cities use it and the value", href: "/roi/proposal" },
  { id: "model", title: "Model & assumptions", description: "Every assumption with its source, plus our internal cost model", href: "/roi/model" },
  { id: "report", title: "ROI report", description: "Printable one-page report for the active scenario", href: "/roi/report" },
  { id: "olympia", title: "Olympia climate agent", description: "Research assistant over City of Olympia documents", href: "/" },
  { id: "systems-modeler", title: "Systems Modeler", description: "Causal loop diagrams, based on Gene Bellinger's systems thinking work", href: "/systems-modeler" },
  { id: "florida-demo", title: "Florida demo", description: "Hollywood, FL map and resilience demo", href: "/demo" },
];

export const ECOHEART_CONTEXT = `About ecoheart (use this when people ask who we are, what we do, or where to learn more)
- ecoheart is a Washington State company founded in 2025. Tagline: "AI for a Human-First Future." Website: www.ecoheart.ai.
- What we do: turn complex city and organizational data into ethical, actionable intelligence for climate adaptation, resilience, flooding, public safety and growth. AI is an accelerator for people, never a replacement; recommendations come with reasons traceable to source data.
- Services (from ecoheart.ai/services): smart city data federation (sensors, climate data, resident feedback in one view), data and AI strategy, small community projects with cities and tribal nations before full rollout, and full-service engagements from strategy to delivery. The team also covers AI readiness, data management (quality, governance, metadata), climate services and strategic planning with KPIs.
- Team: founded by Marcia Drake (Founder & CEO, pronounced "Mar-see-ah"; emergency management background including Washington State Patrol work), Rhea Ong Yiu and Michael Rothuizen. Ahmed Khan is Chief of Applied AI Solutions & Architecture. A wider bench of specialists brings: Women in Data Leader of the Year 2022, CDO Magazine Global Data Power Women, Thinkers50 and TechWomen100 honorees, ForHumanity Fellows, a NASA Gold Medal recipient, leaders who delivered $500M+ in risk mitigation, Microsoft Digital Crime Unit veterans, State Chief Data Officer leadership, and U.S. DOT award-winning traffic risk models.
- Other parts of this site: the Olympia climate agent, the Systems Modeler (based on systems thinker Gene Bellinger's work), and the Florida (Hollywood) demo.
- In anything meant for a city or the public, name only Marcia Drake, call ecoheart a platform, never claim existing pilots, and describe work as early partner projects shaped with the city.

Links you can share (call shareLinks with these ids instead of typing URLs): ${RESOURCES.map((r) => `${r.id} (${r.title}${r.ready === false ? ", coming soon" : ""})`).join(", ")}.
- If someone asks for the explainer video and it isn't ready yet, share it anyway: the card says it's coming soon. Offer the proposal in the meantime.`;
