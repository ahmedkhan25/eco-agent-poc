"use client";

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Loader2,
  User,
  ImageIcon,
  Users,
  Eye,
  FileText,
  AlertTriangle,
  Target,
  Clock,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NarrativeResult, NarrativeMode } from "@/lib/systems-modeler/types";
import { buildProfessionalIllustrationPrompt } from "@/lib/systems-modeler/prompts";

interface NarrativePanelProps {
  narrative: NarrativeResult | null;
  onGenerate: () => void;
  isLoading: boolean;
  illustrationDataUrl?: string | null;
  onIllustrationGenerated?: (dataUrl: string) => void;
  characterImages?: Record<string, string>;
  mode?: NarrativeMode;
}

export function NarrativePanel({
  narrative,
  onGenerate,
  isLoading,
  illustrationDataUrl,
  onIllustrationGenerated,
  characterImages = {},
  mode = "story",
}: NarrativePanelProps) {
  const [illustrating, setIllustrating] = useState(false);
  const [illustrateError, setIllustrateError] = useState<string | null>(null);

  const isProfessional = mode === "professional" || narrative?.mode === "professional";

  const handleIllustrate = useCallback(async () => {
    if (!narrative) return;
    setIllustrating(true);
    setIllustrateError(null);

    try {
      const prompt = isProfessional
        ? buildProfessionalIllustrationPrompt(narrative.title)
        : `Create a dramatic, mythic illustration in a storybook watercolor style for this systems narrative titled "${narrative.title}". The scene should depict the key characters and their relationships in a symbolic, archetypal way. Include environmental elements like storms, rivers, buildings, and nature. Style: rich colors, atmospheric lighting, epic scale. Do NOT include any text or words in the image.`;

      const res = await fetch("/api/systems-modeler/illustrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Image generation failed");
      }

      const data = await res.json();
      const dataUrl = `data:${data.mimeType};base64,${data.image}`;
      onIllustrationGenerated?.(dataUrl);
    } catch (err) {
      setIllustrateError(err instanceof Error ? err.message : "Failed to generate illustration");
    } finally {
      setIllustrating(false);
    }
  }, [narrative, onIllustrationGenerated, isProfessional]);

  // No narrative yet - show generate prompt
  if (!narrative && !isLoading) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center py-20 px-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className={cn(
          "p-4 rounded-full mb-4",
          isProfessional
            ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
            : "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
        )}>
          {isProfessional ? <FileText className="w-8 h-8" /> : <BookOpen className="w-8 h-8" />}
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
          {isProfessional ? "Professional Report" : "The Model Story"}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md mb-6">
          {isProfessional
            ? "Generate a structured analytical report with stakeholder analysis, key insights, and policy recommendations."
            : "Transform your system model into a heartfelt emotional narrative. Characters will represent system variables, and plot points will reflect the causal dynamics of your diagram."}
        </p>
        <button
          onClick={onGenerate}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold",
            "text-white shadow-md",
            "active:scale-[0.98]",
            "transition-all duration-200",
            isProfessional
              ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          )}
        >
          {isProfessional ? <FileText className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
          {isProfessional ? "Generate Report" : "Generate Story"}
        </button>
      </motion.div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center py-20 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Loader2 className={cn(
          "w-8 h-8 animate-spin mb-4",
          isProfessional ? "text-blue-500 dark:text-blue-400" : "text-amber-500 dark:text-amber-400"
        )} />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isProfessional ? "Generating analytical report..." : "Weaving your system into a story..."}
        </p>
      </motion.div>
    );
  }

  if (!narrative) return null;

  // Professional mode rendering
  if (isProfessional && narrative.professional) {
    return <ProfessionalReport
      narrative={narrative}
      illustrationDataUrl={illustrationDataUrl}
      illustrating={illustrating}
      illustrateError={illustrateError}
      onIllustrate={handleIllustrate}
      characterImages={characterImages}
    />;
  }

  // Story mode rendering (unchanged)
  return <StoryNarrative
    narrative={narrative}
    illustrationDataUrl={illustrationDataUrl}
    illustrating={illustrating}
    illustrateError={illustrateError}
    onIllustrate={handleIllustrate}
    characterImages={characterImages}
  />;
}

// =============================================================================
// STORY MODE (existing layout, extracted into component)
// =============================================================================

