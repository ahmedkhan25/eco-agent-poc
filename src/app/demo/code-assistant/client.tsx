"use client";

import { useState } from "react";
import {
  Send,
  BookOpen,
  Sparkles,
  ExternalLink,
  GitCompareArrows,
  Hammer,
} from "lucide-react";
import { ConceptHeader } from "@/components/demo/concept-header";
import { QUICK_QUESTIONS, SEEDED_ANSWERS, type CodeAnswer } from "@/lib/demo/concept-data";

const COMPARE_HOLLYWOOD = {
  city: "Hollywood, FL",
  rule: "Recommended 6.5 ft NAVD88 by 2060 (CVA Recommendation 7). No adopted citywide minimum today.",
  citation: "Hollywood Climate Change Vulnerability Assessment, p. 87",
};
const COMPARE_FORT_LAUDERDALE = {
  city: "Fort Lauderdale, FL",
  rule: "5.0 ft NAVD88 minimum today, rising to 6.0 ft by 2035 (adopted March 2023).",
  citation: "Fort Lauderdale ULDR § 47-19.3",
};

const ACTIVE_BOOKS = [
  { code: "Florida Building Code", version: "8th Edition (2023)", chapters: 35 },
  { code: "ASCE 24-14", version: "2014", chapters: 9 },
  { code: "Hollywood Zoning Code", version: "§155 (current)", chapters: 12 },
  { code: "Hollywood Code of Ordinances", version: "Chapter 117 (Flood)", chapters: 7 },
  { code: "Broward Land Use Plan", version: "2025 Amendment", chapters: 14 },
  { code: "Florida Statutes", version: "§380.093, §163.3178", chapters: 2 },
];

type Mode = "ask" | "compare";

