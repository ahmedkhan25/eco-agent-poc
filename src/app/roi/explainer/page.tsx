"use client";

import { useRef } from "react";
import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { EXPLAINER_VIDEO } from "@/lib/roi/about";
import { ink } from "@/components/roi/ui";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function RoiExplainer() {
  const video = useRef<HTMLVideoElement>(null);
  const jump = (at: number) => {
    const v = video.current;
    if (!v) return;
    v.currentTime = at;
    v.play().catch(() => {});
    v.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <h1 className={`font-serif text-3xl italic ${ink}`}>How the ROI Advisor works</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        A {EXPLAINER_VIDEO.length} walkthrough of every feature, made for anyone on the team: leaders, financial modelers,
        accountants and developers. It also shows how to model a new city, a new assumption or a new kind of saving.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_240px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm">
          <video
            ref={video}
            src={EXPLAINER_VIDEO.src}
            poster={EXPLAINER_VIDEO.poster}
            controls
            playsInline
            preload="metadata"
            className="block aspect-video w-full"
          />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Chapters</div>
          <ol className="mt-2 space-y-1">
            {EXPLAINER_VIDEO.chapters.map((c) => (
              <li key={c.at}>
                <button
                  onClick={() => jump(c.at)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-800"
                >
                  <PlayCircle className="h-4 w-4 flex-none text-teal-600" />
                  <span className="flex-1">{c.title}</span>
                  <span className="tabular-nums text-xs text-slate-400">{fmt(c.at)}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { t: "A new city or what-if", d: "Just ask the Advisor. Give it the city's premium, claims and deductibles.", href: "/roi", l: "Open the Workspace" },
          { t: "A shared assumption", d: "Edit it on the Model tab, or ask the Advisor. Hover any teal value to see the original.", href: "/roi/model", l: "Open the Model" },
          { t: "A new kind of saving", d: "A small code change. Section 6 of ROI_ADVISOR_RUNBOOK.md in the repo walks through it.", href: "/roi/explainer", l: "" },
        ].map((x) => (
          <div key={x.t} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`font-semibold ${ink}`}>{x.t}</div>
            <p className="mt-1 text-sm text-slate-600">{x.d}</p>
            {x.l && (
              <Link href={x.href} className="mt-2 inline-block text-sm text-teal-700 underline">
                {x.l}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
