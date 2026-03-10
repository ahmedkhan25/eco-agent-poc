"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  FileInput,
  Sparkles,
  MessageSquare,
  Zap,
  BookOpen,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelPhase } from "@/lib/systems-modeler/types";
import { PHASE_LABELS, PHASE_DESCRIPTIONS } from "@/lib/systems-modeler/constants";

const PHASE_ORDER: ModelPhase[] = [
  "input",
  "generate",
  "iterate",
  "collide",
  "humanize",
];

const PHASE_ICONS: Record<ModelPhase, React.ReactNode> = {
  input: <FileInput className="w-4 h-4" />,
  generate: <Sparkles className="w-4 h-4" />,
  iterate: <MessageSquare className="w-4 h-4" />,
  collide: <Zap className="w-4 h-4" />,
  humanize: <BookOpen className="w-4 h-4" />,
};

interface PhaseIndicatorProps {
  currentPhase: ModelPhase;
  onPhaseClick: (phase: ModelPhase) => void;
}

export function PhaseIndicator({
  currentPhase,
  onPhaseClick,
}: PhaseIndicatorProps) {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 px-3 py-2">
      {PHASE_ORDER.map((phase, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = phase === currentPhase;
        const isFuture = index > currentIndex;

        return (
          <React.Fragment key={phase}>
            {/* Connector line between steps */}
            {index > 0 && (
              <div
                className={cn(
                  "hidden sm:block h-px w-6 md:w-10 transition-colors duration-300",
                  isCompleted
                    ? "bg-teal-500 dark:bg-teal-400"
                    : "bg-slate-300 dark:bg-slate-600"
                )}
              />
            )}

            {/* Step button */}
            <button
              onClick={() => onPhaseClick(phase)}
              disabled={isFuture}
              className={cn(
                "group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900",
                isCurrent &&
                  "bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500/30",
                isCompleted &&
                  "text-teal-600 dark:text-teal-400 hover:bg-teal-500/5 dark:hover:bg-teal-500/10 cursor-pointer",
                isFuture &&
                  "text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60"
              )}
              title={PHASE_DESCRIPTIONS[phase]}
            >
              {/* Icon / check circle */}
              <motion.div
                className={cn(
                  "relative flex items-center justify-center w-7 h-7 rounded-full border-2 transition-colors duration-200",
                  isCurrent &&
                    "border-teal-500 dark:border-teal-400 bg-teal-500 dark:bg-teal-500 text-white",
                  isCompleted &&
                    "border-teal-500 dark:border-teal-400 bg-teal-500 dark:bg-teal-500 text-white",
                  isFuture &&
                    "border-slate-300 dark:border-slate-600 bg-transparent text-slate-400 dark:text-slate-500"
                )}
                initial={false}
                animate={
                  isCurrent
                    ? { scale: [1, 1.1, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.3 }}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  PHASE_ICONS[phase]
                )}
              </motion.div>

              {/* Label (hidden on very small screens) */}
              <span
                className={cn(
                  "hidden md:inline text-xs font-medium whitespace-nowrap",
                  isCurrent && "text-teal-700 dark:text-teal-300",
                  isCompleted && "text-teal-600 dark:text-teal-400",
                  isFuture && "text-slate-400 dark:text-slate-500"
                )}
              >
                {PHASE_LABELS[phase]}
              </span>

              {/* Active indicator dot */}
              {isCurrent && (
                <motion.div
                  className="absolute -bottom-1 left-1/2 w-1 h-1 rounded-full bg-teal-500 dark:bg-teal-400"
                  layoutId="phaseIndicator"
                  initial={{ opacity: 0, x: "-50%" }}
                  animate={{ opacity: 1, x: "-50%" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
