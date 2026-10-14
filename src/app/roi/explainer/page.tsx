"use client";

import Link from "next/link";
import { EcoheartLogo } from "@/components/ecoheart-logo";
import { EXPLAINER_VIDEO } from "@/lib/roi/about";
import { ink } from "@/components/roi/ui";

export default function RoiExplainer() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <h1 className={`font-serif text-3xl italic ${ink}`}>How the ROI Advisor works</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        A short internal walkthrough: the approach, how to use the calculator, and how the agent works out ROI.
      </p>
      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {EXPLAINER_VIDEO.ready ? (
          <video src={EXPLAINER_VIDEO.src} poster={EXPLAINER_VIDEO.poster} controls playsInline className="block aspect-video w-full bg-black" />
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-[#F7F6F2] p-8 text-center">
            <EcoheartLogo className="h-12 w-12" />
            <div className={`font-serif text-2xl italic ${ink}`}>Explainer video coming soon</div>
            <p className="max-w-md text-sm text-slate-600">
              Until then, the{" "}
              <Link href="/roi/proposal" className="text-teal-700 underline">
                proposal
              </Link>{" "}
              covers the approach, or ask the Advisor to walk you through a scenario.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
