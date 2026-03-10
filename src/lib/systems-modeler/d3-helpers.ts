/**
 * D3 helper functions ported from ecoheart-systems-graph reference HTML
 */

import * as d3 from "d3";
import type { Selection } from "d3";

/**
 * Generate a curved arc path between two nodes (for causal links)
 */
export function linkPath(d: {
  source: { x: number; y: number };
  target: { x: number; y: number };
}): string {
  const dx = d.target.x - d.source.x;
  const dy = d.target.y - d.source.y;
  const dr = Math.sqrt(dx * dx + dy * dy) * 0.8;
  return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
}

/**
 * Create SVG arrow marker definitions for link endpoints
 */
export function buildArrowMarkers(
  defs: Selection<SVGDefsElement, unknown, null, undefined>
): void {
  const markers = [
    { id: "arrow-reinforcing", color: "#e05c5c" },
    { id: "arrow-balancing", color: "#5ca8e0" },
  ];

  markers.forEach(({ id, color }) => {
    defs
      .append("marker")
      .attr("id", id)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", color);
  });
}

/**
 * Create radial background gradient
 */
export function buildBackgroundGradient(
  defs: Selection<SVGDefsElement, unknown, null, undefined>
): void {
  const grad = defs
    .append("radialGradient")
    .attr("id", "bgGrad")
    .attr("cx", "50%")
    .attr("cy", "50%");

  grad.append("stop").attr("offset", "0%").attr("stop-color", "#243d2e");
  grad.append("stop").attr("offset", "100%").attr("stop-color", "#1a2f22");
}

/**
 * Animated pulse ring for key nodes (recursive D3 transition)
 */
export function animatePulse(el: SVGCircleElement): void {
  d3.select(el)
    .attr("r", 32)
    .attr("opacity", 0.6)
    .transition()
    .duration(2000)
    .ease(d3.easeCubicOut)
    .attr("r", 60)
    .attr("opacity", 0)
    .on("end", () => animatePulse(el));
}

/**
 * Calculate the centroid position for a loop badge
 */
export function getLoopCentroid(
  loopNodeIds: string[],
  allNodes: { id: string; x?: number; y?: number }[]
): { x: number; y: number } {
  const involved = allNodes.filter((n) => loopNodeIds.includes(n.id));
  if (involved.length === 0) return { x: 0, y: 0 };
  const x =
    involved.reduce((sum, n) => sum + (n.x || 0), 0) / involved.length;
  const y =
    involved.reduce((sum, n) => sum + (n.y || 0), 0) / involved.length;
  return { x, y };
}

/**
 * Place nodes in initial circular layout
 */
export function circularLayout(
  nodes: { x?: number; y?: number }[],
  width: number,
  height: number,
  radiusX = 220,
  radiusY = 180
): void {
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI;
    n.x = width / 2 + Math.cos(angle) * radiusX;
    n.y = height / 2 + Math.sin(angle) * radiusY;
  });
}
