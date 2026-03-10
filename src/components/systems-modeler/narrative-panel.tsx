"use client";

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { BookOpen, Loader2, User, ImageIcon, Users, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NarrativeResult } from "@/lib/systems-modeler/types";

interface NarrativePanelProps {
  narrative: NarrativeResult | null;
  onGenerate: () => void;
  isLoading: boolean;
  illustrationDataUrl?: string | null;
  onIllustrationGenerated?: (dataUrl: string) => void;
  characterImages?: Record<string, string>;
}

export function NarrativePanel({
  narrative,
  onGenerate,
  isLoading,
  illustrationDataUrl,
  onIllustrationGenerated,
  characterImages = {},
}: NarrativePanelProps) {
  const [illustrating, setIllustrating] = useState(false);
  const [illustrateError, setIllustrateError] = useState<string | null>(null);

  const handleIllustrate = useCallback(async () => {
    if (!narrative) return;
    setIllustrating(true);
    setIllustrateError(null);

    try {
      const prompt = `Create a dramatic, mythic illustration in a storybook watercolor style for this systems narrative titled "${narrative.title}". The scene should depict the key characters and their relationships in a symbolic, archetypal way. Include environmental elements like storms, rivers, buildings, and nature. Style: rich colors, atmospheric lighting, epic scale. Do NOT include any text or words in the image.`;

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
  }, [narrative, onIllustrationGenerated]);
  // No narrative yet - show generate prompt
  if (!narrative && !isLoading) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center py-20 px-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="p-4 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 mb-4">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
          The Model Story
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md mb-6">
          Transform your system model into a heartfelt emotional narrative.
          Characters will represent system variables, and plot points will
          reflect the causal dynamics of your diagram.
        </p>
        <button
          onClick={onGenerate}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold",
            "text-white shadow-md",
            "bg-gradient-to-r from-amber-500 to-orange-600",
            "hover:from-amber-600 hover:to-orange-700 hover:shadow-lg",
            "active:scale-[0.98]",
            "transition-all duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          )}
        >
          <BookOpen className="w-4 h-4" />
          Generate Story
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
        <Loader2 className="w-8 h-8 text-amber-500 dark:text-amber-400 animate-spin mb-4" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Weaving your system into a story...
        </p>
      </motion.div>
    );
  }

  // Render narrative
  if (!narrative) return null;

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
        <motion.div
          className="mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="h-px w-8 bg-amber-300 dark:bg-amber-700" />
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-500">
              Illustration
            </span>
            <div className="h-px w-8 bg-amber-300 dark:bg-amber-700" />
          </div>

          {illustrationDataUrl ? (
            <div className="rounded-xl overflow-hidden border border-amber-200/50 dark:border-amber-800/30 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={illustrationDataUrl}
                alt={`Illustration for ${narrative.title}`}
                className="w-full h-auto"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6">
              {illustrating ? (
                <>
                  <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                  <p className="text-xs text-amber-700/60 dark:text-amber-400/50">
                    Generating illustration with Nano Banana...
                  </p>
                </>
              ) : (
                <>
                  {illustrateError && (
                    <p className="text-xs text-red-400 mb-1">{illustrateError}</p>
                  )}
                  <button
                    onClick={handleIllustrate}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium",
                      "text-white shadow-md transition-all duration-200",
                      "bg-gradient-to-r from-violet-500 to-indigo-600",
                      "hover:from-violet-600 hover:to-indigo-700 hover:shadow-lg",
                      "active:scale-[0.98]"
                    )}
                  >
                    <ImageIcon className="w-4 h-4" />
                    Retry Illustration
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>

        {/* Character cards */}
        {narrative.characters && narrative.characters.length > 0 && (
          <motion.div
            className="mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {/* Section divider */}
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
