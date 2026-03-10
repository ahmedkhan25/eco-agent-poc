"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Network,
  Cpu,
  Brain,
  Zap,
  BookOpen,
  UserCircle,
} from "lucide-react";
import Image from "next/image";
import { EcoheartLogo } from "@/components/ecoheart-logo";
import { NapkinViewer } from "./napkin-viewer";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Slide {
  id: number;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
  imagePath?: string;
  imageAlt?: string;
  accentColor: string;
}

const slides: Slide[] = [
  {
    id: 1,
    icon: <Network className="w-6 h-6" />,
    title: "Welcome to the Universal Interactive System Modeler",
    accentColor: "from-teal-500 to-emerald-600",
    imagePath: "/eco/systems-modeler/slide-1.png",
    imageAlt: "System Modeler Overview",
    content: (
      <div className="space-y-4">
        <div className="p-3 bg-teal-50/80 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
          <p className="text-sm font-medium text-teal-800 dark:text-teal-200 mb-1">
            What it is
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            A dynamic, AI-powered tool designed to help you investigate
            relationships and their implications across any topic.
          </p>
        </div>
        <div className="p-3 bg-emerald-50/80 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-1">
            The Goal
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            To move beyond static lists and &ldquo;incomprehensible spaghetti
            diagrams,&rdquo; creating interactive models that simplify reality
            and promote deep understanding.
          </p>
        </div>
        <div className="p-3 bg-green-50/80 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
            The Output
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Instantly generated, collaborative causal loop diagrams built from
            your data, documents, or conversational prompts.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    icon: <Cpu className="w-6 h-6" />,
    title: "Powered by AG-UI & CopilotKit",
    accentColor: "from-indigo-500 to-violet-600",
    imagePath: "/eco/systems-modeler/slide-2.png",
    imageAlt: "AG-UI & CopilotKit Architecture",
    content: (
      <div className="space-y-4">
        <div className="p-3 bg-indigo-50/80 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
          <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200 mb-1">
            The Connective Tissue
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            This tool operates on AG-UI (Agent&ndash;User Interaction), an open
            protocol that creates a bi-directional connection between the user
            interface and the agentic backend.
          </p>
        </div>
        <div className="p-3 bg-violet-50/80 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
          <p className="text-sm font-medium text-violet-800 dark:text-violet-200 mb-1">
            Agentic GenUI & Shared State
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Instead of just chatting with text, the AI uses Tool-Based GenUI to
            instantly render system models on the screen while maintaining a
            shared state.
          </p>
        </div>
        <div className="p-3 bg-purple-50/80 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <p className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-1">
            Safe & Secure
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Enterprise-grade guardrails are enforced at the boundary via Copilot
            Cloud, preventing prompt injections and blocking sensitive data
            leaks.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    icon: <Brain className="w-6 h-6" />,
    title: "The Modeling Philosophy",
    subtitle: "Gene Bellinger's Approach",
    accentColor: "from-amber-500 to-orange-600",
    imagePath: "/eco/systems-modeler/slide-3.png",
    imageAlt: "Gene Bellinger's Systems Modeling Methodology",
    content: (
      <div className="space-y-4">
        <div className="p-3 bg-amber-50/80 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
            Overcoming Blind Spots
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Historically, models are flawed by &ldquo;what I didn&apos;t know I
            didn&apos;t know.&rdquo; This tool leverages AI to fill those gaps
            and architect a new understanding of reality.
          </p>
        </div>
        <div className="p-3 bg-orange-50/80 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-1">
            Human-in-the-Loop
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            AI isn&apos;t perfect. If a generated model has incomplete or
            ill-defined loops, you can chat directly with the diagram to correct
            it. You converse with the AI the exact same way you would talk to a
            human assistant building a model with you.
          </p>
        </div>
        <div className="p-3 bg-yellow-50/80 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
            Behind the Scenes
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Every model is generated as a structured JSON payload containing the
            system&apos;s nodes, edges, loops, and archetypes, which the UI then
            translates into a readable visual graph.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    icon: <Zap className="w-6 h-6" />,
    title: 'The Breakthrough: The "Aha! Paradox"',
    accentColor: "from-red-500 to-rose-600",
    content: (
      <div className="space-y-3">
        <NapkinViewer />
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-2 mt-4">
          Gene Bellinger&apos;s six-part methodology bypasses standard logic to
          generate actionable breakthroughs:
        </p>
        <div className="p-2.5 bg-red-50/80 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-0.5">
            1. The Anchor &mdash; The Load-Bearing Delusion
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Identify the comfortable lie that holds the status quo together
            and prevents change &mdash; what you &ldquo;don&apos;t know you
            don&apos;t know.&rdquo;
          </p>
        </div>
        <div className="p-2.5 bg-orange-50/80 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <p className="text-xs font-semibold text-orange-800 dark:text-orange-200 mb-0.5">
            2. The Default &amp; 3. The Bottleneck
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Map the standard path that feeds the delusion, then impose
            constraints that forbid the system&apos;s normal language. Strip labels
            &mdash; there are no &ldquo;things,&rdquo; only processes.
          </p>
        </div>
        <div className="p-2.5 bg-rose-50/80 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800">
          <p className="text-xs font-semibold text-rose-800 dark:text-rose-200 mb-0.5">
            4. The Collision &mdash; The Isomorph
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Collide the model with a completely unrelated concept (e.g.,
            mycelial networks, tidal erosion). Use Scale-Shift or Biological
            Shift to find structural matches that reveal hidden &ldquo;bundles
            of relationships.&rdquo;
          </p>
        </div>
        <div className="p-2.5 bg-pink-50/80 dark:bg-pink-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
          <p className="text-xs font-semibold text-pink-800 dark:text-pink-200 mb-0.5">
            5. The Reversal &amp; 6. The Stop Rule
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Flip the core assumption on its head &mdash; treat the
            &ldquo;truth&rdquo; as a lie. Then commit: what must you
            painfully stop doing to align with this new reality?
          </p>
        </div>
        <div className="p-2.5 bg-purple-50/80 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <p className="text-xs font-semibold text-purple-800 dark:text-purple-200 mb-0.5">
            7. The Kinetic Result &mdash; The Aha! Insight
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            A single high-leverage insight plus one concrete &ldquo;First
            Domino&rdquo; action, grounded in First Principles, Core Wisdom,
            and the system&apos;s highest Leverage Points.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 5,
    icon: <BookOpen className="w-6 h-6" />,
    title: "The Model Story",
    accentColor: "from-emerald-500 to-teal-600",
    imagePath: "/eco/systems-modeler/slide-5.png",
    imageAlt: "The Model Story - Humanizing System Dynamics",
    content: (
      <div className="space-y-4">
        <div className="p-3 bg-emerald-50/80 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-1">
            Heartfelt Communication
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Complex system models can be cold and clinical. The Model Story tool
            translates the diagram&apos;s nodes and edges into a
            &ldquo;heartfelt emotional story.&rdquo;
          </p>
        </div>
        <div className="p-3 bg-teal-50/80 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
          <p className="text-sm font-medium text-teal-800 dark:text-teal-200 mb-1">
            Human-Centric Data
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Rather than just describing the mechanics of the model, it generates
            a narrative&mdash;like an &ldquo;overcoming the monster
            plot&rdquo;&mdash;about people actually experiencing and embracing
            the relationships depicted in your diagram.
          </p>
        </div>
        <div className="p-3 bg-cyan-50/80 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
          <p className="text-sm font-medium text-cyan-800 dark:text-cyan-200 mb-1">
            Stakeholder Perspectives
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Each story includes tailored modifications for different stakeholder
            groups, showing how the same system dynamics feel different depending
            on where you sit &mdash; enabling shared understanding across all audiences.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 6,
    icon: <UserCircle className="w-6 h-6" />,
    title: "About Gene Bellinger",
    subtitle: "The Mind Behind the Method",
    accentColor: "from-slate-600 to-slate-800",
    imageAlt: "Gene Bellinger - Systems Thinker",
    content: (
      <div className="space-y-4">
        <div className="p-4 bg-slate-50/80 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            Gene Bellinger has been a passionate Systems Thinker for almost four
            decades. He is a highly respected member of the systems thinking
            community, the author of several hundred articles and over 700 videos
            on Systems Thinking, and a member of the System Dynamics Society.
          </p>
        </div>
        <div className="p-4 bg-blue-50/80 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            In 2013, Gene co-authored{" "}
            <em>Beyond Connecting the Dots: Modeling for Meaningful Results</em>{" "}
            with Scott Fortmann-Roe, the developer of Insight Maker. He hosts
            the <strong>Systems Thinking World</strong> discussion group on
            LinkedIn (~20,000 members) and is the developer of the
            Systems-Thinking and SystemsWiki websites.
          </p>
        </div>
        <div className="p-4 bg-emerald-50/80 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            Gene has been a major contributor to <strong>Insight Maker</strong> (web-based
            modeling &amp; simulation) and <strong>Kumu</strong> (relationship
            mapping). He currently develops the{" "}
            <strong>Systems Thinking World Kumu e-Learning Environment (STW KeLE)</strong> and
            the Systems Thinking World Group on Facebook.
          </p>
        </div>
        <div className="mt-2 p-4 bg-slate-100/80 dark:bg-slate-700/40 rounded-lg border border-slate-200 dark:border-slate-600">
          <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center">
            This tool implements Gene Bellinger&apos;s AI Systems Modeling
            approach including the Aha! Paradox methodology. Built by{" "}
            <a href="https://ecoheart.ai" target="_blank" rel="noopener noreferrer" className="font-medium text-teal-600 dark:text-teal-400 hover:underline">
              ecoheart.ai
            </a>
            {" "}&mdash; Smart data for cities.
          </p>
        </div>
      </div>
    ),
  },
];

export function SystemsModelerAboutModal({ isOpen, onClose }: AboutModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const goToSlide = useCallback(
    (index: number) => {
      if (index >= 0 && index < slides.length) {
        setCurrentSlide(index);
      }
    },
    []
  );

  const goNext = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    }
  }, [currentSlide]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  }, [currentSlide]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, goNext, goPrev, onClose]);

  // Reset to first slide when opened
  useEffect(() => {
    if (isOpen) setCurrentSlide(0);
  }, [isOpen]);

  const slide = slides[currentSlide];

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
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden pointer-events-auto border border-slate-200 dark:border-slate-700 flex flex-col"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* Header with gradient accent */}
              <div
                className={`relative bg-gradient-to-r ${slide.accentColor} p-5 flex-shrink-0`}
              >
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>

                {/* Slide counter */}
                <div className="absolute top-3 left-4 text-xs font-medium text-white/70">
                  {currentSlide + 1} / {slides.length}
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <div className="p-2 bg-white/20 rounded-lg text-white">
                    {slide.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white leading-tight">
                      {slide.title}
                    </h2>
                    {slide.subtitle && (
                      <p className="text-sm text-white/80 mt-0.5">
                        {slide.subtitle}
                      </p>
                    )}
                  </div>
                </div>
                {/* EcoHeart branding */}
                <div className="absolute bottom-3 right-4 flex items-center gap-1.5 opacity-70">
                  <EcoheartLogo className="w-4 h-4" />
                  <a href="https://ecoheart.ai" target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/80 hover:text-white font-medium">
                    ecoheart.ai
                  </a>
                </div>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto">
                {/* Image area */}
                {slide.imagePath && (
                  <div className="relative w-full h-48 bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                    <Image
                      src={slide.imagePath}
                      alt={slide.imageAlt || slide.title}
                      fill
                      className="object-contain p-4"
                      onError={(e) => {
                        // Hide the image container if the image doesn't exist yet
                        (
                          e.currentTarget.parentElement as HTMLElement
                        ).style.display = "none";
                      }}
                    />
                  </div>
                )}

                {/* Text content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="p-5"
                  >
                    {slide.content}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer with navigation */}
              <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 px-5 py-3 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
                {/* Previous button */}
                <button
                  onClick={goPrev}
                  disabled={currentSlide === 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>

                {/* Dot indicators */}
                <div className="flex items-center gap-2">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        index === currentSlide
                          ? "bg-slate-700 dark:bg-white w-5"
                          : "bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500"
                      }`}
                    />
                  ))}
                </div>

                {/* Next / Get Started button */}
                {currentSlide < slides.length - 1 ? (
                  <button
                    onClick={goNext}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-emerald-600 rounded-lg hover:from-teal-600 hover:to-emerald-700 transition-all shadow-sm"
                  >
                    Get Started
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
