"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Shuffle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { COLLISION_CONCEPTS } from "@/lib/systems-modeler/prompts";

interface CollisionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCollide: (concept: string) => void;
  isLoading: boolean;
}

export function CollisionDialog({
  isOpen,
  onClose,
  onCollide,
  isLoading,
}: CollisionDialogProps) {
  const [concept, setConcept] = useState("");

  const handleRandomConcept = () => {
    const randomIndex = Math.floor(Math.random() * COLLISION_CONCEPTS.length);
    setConcept(COLLISION_CONCEPTS[randomIndex]);
  };

  const handleCollide = () => {
    if (concept.trim().length === 0 || isLoading) return;
    onCollide(concept.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCollide();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isLoading && onClose()}
          />

          {/* Dialog */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={cn(
                "bg-white dark:bg-slate-800 rounded-2xl shadow-2xl",
                "max-w-md w-full overflow-hidden pointer-events-auto",
                "border border-slate-200 dark:border-slate-700"
              )}
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* Header accent bar */}
              <div className="h-1.5 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500" />

              <div className="p-6 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        The Aha! Paradox
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Concept Collision
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => !isLoading && onClose()}
                    disabled={isLoading}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200",
                      "hover:bg-slate-100 dark:hover:bg-slate-700",
                      "disabled:opacity-30 disabled:cursor-not-allowed"
                    )}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Collide your system model with an unrelated concept to expose
                  hidden assumptions and reveal the{" "}
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    loadbearing delusion
                  </span>{" "}
                  constraining your thinking. Choose a concept or pick one at
                  random.
                </p>

                {/* Concept input */}
                <div className="space-y-2">
                  <label
                    htmlFor="collision-concept"
                    className="text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Collision Concept
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="collision-concept"
                      type="text"
                      value={concept}
                      onChange={(e) => setConcept(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="e.g. Mycelial Network"
                      disabled={isLoading}
                      className={cn(
                        "flex-1 px-4 py-2.5 rounded-lg text-sm",
                        "bg-slate-50 dark:bg-slate-900/60",
                        "border border-slate-200 dark:border-slate-600",
                        "text-slate-800 dark:text-slate-200",
                        "placeholder:text-slate-400 dark:placeholder:text-slate-500",
                        "focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-colors"
                      )}
                    />
                    <button
                      type="button"
                      onClick={handleRandomConcept}
                      disabled={isLoading}
                      title="Random concept"
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium",
                        "border border-slate-200 dark:border-slate-600",
                        "text-slate-600 dark:text-slate-300",
                        "hover:bg-slate-100 dark:hover:bg-slate-700",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-colors"
                      )}
                    >
                      <Shuffle className="w-4 h-4" />
                      <span className="hidden sm:inline">Random</span>
                    </button>
                  </div>
                </div>

                {/* Collide button */}
                <button
                  onClick={handleCollide}
                  disabled={concept.trim().length === 0 || isLoading}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold",
                    "text-white shadow-md",
                    "transition-all duration-200",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800",
                    concept.trim().length > 0 && !isLoading
                      ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 hover:shadow-lg active:scale-[0.98]"
                      : "bg-slate-300 dark:bg-slate-600 cursor-not-allowed"
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Colliding concepts...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Collide</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
