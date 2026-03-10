"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, FileText, Database } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelInputFormProps {
  onGenerate: (topic: string, useRag: boolean, content?: string) => void;
  isLoading: boolean;
}

export function ModelInputForm({ onGenerate, isLoading }: ModelInputFormProps) {
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [useRag, setUseRag] = useState(false);
  const [showContentArea, setShowContentArea] = useState(false);

  const canSubmit = topic.trim().length > 0 && !isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onGenerate(topic.trim(), useRag, content.trim() || undefined);
  };

  return (
    <motion.div
      className="flex items-center justify-center min-h-[60vh] px-4"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="w-full max-w-xl">
        <motion.div
          className={cn(
            "rounded-2xl border shadow-xl overflow-hidden",
            "bg-white dark:bg-slate-800/90",
            "border-slate-200 dark:border-slate-700/80"
          )}
          initial={{ scale: 0.97 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* Header gradient bar */}
          <div className="h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500" />

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Title */}
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Systems Modeler
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Enter a topic to generate a causal loop diagram
              </p>
            </div>

            {/* Topic input */}
            <div className="space-y-1.5">
              <label
                htmlFor="topic"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Topic
              </label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Climate migration in the Pacific Northwest"
                disabled={isLoading}
                className={cn(
                  "w-full px-4 py-2.5 rounded-lg text-sm",
                  "bg-slate-50 dark:bg-slate-900/60",
                  "border border-slate-200 dark:border-slate-600",
                  "text-slate-800 dark:text-slate-200",
                  "placeholder:text-slate-400 dark:placeholder:text-slate-500",
                  "focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors"
                )}
              />
            </div>

            {/* Toggle to show content paste area */}
            <button
              type="button"
              onClick={() => setShowContentArea(!showContentArea)}
              className={cn(
                "flex items-center gap-2 text-xs font-medium transition-colors",
                "text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              {showContentArea ? "Hide" : "Paste"} additional content
              (optional)
            </button>

            {/* Content textarea */}
            {showContentArea && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5"
              >
                <label
                  htmlFor="content"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Additional Content
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste article text, research notes, or other content to inform the model..."
                  disabled={isLoading}
                  rows={5}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg text-sm resize-none",
                    "bg-slate-50 dark:bg-slate-900/60",
                    "border border-slate-200 dark:border-slate-600",
                    "text-slate-800 dark:text-slate-200",
                    "placeholder:text-slate-400 dark:placeholder:text-slate-500",
                    "focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-colors"
                  )}
                />
              </motion.div>
            )}

            {/* RAG toggle */}
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Use Olympia RAG Documents
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={useRag}
                onClick={() => setUseRag(!useRag)}
                disabled={isLoading}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  useRag
                    ? "bg-teal-500 dark:bg-teal-600"
                    : "bg-slate-300 dark:bg-slate-600"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                    useRag ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Generate button */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold",
                "text-white shadow-md",
                "transition-all duration-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800",
                canSubmit
                  ? "bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 hover:shadow-lg active:scale-[0.98]"
                  : "bg-slate-300 dark:bg-slate-600 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating model...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Model</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
}