export function CodeAssistantClient() {
  const [mode, setMode] = useState<Mode>("ask");
  const [input, setInput] = useState("");
  const [thread, setThread] = useState<Array<{ q: string; a: CodeAnswer }>>([]);

  const ask = (q: string) => {
    const key = q.toLowerCase().includes("freeboard")
      ? "freeboard"
      : q.toLowerCase().includes("garage")
        ? "garage"
        : q.toLowerCase().includes("seawall")
          ? "seawall"
          : null;
    if (key && SEEDED_ANSWERS[key]) {
      setThread((t) => [...t, { q, a: { ...SEEDED_ANSWERS[key], question: q } }]);
    } else {
      // Generic seeded fallback
      setThread((t) => [
        ...t,
        {
          q,
          a: {
            question: q,
            body: `In production, EcoHeart's Code Assistant retrieves the relevant chapters from your active code books and answers with paragraph-level citations. For this concept page, three example answers are wired (freeboard, garage doors, seawalls). Ask one of the chips below to see citation-grounded responses.`,
            citations: [{ doc: "EcoHeart RAG corpus (concept)", section: "—", page: "—", quote: "Live deployment ingests FBC, ASCE, Hollywood ordinances; every paragraph carries a page-level citation." }],
          },
        },
      ]);
    }
    setInput("");
  };

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <ConceptHeader
        tag="RAG · Concept"
        title="Building Resilience Code Assistant"
        subtitle="A code-aware chat that answers Florida Building Code (HVHZ), ASCE 24, and Hollywood-specific zoning questions with cited paragraphs — the way a permit reviewer or contractor would actually use it."
        right={
          <div className="flex gap-1">
            <button
              onClick={() => setMode("ask")}
              className={`text-sm px-3 py-2 rounded-md inline-flex items-center gap-1.5 ${
                mode === "ask" ? "bg-[var(--hw-teal)] text-white" : "demo-btn-ghost"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ask
            </button>
            <button
              onClick={() => setMode("compare")}
              className={`text-sm px-3 py-2 rounded-md inline-flex items-center gap-1.5 ${
                mode === "compare" ? "bg-[var(--hw-teal)] text-white" : "demo-btn-ghost"
              }`}
            >
              <GitCompareArrows className="h-3.5 w-3.5" />
              Compare cities
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-4">
        {/* Chat / compare main area */}
        <div className="col-span-12 lg:col-span-8 space-y-3">
          {mode === "ask" && (
            <>
              {thread.length === 0 ? (
                <div className="demo-card p-6 text-center">
                  <Hammer className="h-8 w-8 mx-auto text-[var(--hw-teal)] mb-2" />
                  <div className="demo-display text-lg font-semibold mb-1">
                    Ask a code question
                  </div>
                  <p className="text-sm text-[var(--hw-slate-700)] max-w-md mx-auto leading-relaxed">
                    Pick a quick-question chip below, or type a free-form question. Every answer cites a specific paragraph in the active code books.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {thread.map((m, i) => (
                    <div key={i} className="space-y-2">
                      <div className="demo-card p-3 bg-[var(--hw-teal)] text-white max-w-2xl ml-auto">
                        <div className="text-[10px] uppercase tracking-wider opacity-80 mb-0.5">You</div>
                        <div className="text-sm">{m.q}</div>
                      </div>
                      <div className="demo-card p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="demo-chip demo-chip-teal inline-flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5" />
                            EcoHeart AI
                          </span>
                          <span className="demo-chip">
                            {m.a.citations.length} citation{m.a.citations.length > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="text-sm text-[var(--hw-slate-900)] leading-relaxed whitespace-pre-wrap">
                          {m.a.body}
                        </div>
                        <div className="mt-3 pt-3 border-t border-[var(--hw-slate-200)] space-y-2">
                          {m.a.citations.map((c, j) => (
                            <div key={j} className="text-xs border border-[var(--hw-slate-200)] rounded-md p-2">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="font-semibold">{c.doc}</span>
                                <span className="text-[10px] text-[var(--hw-slate-500)] demo-mono shrink-0">
                                  {c.section}
                                  {c.page !== "—" && c.page ? ` · p. ${c.page}` : ""}
                                </span>
                              </div>
                              <div className="italic text-[var(--hw-slate-700)] mt-1">"{c.quote}"</div>
                              <button className="text-[11px] text-[var(--hw-teal)] mt-1 inline-flex items-center gap-1 hover:underline">
                                <ExternalLink className="h-2.5 w-2.5" />
                                Open PDF
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="demo-card p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (input.trim()) ask(input.trim());
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a code question…"
                    className="flex-1 px-3 py-2 rounded-md border border-[var(--hw-slate-200)] focus:border-[var(--hw-teal)] focus:outline-none text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="demo-btn-primary text-sm inline-flex items-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Ask
                  </button>
                </form>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-[var(--hw-slate-500)] py-0.5 mr-1">Quick:</span>
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => ask(q)}
                      className="demo-chip hover:bg-[var(--hw-teal-50)] hover:text-[var(--hw-teal)] transition cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {mode === "compare" && (
            <div className="space-y-3">
              <div className="demo-card p-5">
                <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold mb-1">
                  Side-by-side · Minimum seawall top elevation
                </div>
                <h3 className="demo-display text-lg font-semibold mb-3">
                  Hollywood vs Fort Lauderdale
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <CityCard {...COMPARE_HOLLYWOOD} accent="var(--hw-teal)" />
                  <CityCard {...COMPARE_FORT_LAUDERDALE} accent="var(--hw-coral)" />
                </div>
              </div>

              <div className="demo-card p-5">
                <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold mb-1">
                  Compact-region adoption status
                </div>
                <h3 className="demo-display text-base font-semibold mb-3">
                  Seawall top-elevation ordinances across the 4 Compact counties
                </h3>
                <div className="border border-[var(--hw-slate-200)] rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--hw-slate-50)] text-xs">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Jurisdiction</th>
                        <th className="text-left px-3 py-2 font-medium">Status</th>
                        <th className="text-left px-3 py-2 font-medium">Minimum</th>
                        <th className="text-left px-3 py-2 font-medium">Cite</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Hollywood", "Recommended (not adopted)", "6.5 ft NAVD88 by 2060", "CVA p. 87"],
                        ["Fort Lauderdale", "Adopted 2023", "5.0 ft → 6.0 ft by 2035", "ULDR § 47-19.3"],
                        ["Miami Beach", "Adopted 2016", "5.7 ft (rising w/ NAVD)", "Code § 54-44"],
                        ["Miami-Dade County", "Adopted 2021", "5.0 ft NAVD88", "Code § 12-21"],
                        ["Hallandale Beach", "Draft 2025", "5.5 ft (proposed)", "Ord. 2025-xx"],
                      ].map((row, i) => (
                        <tr key={i} className="border-t border-[var(--hw-slate-200)]">
                          {row.map((v, j) => (
                            <td key={j} className="px-3 py-2 text-xs">{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right rail */}
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <div className="demo-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-3.5 w-3.5 text-[var(--hw-teal)]" />
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)]">
                Active code books
              </span>
            </div>
            <div className="space-y-1.5">
              {ACTIVE_BOOKS.map((b) => (
                <div key={b.code} className="text-xs border border-[var(--hw-slate-200)] rounded-md p-2">
                  <div className="font-semibold text-[var(--hw-slate-900)]">{b.code}</div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[var(--hw-slate-500)]">{b.version}</span>
                    <span className="demo-chip">{b.chapters} ch</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="demo-card p-4">
            <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold mb-2">
              Why a code assistant
            </div>
            <ul className="text-xs space-y-1.5 text-[var(--hw-slate-700)] list-disc pl-4 leading-relaxed">
              <li>HVHZ is one of the most complex code regimes in the US.</li>
              <li>Permit reviewers field the same 12 questions every week.</li>
              <li>Contractors miss freeboard requirements in 11% of new SFR permits (FBC compliance study, 2024).</li>
              <li>Every answer is auditable — paragraph-level cites, no hallucination.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function CityCard({ city, rule, citation, accent }: { city: string; rule: string; citation: string; accent: string }) {
  return (
    <div className="border border-[var(--hw-slate-200)] rounded-md p-3">
      <div className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: accent }}>
        {city}
      </div>
      <div className="text-sm text-[var(--hw-slate-900)] leading-relaxed">{rule}</div>
      <div className="mt-2 text-[11px] text-[var(--hw-slate-500)] italic">Source: {citation}</div>
    </div>
  );
}
