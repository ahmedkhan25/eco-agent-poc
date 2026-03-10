/**
 * Constants for the Universal Interactive System Modeler
 * Colors ported from ecoheart-systems-graph reference HTML
 */

import type { NodeCategory } from "./types";

export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  pressure: "#e05c5c",
  population: "#f5a623",
  social: "#9b7de8",
  solution: "#3ddc84",
  environment: "#4ecdc4",
  resource: "#5ca8e0",
  policy: "#f5a623",
  economic: "#e8aa7d",
  default: "#7a9e82",
};

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  pressure: "Pressure",
  population: "Population",
  social: "Social",
  solution: "Solution",
  environment: "Environment",
  resource: "Resource",
  policy: "Policy",
  economic: "Economic",
  default: "Other",
};

export const LINK_COLORS = {
  reinforcing: "#e05c5c",
  balancing: "#5ca8e0",
} as const;

export const PHASE_LABELS = {
  input: "Input",
  generate: "Generate",
  iterate: "Iterate",
  collide: "Collide",
  humanize: "Humanize",
} as const;

export const PHASE_DESCRIPTIONS = {
  input: "Provide a topic, document, or prompt",
  generate: "AI creates the initial causal loop diagram",
  iterate: "Chat with the diagram to refine it",
  collide: 'Trigger the "Aha! Paradox" to break assumptions',
  humanize: "Translate the model into an emotional narrative",
} as const;

// D3 force simulation defaults (from reference HTML)
export const FORCE_DEFAULTS = {
  linkDistance: 160,
  linkStrength: 0.5,
  chargeStrength: -400,
  collisionRadius: 55,
  nodeRadius: 32,
  keyNodeRadius: 38,
  alphaDecay: 0.0228, // D3 default
} as const;
