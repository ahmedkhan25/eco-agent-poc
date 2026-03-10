"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import type { SystemModel, SystemModelNode, SystemModelLink } from "@/lib/systems-modeler/types";
import { CATEGORY_COLORS, LINK_COLORS, FORCE_DEFAULTS } from "@/lib/systems-modeler/constants";
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

    // Initial layout: place all nodes in a circle first
    circularLayout(nodes, W, H);

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
        n.x = cx + (Math.random() - 0.5) * 80;
        n.y = cy + (Math.random() - 0.5) * 80;
      }
    });

    // Force simulation
    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(links as unknown as SimLink[])
          .id((d) => d.id)
          .distance(FORCE_DEFAULTS.linkDistance)
          .strength(FORCE_DEFAULTS.linkStrength)
      )
      .force("charge", d3.forceManyBody().strength(FORCE_DEFAULTS.chargeStrength))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collision", d3.forceCollide(FORCE_DEFAULTS.collisionRadius));
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
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.7)
      .attr("marker-end", (d) => `url(#arrow-${d.type})`);
    linkSelRef.current = linkSel;

    // Edge labels (lag)
    const edgeLabels = g
      .append("g")
      .attr("class", "edge-labels")
      .selectAll("text")
      .data(links as unknown as SimLink[])
      .enter()
      .append("text")
      .attr("font-size", "9px")
      .attr("fill", "#5a7a62")
      .attr("text-anchor", "middle")
      .attr("font-family", "system-ui, sans-serif")
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
      .attr("r", 16)
      .attr("fill", (d) => (d.type === "R" ? LINK_COLORS.reinforcing : LINK_COLORS.balancing))
      .attr("opacity", 0.9);

    loopSel
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "white")
      .attr("font-size", "11px")
      .attr("font-weight", "700")
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

    // Node labels (multiline)
    nodeSel.each(function (d) {
      const el = d3.select(this);
      const lines = d.label.split("\n");
      lines.forEach((line, i) => {
        el.append("text")
          .attr("y", lines.length === 2 ? (i === 0 ? -7 : 7) : 0)
          .attr("font-size", d.key ? "11px" : "10px")
          .attr("fill", d.key ? "white" : "#c8e0cc")
          .attr("font-weight", d.key ? "600" : "400")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
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

      loopSel.attr("transform", (d) => {
        const involved = nodes.filter((n) => d.nodes.includes(n.id));
        if (!involved.length) return "translate(0,0)";
        const cx = involved.reduce((s, n) => s + n.x, 0) / involved.length;
        const cy = involved.reduce((s, n) => s + n.y, 0) / involved.length;
        return `translate(${cx},${cy})`;
      });
    });

    return () => {
      simulation.stop();
      d3.select(container).selectAll("svg").remove();
      tooltip.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  // Highlighting effect
  useEffect(() => {
    const linkSel = linkSelRef.current;
    const nodeSel = nodeSelRef.current;
    if (!linkSel || !nodeSel) return;

    linkSel
      .attr("opacity", (_d, i) =>
        highlightedLinkIndices.length === 0 || highlightedLinkIndices.includes(i) ? 0.7 : 0.15
      )
      .attr("stroke-width", (_d, i) =>
        highlightedLinkIndices.includes(i) ? 2.5 : 1.5
      );

    nodeSel.select("circle:not([stroke-width='1'])").attr("filter", (d) =>
      highlightedNodeIds.length > 0 && highlightedNodeIds.includes(d.id)
        ? "brightness(1.4) drop-shadow(0 0 12px currentColor)"
        : highlightedNodeIds.length > 0
          ? "brightness(0.5)"
          : "none"
    );
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
