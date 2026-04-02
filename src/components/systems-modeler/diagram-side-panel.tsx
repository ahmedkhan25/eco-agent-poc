"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SystemModel } from "@/lib/systems-modeler/types";
import { CATEGORY_COLORS, LINK_COLORS } from "@/lib/systems-modeler/constants";

interface DiagramSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  model: SystemModel;
  selectedNodeId?: string;
  selectedLoopId?: string;
}

export function DiagramSidePanel({
  isOpen,
  onClose,
  model,
  selectedNodeId,
  selectedLoopId,
}: DiagramSidePanelProps) {
  const selectedNode = selectedNodeId
    ? model.nodes.find((n) => n.id === selectedNodeId)
    : null;

  const selectedLoop = selectedLoopId
    ? model.loops.find((l) => l.id === selectedLoopId)
    : null;

  // Find all links connected to selected node
  const connectedLinks = selectedNode
    ? model.links.filter(
        (l) => l.source === selectedNode.id || l.target === selectedNode.id
      )
    : [];

  // For a selected loop, get involved node objects
  const loopNodes = selectedLoop
    ? [...new Set(selectedLoop.nodes)]
        .map((nId) => model.nodes.find((n) => n.id === nId))
        .filter(Boolean)
    : [];

  return (
    <AnimatePresence>
      {isOpen && (selectedNode || selectedLoop) && (
        <motion.div
          className={cn(
            "fixed top-0 right-0 z-40 h-full w-80 md:w-96",
            "bg-slate-900/95 backdrop-blur-lg",
            "border-l border-slate-700/60",
            "shadow-2xl shadow-black/50",
            "flex flex-col overflow-hidden"
          )}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-slate-700/60">
            <div className="flex-1 min-w-0 pr-2">
              {selectedNode && (
                <>
                  <h3
                    className="text-lg font-bold truncate"
                    style={{ color: CATEGORY_COLORS[selectedNode.category] }}
                  >
                    {selectedNode.label}
                  </h3>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {selectedNode.category} variable
                    {selectedNode.key && " \u00b7 Key leverage point"}
                  </span>
                </>
              )}
              {selectedLoop && (
                <>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white",
                        selectedLoop.type === "R"
                          ? "bg-red-500/80"
                          : "bg-blue-500/80"
                      )}
                    >
                      {selectedLoop.type}
                    </span>
                    <h3 className="text-lg font-bold text-slate-100">
                      {selectedLoop.name}
                    </h3>
                  </div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1 block">
                    {selectedLoop.type === "R"
                      ? "Reinforcing Loop"
                      : "Balancing Loop"}
                  </span>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                "text-slate-500 hover:text-slate-300",
                "hover:bg-slate-800"
              )}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Description */}
            {selectedNode && (
              <>
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Description
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {selectedNode.desc}
                  </p>
                </div>

                {/* Example */}
                {selectedNode.example && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Example
                    </h4>
                    <div className="px-3 py-2.5 rounded-lg bg-teal-900/20 border border-teal-700/30">
                      <p className="text-sm text-teal-200/90 leading-relaxed italic">
                        {selectedNode.example}
                      </p>
                    </div>
                  </div>
                )}

                {/* Connections */}
                {connectedLinks.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Connections ({connectedLinks.length})
                    </h4>
                    <div className="space-y-2">
                      {connectedLinks.map((link, i) => {
                        const isSource = link.source === selectedNode.id;
                        const otherNodeId = isSource
                          ? link.target
                          : link.source;
                        const otherNode = model.nodes.find(
                          (n) => n.id === otherNodeId
                        );
                        if (!otherNode) return null;

                        return (
                          <div
                            key={`${link.source}-${link.target}-${i}`}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-lg",
                              "bg-slate-800/60 border border-slate-700/40"
                            )}
                          >
                            {/* Link type dot */}
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: LINK_COLORS[link.type],
                              }}
                            />

                            {/* Direction and label */}
                            <div className="flex-1 min-w-0 flex items-center gap-1.5">
                              {isSource ? (
                                <>
                                  <span className="text-xs text-slate-500 flex-shrink-0">
                                    {link.label}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                                  <span className="text-sm text-slate-200 truncate">
                                    {otherNode.label}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-sm text-slate-200 truncate">
                                    {otherNode.label}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                                  <span className="text-xs text-slate-500 flex-shrink-0">
                                    {link.label}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Lag */}
                            <span className="text-[10px] text-slate-500 flex-shrink-0 whitespace-nowrap">
                              {link.lag}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedLoop && (
              <>
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Description
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {selectedLoop.desc}
                  </p>
                </div>

                {/* Loop nodes */}
                {loopNodes.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Involved Nodes ({loopNodes.length})
                    </h4>
                    <div className="space-y-1.5">
                      {loopNodes.map((node) => {
                        if (!node) return null;
                        return (
                          <div
                            key={node.id}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-lg",
                              "bg-slate-800/60 border border-slate-700/40"
                            )}
                          >
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor:
                                  CATEGORY_COLORS[node.category],
                              }}
                            />
                            <span className="text-sm text-slate-200 truncate">
                              {node.label}
                            </span>
                            {node.key && (
                              <span className="ml-auto text-[10px] text-teal-400 font-medium flex-shrink-0">
                                KEY
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