function StoryNarrative({
  narrative,
  illustrationDataUrl,
  illustrating,
  illustrateError,
  onIllustrate,
  characterImages,
}: {
  narrative: NarrativeResult;
  illustrationDataUrl?: string | null;
  illustrating: boolean;
  illustrateError: string | null;
  onIllustrate: () => void;
  characterImages: Record<string, string>;
}) {
  const paragraphs = narrative.narrative
    .split("\n\n")
    .filter((p) => p.trim().length > 0);

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div
        className={cn(
          "max-w-3xl mx-auto px-6 sm:px-10 py-10",
          "bg-amber-50/60 dark:bg-amber-950/20",
          "border border-amber-200/40 dark:border-amber-800/30",
          "rounded-2xl shadow-lg"
        )}
      >
        {/* Title */}
        <motion.h2
          className={cn(
            "text-2xl sm:text-3xl font-serif font-bold text-center mb-8",
            "text-amber-900 dark:text-amber-200"
          )}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {narrative.title}
        </motion.h2>

        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-px w-12 bg-amber-300 dark:bg-amber-700" />
          <BookOpen className="w-4 h-4 text-amber-400 dark:text-amber-600" />
          <div className="h-px w-12 bg-amber-300 dark:bg-amber-700" />
        </div>

        {/* Narrative paragraphs */}
        <div className="space-y-4">
          {paragraphs.map((paragraph, index) => (
            <motion.p
              key={index}
              className={cn(
                "text-sm sm:text-base leading-relaxed font-serif",
                "text-amber-950/90 dark:text-amber-100/80",
                index === 0 && "first-letter:text-3xl first-letter:font-bold first-letter:float-left first-letter:mr-1.5 first-letter:leading-none first-letter:text-amber-700 dark:first-letter:text-amber-400"
              )}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.05 }}
            >
              {paragraph}
            </motion.p>
          ))}
        </div>

        {/* Illustration */}
        <IllustrationSection
          title={narrative.title}
          illustrationDataUrl={illustrationDataUrl}
          illustrating={illustrating}
          illustrateError={illustrateError}
          onIllustrate={onIllustrate}
          accentColor="amber"
        />

        {/* Character cards */}
        {narrative.characters && narrative.characters.length > 0 && (
          <motion.div
            className="mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="h-px w-8 bg-amber-300 dark:bg-amber-700" />
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-500">
                Characters
              </span>
              <div className="h-px w-8 bg-amber-300 dark:bg-amber-700" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {narrative.characters.map((character, index) => (
                <motion.div
                  key={index}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl",
                    "bg-white/60 dark:bg-slate-800/40",
                    "border border-amber-200/50 dark:border-amber-800/30"
                  )}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                >
                  <div className="flex-shrink-0">
                    {characterImages[character.name] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={characterImages[character.name]}
                        alt={character.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-amber-200 dark:border-amber-700"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border-2 border-amber-200/50 dark:border-amber-800/30">
                        <Loader2 className="w-4 h-4 animate-spin opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 pt-1">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                      {character.name}
                    </p>
                    <p className="text-xs text-amber-700/70 dark:text-amber-400/60 mt-0.5">
                      Represents:{" "}
                      <span className="font-medium">
                        {character.representsNode}
                      </span>
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {character.role}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Stakeholder Perspectives */}
        {narrative.stakeholderPerspectives && narrative.stakeholderPerspectives.length > 0 && (
          <motion.div
            className="mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="h-px w-8 bg-amber-300 dark:bg-amber-700" />
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-500">
                Stakeholder Perspectives
              </span>
              <div className="h-px w-8 bg-amber-300 dark:bg-amber-700" />
            </div>

            <p className="text-xs text-amber-800/60 dark:text-amber-400/50 text-center mb-4 italic">
              The same system dynamics feel different depending on where you sit.
              Here&apos;s how the story shifts for each key audience.
            </p>

            <div className="space-y-3">
              {narrative.stakeholderPerspectives.map((perspective, index) => (
                <motion.div
                  key={index}
                  className={cn(
                    "p-4 rounded-xl",
                    "bg-white/60 dark:bg-slate-800/40",
                    "border border-amber-200/50 dark:border-amber-800/30"
                  )}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 + index * 0.08 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                      {perspective.stakeholder}
                    </h4>
                  </div>

                  <div className="space-y-2 pl-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700/60 dark:text-amber-500/60 mb-0.5">
                        Narrative Shift
                      </p>
                      <p className="text-xs text-amber-950/80 dark:text-amber-100/70 leading-relaxed">
                        {perspective.narrativeShift}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700/60 dark:text-amber-500/60 mb-0.5">
                        The Hook
                      </p>
                      <p className="text-xs text-amber-950/80 dark:text-amber-100/70 leading-relaxed">
                        {perspective.hook}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700/60 dark:text-amber-500/60 mb-0.5">
                        Emotional Core
                      </p>
                      <p className="text-xs text-amber-950/80 dark:text-amber-100/70 leading-relaxed italic">
                        {perspective.emotionalCore}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// =============================================================================
// PROFESSIONAL MODE
// =============================================================================

function ProfessionalReport({
  narrative,
  illustrationDataUrl,
  illustrating,
  illustrateError,
  onIllustrate,
  characterImages,
}: {
  narrative: NarrativeResult;
  illustrationDataUrl?: string | null;
  illustrating: boolean;
  illustrateError: string | null;
  onIllustrate: () => void;
  characterImages: Record<string, string>;
}) {
  const pro = narrative.professional!;

  const severityColor = (s: string) => {
    switch (s) {
      case "critical": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "significant": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      default: return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  const difficultyColor = (d: string) => {
    switch (d) {
      case "high": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "medium": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      default: return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    }
  };

  const influenceColor = (i: string) => {
    switch (i) {
      case "high": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
      case "medium": return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
      default: return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div
        className={cn(
          "max-w-3xl mx-auto px-6 sm:px-10 py-10",
          "bg-slate-50/80 dark:bg-slate-900/40",
          "border border-slate-200/60 dark:border-slate-700/40",
          "rounded-2xl shadow-lg"
        )}
      >
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
            Systems Dynamics Analysis
          </p>
          <h2 className="text-2xl sm:text-3xl font-sans font-bold text-slate-900 dark:text-slate-100">
            {narrative.title}
          </h2>
          <div className="h-1 w-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mt-3" />
        </motion.div>

        {/* Executive Summary */}
        <Section title="Executive Summary" icon={<FileText className="w-4 h-4" />} delay={0.15}>
          <div className="space-y-3">
            {pro.executiveSummary.split("\n\n").filter(p => p.trim()).map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {p}
              </p>
            ))}
          </div>
        </Section>

        {/* System Dynamics Overview */}
        <Section title="System Dynamics Overview" icon={<BarChart3 className="w-4 h-4" />} delay={0.2}>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {pro.systemDynamicsOverview}
          </p>
        </Section>

        {/* Stakeholder Analysis (above visualization) */}
        {pro.stakeholderAnalysis && pro.stakeholderAnalysis.length > 0 && (
          <Section title="Stakeholder Analysis" icon={<Users className="w-4 h-4" />} delay={0.25}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 pr-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Stakeholder</th>
                    <th className="text-left py-2 pr-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Role</th>
                    <th className="text-left py-2 pr-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Influence</th>
                    <th className="text-left py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Key Loops</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pro.stakeholderAnalysis.map((s, i) => (
                    <tr key={i}>
                      <td className="py-2.5 pr-3 font-medium text-slate-800 dark:text-slate-200">{s.stakeholder}</td>
                      <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-400 text-xs">{s.role}</td>
                      <td className="py-2.5 pr-3">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase", influenceColor(s.influence))}>
                          {s.influence}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex gap-1 flex-wrap">
                          {s.keyLoops.map((loop) => (
                            <span key={loop} className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-mono font-semibold">
                              {loop}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Incentives below table */}
            <div className="mt-4 space-y-2">
              {pro.stakeholderAnalysis.map((s, i) => (
                <div key={i} className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{s.stakeholder}:</span>{" "}
                  {s.incentives}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Visualization */}
        <IllustrationSection
          title={narrative.title}
          illustrationDataUrl={illustrationDataUrl}
          illustrating={illustrating}
          illustrateError={illustrateError}
          onIllustrate={onIllustrate}
          accentColor="blue"
        />

        {/* Key Insights */}
        {pro.keyInsights && pro.keyInsights.length > 0 && (
          <Section title="Key Insights" icon={<AlertTriangle className="w-4 h-4" />} delay={0.3}>
            <div className="space-y-3">
              {pro.keyInsights.map((insight, i) => (
                <motion.div
                  key={i}
                  className={cn(
                    "p-4 rounded-xl",
                    "bg-white/80 dark:bg-slate-800/60",
                    "border border-slate-200/60 dark:border-slate-700/40"
                  )}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.05 }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {insight.insight}
                    </p>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase whitespace-nowrap", severityColor(insight.severity))}>
                      {insight.severity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-mono font-semibold">
                      {insight.relatedLoop}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {insight.evidence}
                  </p>
                </motion.div>
              ))}
            </div>
          </Section>
        )}

        {/* Policy Recommendations */}
        {pro.policyRecommendations && pro.policyRecommendations.length > 0 && (
          <Section title="Policy Recommendations" icon={<Target className="w-4 h-4" />} delay={0.35}>
            <div className="space-y-3">
              {pro.policyRecommendations.map((rec, i) => (
                <motion.div
                  key={i}
                  className={cn(
                    "p-4 rounded-xl",
                    "bg-white/80 dark:bg-slate-800/60",
                    "border border-slate-200/60 dark:border-slate-700/40"
                  )}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                >
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                    {rec.recommendation}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-mono font-semibold">
                      {rec.targetLoop}
                    </span>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase", difficultyColor(rec.difficulty))}>
                      {rec.difficulty} difficulty
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold">
                      <Clock className="w-3 h-3" />
                      {rec.timeframe}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    <span className="font-medium text-slate-600 dark:text-slate-300">Expected impact:</span>{" "}
                    {rec.expectedImpact}
                  </p>
                </motion.div>
              ))}
            </div>
          </Section>
        )}

        {/* Archetype Analysis */}
        {pro.archetypeAnalysis && (
          <Section title="Archetype Analysis" icon={<Eye className="w-4 h-4" />} delay={0.4}>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {pro.archetypeAnalysis}
            </p>
          </Section>
        )}

        {/* Key Actors */}
        {narrative.characters && narrative.characters.length > 0 && (
          <Section title="Key Actors" icon={<User className="w-4 h-4" />} delay={0.45}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {narrative.characters.map((character, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl",
                    "bg-white/80 dark:bg-slate-800/60",
                    "border border-slate-200/50 dark:border-slate-700/30"
                  )}
                >
                  <div className="flex-shrink-0">
                    {characterImages[character.name] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={characterImages[character.name]}
                        alt={character.name}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center border border-slate-200/50 dark:border-slate-700/30">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {character.name}
                    </p>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                      {character.representsNode}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {character.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-slate-200/60 dark:border-slate-700/40 text-center">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Generated by EcoHeart Systems Modeler
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// SHARED COMPONENTS
// =============================================================================

function Section({
  title,
  icon,
  delay = 0,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="mt-8"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-blue-600 dark:text-blue-400">{icon}</span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {title}
        </h3>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700 ml-2" />
      </div>
      {children}
    </motion.div>
  );
}

function IllustrationSection({
  title,
  illustrationDataUrl,
  illustrating,
  illustrateError,
  onIllustrate,
  accentColor,
}: {
  title: string;
  illustrationDataUrl?: string | null;
  illustrating: boolean;
  illustrateError: string | null;
  onIllustrate: () => void;
  accentColor: "amber" | "blue";
}) {
  const isBlue = accentColor === "blue";

  return (
    <motion.div
      className="mt-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.35 }}
    >
      <div className="flex items-center justify-center gap-3 mb-5">
        <div className={cn("h-px w-8", isBlue ? "bg-slate-300 dark:bg-slate-600" : "bg-amber-300 dark:bg-amber-700")} />
        <span className={cn(
          "text-xs font-semibold uppercase tracking-widest",
          isBlue ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-500"
        )}>
          {isBlue ? "Visualization" : "Illustration"}
        </span>
        <div className={cn("h-px w-8", isBlue ? "bg-slate-300 dark:bg-slate-600" : "bg-amber-300 dark:bg-amber-700")} />
      </div>

      {illustrationDataUrl ? (
        <div className={cn(
          "rounded-xl overflow-hidden shadow-md border",
          isBlue ? "border-slate-200/50 dark:border-slate-700/30" : "border-amber-200/50 dark:border-amber-800/30"
        )}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={illustrationDataUrl}
            alt={`Illustration for ${title}`}
            className="w-full h-auto"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-6">
          {illustrating ? (
            <>
              <Loader2 className={cn("w-6 h-6 animate-spin", isBlue ? "text-blue-400" : "text-violet-400")} />
              <p className={cn("text-xs", isBlue ? "text-slate-500 dark:text-slate-400" : "text-amber-700/60 dark:text-amber-400/50")}>
                Generating {isBlue ? "visualization" : "illustration"}...
              </p>
            </>
          ) : (
            <>
              {illustrateError && (
                <p className="text-xs text-red-400 mb-1">{illustrateError}</p>
              )}
              <button
                onClick={onIllustrate}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium",
                  "text-white shadow-md transition-all duration-200",
                  "active:scale-[0.98]",
                  isBlue
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg"
                    : "bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 hover:shadow-lg"
                )}
              >
                <ImageIcon className="w-4 h-4" />
                Retry {isBlue ? "Visualization" : "Illustration"}
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
