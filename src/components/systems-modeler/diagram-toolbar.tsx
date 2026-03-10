"use client";

import React from "react";
import {
  Plus,
  Minus,
  Home,
  RefreshCw,
  List,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DiagramToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onToggleForce: () => void;
  onOpenLoops: () => void;
  onUndo: () => void;
  forceActive: boolean;
  canUndo: boolean;
}

function ToolbarButton({
  onClick,
  disabled = false,
  active = false,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "w-9 h-9 flex items-center justify-center rounded-full border transition-all duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
        active
          ? "border-green-500 text-green-400 bg-green-500/10"
          : "border-slate-600 text-slate-400 hover:border-green-500 hover:text-green-400",
        disabled && "opacity-30 cursor-not-allowed hover:border-slate-600 hover:text-slate-400"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-slate-600" />;
}

export function DiagramToolbar({
  onZoomIn,
  onZoomOut,
  onResetView,
  onToggleForce,
  onOpenLoops,
  onUndo,
  forceActive,
  canUndo,
}: DiagramToolbarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-30",
        "flex items-center gap-2 px-4 py-2.5 rounded-full",
        "bg-slate-900/80 backdrop-blur-md",
        "border border-slate-700/60",
        "shadow-2xl shadow-black/40"
      )}
    >
      {/* Zoom controls */}
      <ToolbarButton onClick={onZoomIn} title="Zoom In">
        <Plus className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={onZoomOut} title="Zoom Out">
        <Minus className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* View controls */}
      <ToolbarButton onClick={onResetView} title="Reset View">
        <Home className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={onToggleForce}
        active={forceActive}
        title={forceActive ? "Disable Physics" : "Enable Physics"}
      >
        <RefreshCw className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Panels & history */}
      <ToolbarButton onClick={onOpenLoops} title="Open Loops Panel">
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo"
      >
        <Undo2 className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
}
