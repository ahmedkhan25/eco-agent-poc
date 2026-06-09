"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Telescope,
  BarChart3,
  Boxes,
  ClipboardList,
  ShieldCheck,
  Gauge,
  Database,
  Sparkles,
  UsersRound,
  ImageOff,
  ChevronDown,
} from "lucide-react";
import type { AboutSection, MethodologyStep } from "@/lib/demo/about-content";

const STEP_ICON: Record<MethodologyStep, typeof Telescope> = {
  Scan: Telescope,
  Analyze: BarChart3,
  Model: Boxes,
  Formulate: ClipboardList,
  Respond: ShieldCheck,
  Assess: Gauge,
};

const ALL_STEPS: MethodologyStep[] = [
  "Scan",
  "Analyze",
  "Model",
  "Formulate",
  "Respond",
  "Assess",
];

export function AboutModal({
  section,
  open,
  onOpenChange,
}: {
  section: AboutSection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const activeSteps = new Set(section.methodologySteps);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="demo-root z-[1200] w-[96vw] max-w-[1320px] sm:max-w-[1320px] max-h-[94vh] overflow-y-auto demo-scroll p-0 gap-0 bg-white"
        showCloseButton
      >
        {/* Header — pillar, big title, prominent one-liner */}
        <div className="px-7 pt-7 pb-5 border-b border-[var(--hw-slate-200)]">
          <div className="text-[11px] uppercase tracking-wider text-[var(--hw-teal-600)] font-semibold mb-2">
            {section.pillar}
          </div>
          <DialogTitle asChild>
            <h2 className="demo-display text-3xl sm:text-4xl font-semibold leading-[1.1] text-[var(--hw-slate-900)] pr-8">
              {section.title}
            </h2>
          </DialogTitle>
          <p className="text-lg sm:text-xl text-[var(--hw-slate-700)] mt-2.5 leading-snug max-w-5xl font-medium">
            {section.oneLiner}
          </p>
        </div>

        <div className="px-7 py-6 space-y-7">
          {/* Hero explainer diagram — full width, large (images carry a lot of content) */}
          <div className="rounded-xl overflow-hidden border border-[var(--hw-slate-200)] bg-[#0a1628] shadow-sm">
            {!imgError ? (
              <Image
                src={section.imageSrc}
                alt={`${section.title} — explainer diagram`}
                width={1600}
                height={900}
                className="w-full h-auto"
                onError={() => setImgError(true)}
                priority
                unoptimized
              />
            ) : (
              <div className="aspect-video w-full flex flex-col items-center justify-center text-center gap-3 px-6">
                <ImageOff className="h-8 w-8 text-[var(--hw-teal)]/70" />
                <div className="text-white/80 text-sm font-medium">
                  Explainer diagram coming
                </div>
                <div className="text-white/40 text-xs max-w-md leading-relaxed">
                  Generate the image from the prompt below and drop it at{" "}
                  <code className="text-[var(--hw-teal)]">
                    public{section.imageSrc}
                  </code>
                </div>
              </div>
            )}
          </div>

          {/* Main paragraph — clear and big */}
          <div className="max-w-5xl">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-[var(--hw-teal-600)] mb-2">
              What it is, in plain English
            </h3>
            <p className="text-base sm:text-lg text-[var(--hw-slate-900)] leading-relaxed">
              {section.whatItIs}
            </p>
          </div>

          {/* Community value + How EcoHeart — side by side */}
          <div className="grid gap-7 lg:grid-cols-2 lg:gap-10 pt-1">
            <Block title="What it does for the community">
              <ul className="space-y-2.5">
                {section.communityValue.map((v, i) => (
                  <li
                    key={i}
                    className="flex gap-2.5 text-[15px] text-[var(--hw-slate-700)] leading-relaxed"
                  >
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--hw-teal)] shrink-0" />
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </Block>

            <Block title="How EcoHeart sets this up for any city">
              <p className="text-[15px] text-[var(--hw-slate-700)] leading-relaxed mb-3">
                {section.howEcoheart}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {ALL_STEPS.map((step) => {
                  const Icon = STEP_ICON[step];
                  const on = activeSteps.has(step);
                  return (
                    <span
                      key={step}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                        on
                          ? "bg-[var(--hw-teal-50)] text-[var(--hw-teal-600)] border-[var(--hw-teal)]/30"
                          : "bg-transparent text-[var(--hw-slate-500)]/50 border-[var(--hw-slate-200)]"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {step}
                    </span>
                  );
                })}
                <span className="text-[10px] text-[var(--hw-slate-500)] ml-1">
                  EcoHeart Methodology
                </span>
              </div>
            </Block>
          </div>

          {/* Fruition — the advantage stack, full width */}
          <div className="rounded-xl bg-[#0f172a] text-white p-5">
            <div className="flex items-center gap-2 mb-2.5">
              <Database className="h-4 w-4 text-[var(--hw-teal)]" />
              <Sparkles className="h-4 w-4 text-[var(--hw-teal)]" />
              <UsersRound className="h-4 w-4 text-[var(--hw-teal)]" />
              <span className="text-[11px] uppercase tracking-wider font-semibold text-white/60">
                How our platform brings it to fruition
              </span>
            </div>
            <p className="text-[15px] sm:text-base text-white/90 leading-relaxed max-w-5xl">
              {section.fruition}
            </p>
            <div className="mt-3.5 flex flex-wrap gap-1.5 text-[11px] text-white/50">
              <span className="rounded-full border border-white/15 px-2.5 py-0.5">
                Integrated Data
              </span>
              <span className="text-white/30">+</span>
              <span className="rounded-full border border-white/15 px-2.5 py-0.5">
                AI Intelligence
              </span>
              <span className="text-white/30">+</span>
              <span className="rounded-full border border-white/15 px-2.5 py-0.5">
                Applied Domain Experts
              </span>
            </div>
          </div>

          {/* Image-generation prompt — de-emphasized, at the bottom */}
          <div className="rounded-md border border-[var(--hw-slate-200)] bg-[var(--hw-slate-50)]">
            <button
              type="button"
              onClick={() => setShowPrompt((v) => !v)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-left"
            >
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)]">
                Image-generation prompt
              </span>
              <ChevronDown
                className={`h-4 w-4 text-[var(--hw-slate-500)] transition-transform ${
                  showPrompt ? "rotate-180" : ""
                }`}
              />
            </button>
            {showPrompt && (
              <p className="px-3.5 pb-3.5 text-xs leading-relaxed text-[var(--hw-slate-700)] whitespace-pre-line">
                {section.imagePrompt}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}
