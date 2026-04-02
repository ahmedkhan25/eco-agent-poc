"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import type { SystemModel, SystemModelNode, SystemModelLink } from "@/lib/systems-modeler/types";
import { CATEGORY_COLORS, LINK_COLORS, FORCE_DEFAULTS, getScaledForceParams } from "@/lib/systems-modeler/constants";
import { linkPath, buildArrowMarkers, circularLayout } from "@/lib/systems-modeler/d3-helpers";

// D3 simulation node type (extends our type with D3's position fields)
interface SimNode extends SystemModelNode {
  x: number;
  y: number;
  fx: number | null;
  fy: number | null;
  vx?: number;
  vy?: number;
  index?: number;
}

interface SimLink extends Omit<SystemModelLink, "source" | "target"> {
  source: SimNode;
  target: SimNode;
  index?: number;
}

interface CausalLoopDiagramProps {
  model: SystemModel;
  highlightedNodeIds: string[];
  highlightedLinkIndices: number[];
  activeFilters: { reinforcing: boolean; balancing: boolean; nodes: boolean };
  forceActive: boolean;
  onNodeClick: (nodeId: string) => void;
  onLoopClick: (loopId: string) => void;
  onBackgroundClick: () => void;
}

export function CausalLoopDiagram({
  model,
  highlightedNodeIds,
  highlightedLinkIndices,
  activeFilters,
  forceActive,
  onNodeClick,
  onLoopClick,
  onBackgroundClick,
}: CausalLoopDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const svgRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const linkSelRef = useRef<d3.Selection<SVGPathElement, SimLink, SVGGElement, unknown> | null>(null);
  const nodeSelRef = useRef<d3.Selection<SVGGElement, SimNode, SVGGElement, unknown> | null>(null);
  const loopSelRef = useRef<d3.Selection<SVGGElement, typeof model.loops[0], SVGGElement, unknown> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Build/rebuild the diagram when the model changes
  useEffect(() => {
    if (!containerRef.current || !model || !model.nodes.length) return;

    const container = containerRef.current;
    let W = container.clientWidth;
    let H = container.clientHeight;

    // Fallback if layout hasn't been computed yet
    if (W === 0 || H === 0) {
      W = container.parentElement?.clientWidth || window.innerWidth - 380;
      H = container.parentElement?.clientHeight || window.innerHeight - 60;
    }

    // Clear previous
    if (simulationRef.current) simulationRef.current.stop();
    d3.select(container).selectAll("svg").remove();

    // Create SVG
    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%") as d3.Selection<SVGSVGElement, unknown, null, undefined>;
    svgRef.current = svg;

    // Defs
    const defs = svg.append("defs");
    buildArrowMarkers(defs);

    // Background gradient
    const grad = defs
      .append("radialGradient")
      .attr("id", "bgGrad")
      .attr("cx", "50%")
      .attr("cy", "50%");
    grad.append("stop").attr("offset", "0%").attr("stop-color", "#243d2e");
    grad.append("stop").attr("offset", "100%").attr("stop-color", "#1a2f22");
    svg.append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "url(#bgGrad)")
      .on("click", () => onBackgroundClick());

    const g = svg.append("g");
    gRef.current = g;

    // Zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on("zoom", (e) => g.attr("transform", e.transform));
    zoomRef.current = zoom;
    svg.call(zoom);

    // Deep copy data for D3 mutation
    const nodes: SimNode[] = model.nodes.map((n) => ({ ...n, x: 0, y: 0, fx: null, fy: null }));
    const nodeIds = new Set(nodes.map((n) => n.id));
    // Filter out links that reference non-existent nodes
    const links = model.links
      .filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target))
      .map((l) => ({ ...l }));

    // Compute force parameters scaled to node count and viewport
    const forceParams = getScaledForceParams(nodes.length, W, H);

    // Initial layout: place all nodes in a circle first
    circularLayout(nodes, W, H, forceParams.initialRadiusX, forceParams.initialRadiusY);

    // Then reposition nodes that have connections to place them near neighbors
    // Build adjacency map from links (using string source/target IDs)
    const adjacency = new Map<string, string[]>();
    links.forEach((l) => {
      const src = typeof l.source === "string" ? l.source : (l.source as SimNode).id;
      const tgt = typeof l.target === "string" ? l.target : (l.target as SimNode).id;
      if (!adjacency.has(src)) adjacency.set(src, []);
      if (!adjacency.has(tgt)) adjacency.set(tgt, []);
      adjacency.get(src)!.push(tgt);
      adjacency.get(tgt)!.push(src);
    });

    // For each node, if it has neighbors with positions, place near centroid + jitter
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    // Do a second pass: nudge nodes toward the average position of their neighbors
    nodes.forEach((n) => {
      const neighbors = adjacency.get(n.id) || [];
      const positionedNeighbors = neighbors
        .map((id) => nodeMap.get(id))
        .filter((nb): nb is SimNode => !!nb && (nb.x !== 0 || nb.y !== 0));
      if (positionedNeighbors.length > 0) {
        const cx = positionedNeighbors.reduce((s, nb) => s + nb.x, 0) / positionedNeighbors.length;
        const cy = positionedNeighbors.reduce((s, nb) => s + nb.y, 0) / positionedNeighbors.length;
        // Place near centroid with small random offset to prevent overlap
        n.x = cx + (Math.random() - 0.5) * 50;
        n.y = cy + (Math.random() - 0.5) * 50;
      }
    });

    // Force simulation (using scaled parameters)
    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(links as unknown as SimLink[])
          .id((d) => d.id)
          .distance(forceParams.linkDistance)
          .strength(forceParams.linkStrength)
      )
      .force("charge", d3.forceManyBody().strength(forceParams.chargeStrength))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("x", d3.forceX(W / 2).strength(forceParams.centerStrength))
      .force("y", d3.forceY(H / 2).strength(forceParams.centerStrength))
      .force("collision", d3.forceCollide<SimNode>((d) => {
        const base = d.key ? 65 : 55;
        return nodes.length > 14 ? base + 10 : base;
      }))
      .alpha(0.8)
      .alphaDecay(nodes.length > 14 ? 0.02 : 0.03);
    simulationRef.current = simulation;

    // Links
    const linkSel = g
      .append("g")
      .attr("class", "links")
      .selectAll<SVGPathElement, SimLink>("path")
      .data(links as unknown as SimLink[])
      .enter()
      .append("path")
      .attr("class", (d) => `link ${d.type}`)
      .attr("fill", "none")
      .attr("stroke", (d) => LINK_COLORS[d.type])
      .attr("stroke-width", nodes.length > 10 ? 2 : 1.5)
      .attr("opacity", nodes.length > 10 ? 0.5 : 0.7)
      .attr("marker-end", (d) => `url(#arrow-${d.type})`);
    linkSelRef.current = linkSel;

    // Edge labels (lag) — hidden for complex models to reduce clutter
    const showLagLabels = nodes.length <= 10;
    const edgeLabels = g
      .append("g")
      .attr("class", "edge-labels")
      .selectAll("text")
      .data(links as unknown as SimLink[])
      .enter()
      .append("text")
      .attr("font-size", "8px")
      .attr("fill", "#5a7a62")
      .attr("text-anchor", "middle")
      .attr("font-family", "system-ui, sans-serif")
      .attr("opacity", showLagLabels ? 0.8 : 0)
      .text((d) => d.lag);

    // Loop badges
    const loopSel = g
      .append("g")
      .attr("class", "loop-labels")
      .selectAll<SVGGElement, typeof model.loops[0]>("g")
      .data(model.loops)
      .enter()
      .append("g")
      .style("cursor", "pointer")
      .on("click", (_e, d) => onLoopClick(d.id));
    loopSelRef.current = loopSel;

    loopSel
      .append("circle")
      .attr("r", 18)
      .attr("fill", (d) => (d.type === "R" ? LINK_COLORS.reinforcing : LINK_COLORS.balancing))
      .attr("stroke", "#1a2f22")
      .attr("stroke-width", 2.5)
      .attr("opacity", 1);

    loopSel
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "white")
      .attr("font-size", "12px")
      .attr("font-weight", "800")
      .attr("font-family", "system-ui, sans-serif")
      .text((d) => d.id);

    // Nodes
    const nodeSel = g
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .style("cursor", "grab")
      .on("click", (_e, d) => {
        _e.stopPropagation();
        onNodeClick(d.id);
      })
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on("start", (e, d) => {
            if (!e.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (e, d) => {
            d.fx = e.x;
            d.fy = e.y;
          })
          .on("end", (e, d) => {
            if (!e.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );
    nodeSelRef.current = nodeSel;

    // Pulse ring for key nodes
    nodeSel
      .filter((d) => !!d.key)
      .append("circle")
      .attr("r", 0)
      .attr("fill", "none")
      .attr("stroke", (d) => CATEGORY_COLORS[d.category] || CATEGORY_COLORS.default)
      .attr("stroke-width", 1)
      .attr("opacity", 0)
      .each(function () {
        pulseAnimate(this as SVGCircleElement);
      });

    // Node circle
    nodeSel
      .append("circle")
      .attr("r", (d) => (d.key ? FORCE_DEFAULTS.keyNodeRadius : FORCE_DEFAULTS.nodeRadius))
      .attr("fill", (d) => CATEGORY_COLORS[d.category] || CATEGORY_COLORS.default)
      .attr("fill-opacity", 0.15)
      .attr("stroke", (d) => CATEGORY_COLORS[d.category] || CATEGORY_COLORS.default)
      .attr("stroke-width", (d) => (d.key ? 2.5 : 1.5))
      .style("transition", "filter 0.2s");

    // Node labels — word-wrapped, positioned below circle for long labels
    nodeSel.each(function (d) {
      const el = d3.select(this);
      const fontSize = d.key ? 11 : 10;
      const maxCharsPerLine = d.key ? 14 : 12;
      const r = d.key ? FORCE_DEFAULTS.keyNodeRadius : FORCE_DEFAULTS.nodeRadius;

      // Word-wrap label into lines
      const words = d.label.replace(/\n/g, " ").split(/\s+/);
      const lines: string[] = [];
      let currentLine = "";
      for (const word of words) {
        if (currentLine.length + word.length + 1 > maxCharsPerLine && currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = currentLine ? `${currentLine} ${word}` : word;
        }
      }
      if (currentLine) lines.push(currentLine);

      // Position below the circle
      const labelY = r + 10;
      const lineHeight = fontSize + 2;
      lines.forEach((line, i) => {
        el.append("text")
          .attr("y", labelY + i * lineHeight)
          .attr("font-size", `${fontSize}px`)
          .attr("fill", d.key ? "white" : "#c8e0cc")
          .attr("font-weight", d.key ? "600" : "400")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "hanging")
          .attr("font-family", "system-ui, sans-serif")
          .attr("pointer-events", "none")
          .text(line);
      });
    });

    // Tooltip
    const tooltip = d3
      .select(container)
      .append("div")
      .style("position", "absolute")
      .style("background", "#213a2b")
      .style("border", "1px solid #2a4535")
      .style("border-radius", "10px")
      .style("padding", "10px 14px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "200")
      .style("max-width", "200px")
      .style("opacity", "0")
      .style("transition", "opacity 0.15s")
      .style("font-family", "system-ui, sans-serif");

    nodeSel
      .on("mouseenter", (e, d) => {
        const label = d.label.replace("\n", " ");
        tooltip
          .html(
            `<div style="font-weight:600;color:#3ddc84;margin-bottom:4px">${label}</div><div style="color:#9ab8a2;line-height:1.5">${d.desc}</div>`
          )
          .style("opacity", "1")
          .style("left", e.offsetX + 12 + "px")
          .style("top", e.offsetY - 20 + "px");
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", "0");
      });

    // Tick
    simulation.on("tick", () => {
      linkSel.attr("d", (d) => linkPath(d as { source: { x: number; y: number }; target: { x: number; y: number } }));

      edgeLabels
        .attr("x", (d: unknown) => {
          const link = d as SimLink;
          return (link.source.x + link.target.x) / 2;
        })
        .attr("y", (d: unknown) => {
          const link = d as SimLink;
          return (link.source.y + link.target.y) / 2 - 6;
        });

      nodeSel.attr("transform", (d) => `translate(${d.x},${d.y})`);

      // Compute all loop badge positions, then repel from nodes AND each other
      const badgePositions: { x: number; y: number }[] = [];
      const loopData = model.loops;
      // Pass 1: compute centroids
      for (const loop of loopData) {
        const involved = nodes.filter((n) => loop.nodes.includes(n.id));
        if (!involved.length) {
          badgePositions.push({ x: 0, y: 0 });
        } else {
          badgePositions.push({
            x: involved.reduce((s, n) => s + n.x, 0) / involved.length,
            y: involved.reduce((s, n) => s + n.y, 0) / involved.length,
          });
        }
      }
      // Pass 2: repel from nodes and other badges (8 iterations)
      const nodeClearance = 60;
      const badgeClearance = 45;
      for (let iter = 0; iter < 8; iter++) {
        for (let bi = 0; bi < badgePositions.length; bi++) {
          const bp = badgePositions[bi];
          let pushX = 0, pushY = 0;
          // Repel from nodes
          for (const n of nodes) {
            const ddx = bp.x - n.x;
            const ddy = bp.y - n.y;
            const dd = Math.sqrt(ddx * ddx + ddy * ddy) || 0.1;
            if (dd < nodeClearance) {
              const f = (nodeClearance - dd) / dd;
              pushX += ddx * f;
              pushY += ddy * f;
            }
          }
          // Repel from other badges
          for (let bj = 0; bj < badgePositions.length; bj++) {
            if (bi === bj) continue;
            const other = badgePositions[bj];
            const ddx = bp.x - other.x;
            const ddy = bp.y - other.y;
            const dd = Math.sqrt(ddx * ddx + ddy * ddy) || 0.1;
            if (dd < badgeClearance) {
              const f = (badgeClearance - dd) / dd;
              pushX += ddx * f * 1.5;
              pushY += ddy * f * 1.5;
            }
          }
          if (pushX !== 0 || pushY !== 0) {
            bp.x += pushX * 0.5;
            bp.y += pushY * 0.5;
          }
        }
      }
      // Apply positions
      loopSel.attr("transform", (_d, i) => {
        const bp = badgePositions[i];
        return bp ? `translate(${bp.x},${bp.y})` : "translate(0,0)";
      });
    });

    // Auto zoom-to-fit once simulation settles
    simulation.on("end", () => {
      if (!nodes.length) return;
      const pad = 80;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const n of nodes) {
        if (n.x < minX) minX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.x > maxX) maxX = n.x;
        if (n.y > maxY) maxY = n.y;
      }
      const bw = maxX - minX + pad * 2;
      const bh = maxY - minY + pad * 2;
      const scale = Math.min(W / bw, H / bh, 1.2);
      const tx = W / 2 - (minX + maxX) / 2 * scale;
      const ty = H / 2 - (minY + maxY) / 2 * scale;
      svg.transition().duration(600).call(
        zoom.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale)
      );
    });

    return () => {
      simulation.stop();
      d3.select(container).selectAll("svg").remove();
      tooltip.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  // Highlighting effect — hides non-relevant elements when a loop/node is selected
  useEffect(() => {
    const linkSel = linkSelRef.current;
    const nodeSel = nodeSelRef.current;
    const loopSel = loopSelRef.current;
    if (!linkSel || !nodeSel) return;

    const hasHighlight = highlightedNodeIds.length > 0;

    // Links: hide non-highlighted, bold highlighted
    linkSel
      .style("display", (_d, i) =>
        hasHighlight && !highlightedLinkIndices.includes(i) ? "none" : ""
      )
      .attr("opacity", (_d, i) =>
        highlightedLinkIndices.includes(i) ? 0.85 : 0.7
      )
      .attr("stroke-width", (_d, i) =>
        highlightedLinkIndices.includes(i) ? 2.5 : 1.5
      );

    // Nodes: hide non-highlighted entirely
    nodeSel.style("display", (d) =>
      hasHighlight && !highlightedNodeIds.includes(d.id) ? "none" : ""
    );
    nodeSel.select("circle:not([stroke-width='1'])").attr("filter", (d) =>
      hasHighlight && highlightedNodeIds.includes(d.id)
        ? "brightness(1.3) drop-shadow(0 0 8px currentColor)"
        : "none"
    );

    // Loop badges: hide those not related to the highlighted nodes
    if (loopSel) {
      loopSel.style("display", (d) => {
        if (!hasHighlight) return "";
        // Show badge if any of its nodes are highlighted
        const loopNodeSet = new Set(d.nodes);
        return highlightedNodeIds.some((id) => loopNodeSet.has(id)) ? "" : "none";
      });
    }

    // Edge labels: hide when filtering
    const edgeLabelSel = gRef.current?.selectAll(".edge-labels text");
    if (edgeLabelSel) {
      edgeLabelSel.style("display", (_d: unknown, i: number) =>
        hasHighlight && !highlightedLinkIndices.includes(i) ? "none" : ""
      );
    }
  }, [highlightedNodeIds, highlightedLinkIndices]);

  // Filter effect
  useEffect(() => {
    const linkSel = linkSelRef.current;
    const nodeSel = nodeSelRef.current;
    if (!linkSel || !nodeSel) return;

    linkSel.style("display", (d) => {
      if (d.type === "reinforcing" && !activeFilters.reinforcing) return "none";
      if (d.type === "balancing" && !activeFilters.balancing) return "none";
      return "";
    });

    nodeSel.style("display", activeFilters.nodes ? "" : "none");

    // Hide loop badges based on their type filter
    const loopSel = loopSelRef.current;
    if (loopSel) {
      loopSel.style("display", (d) => {
        if (d.type === "R" && !activeFilters.reinforcing) return "none";
        if (d.type === "B" && !activeFilters.balancing) return "none";
        return "";
      });
    }

    // Hide edge labels when their links are hidden
    const edgeLabelSel = gRef.current?.selectAll(".edge-labels text");
    if (edgeLabelSel) {
      edgeLabelSel.style("display", (_d: unknown) => {
        const link = _d as SimLink;
        if (link.type === "reinforcing" && !activeFilters.reinforcing) return "none";
        if (link.type === "balancing" && !activeFilters.balancing) return "none";
        return "";
      });
    }
  }, [activeFilters]);

  // Force toggle
  useEffect(() => {
    const sim = simulationRef.current;
    if (!sim) return;
    if (forceActive) {
      sim.alphaTarget(0.1).restart();
      setTimeout(() => sim.alphaTarget(0), 2000);
    } else {
      sim.stop();
    }
  }, [forceActive]);

  // Zoom controls exposed to parent
  const zoomIn = useCallback(() => {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (svg && zoom) svg.transition().duration(300).call(zoom.scaleBy, 1.2);
  }, []);

  const zoomOut = useCallback(() => {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (svg && zoom) svg.transition().duration(300).call(zoom.scaleBy, 0.8);
  }, []);

  const resetView = useCallback(() => {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (svg && zoom)
      svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
  }, []);

  // Expose zoom controls via data attribute for parent to read
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as HTMLDivElement & { __zoomControls?: unknown }).__zoomControls = {
        zoomIn,
        zoomOut,
        resetView,
      };
    }
  }, [zoomIn, zoomOut, resetView]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative causal-loop-container"
      style={{ minHeight: "400px" }}
      data-diagram="true"
    />
  );
}

function pulseAnimate(el: SVGCircleElement): void {
  d3.select(el)
    .attr("r", 32)
    .attr("opacity", 0.6)
    .transition()
    .duration(2000)
    .ease(d3.easeCubicOut)
    .attr("r", 60)
    .attr("opacity", 0)
    .on("end", () => pulseAnimate(el));
}
