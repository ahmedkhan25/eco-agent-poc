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

// D3 force simulation defaults
export const FORCE_DEFAULTS = {
  linkDistance: 110,
  linkStrength: 0.75,
  chargeStrength: -280,
  collisionRadius: 50,
  nodeRadius: 32,
  keyNodeRadius: 38,
  alphaDecay: 0.0228, // D3 default
} as const;

/**
 * Returns force parameters scaled by node count and viewport size.
 * Key insight: for complex models, links must be WEAK so charge
 * can actually spread nodes out — otherwise everything collapses.
 */
export function getScaledForceParams(
  nodeCount: number,
  width: number,
  height: number
) {
  // Use viewport dimensions directly — fill the space
  const vw = width * 0.4;
  const vh = height * 0.4;

  let linkDistance: number;
  let linkStrength: number;
  let chargeStrength: number;
  let initialRadiusX: number;
  let initialRadiusY: number;
  let centerStrength: number;

  if (nodeCount < 8) {
    linkDistance = 150;
    linkStrength = 0.6;
    chargeStrength = -400;
    initialRadiusX = Math.max(160, vw * 0.6);
    initialRadiusY = Math.max(130, vh * 0.6);
    centerStrength = 0.03;
  } else if (nodeCount <= 12) {
    linkDistance = 200;
    linkStrength = 0.3;
    chargeStrength = -800;
    initialRadiusX = Math.max(250, vw * 0.8);
    initialRadiusY = Math.max(200, vh * 0.8);
    centerStrength = 0.02;
  } else if (nodeCount <= 16) {
    linkDistance = 250;
    linkStrength = 0.15;
    chargeStrength = -1500;
    initialRadiusX = Math.max(320, vw);
    initialRadiusY = Math.max(260, vh);
    centerStrength = 0.012;
  } else {
    linkDistance = 300;
    linkStrength = 0.1;
    chargeStrength = -2000;
    initialRadiusX = Math.max(400, vw * 1.1);
    initialRadiusY = Math.max(320, vh * 1.1);
    centerStrength = 0.01;
  }

  return {
    linkDistance,
    linkStrength,
    chargeStrength,
    collisionRadius: FORCE_DEFAULTS.collisionRadius,
    initialRadiusX,
    initialRadiusY,
    centerStrength,
  };
}
