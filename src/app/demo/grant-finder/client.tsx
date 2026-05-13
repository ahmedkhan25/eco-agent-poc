"use client";

import { useState } from "react";
import {
  Send,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  Bookmark,
  ChevronDown,
  ChevronUp,
  DollarSign,
} from "lucide-react";
import { GRANT_CATALOG, type GrantProgram } from "@/lib/demo/hollywood-data";

const SAMPLE_PROJECTS = [
  "Septic-to-sewer expansion in Boulevard Heights, ~1,100 properties, $71M, 18-month timeline",
  "FDOT pump-station resilience upgrade at A1A & Sherman St, $6.5M, 12-month timeline",
  "Hollywood Beach dune restoration & living shoreline, 1.8 miles, $4.2M",
  "Hollywood Hills generator hardening for 4 ALFs (Hollywood Hills lesson), $1.8M",
];

interface EligibilityItem { item: string; status: "green" | "amber" | "red"; note: string }
interface ScoringEvidence { criterion: string; evidence: string }
interface GrantMatch {
  grantId: string;
  score: number;
  summary: string;
  eligibilityCheck: EligibilityItem[];
  scoringEvidence: ScoringEvidence[];
  draftNarrative: string;
  estimatedRequest: string;
  nextStep: string;
  program?: GrantProgram;
}

export function GrantFinderClient() {
  const [project, setProject] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<GrantMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showDraft, setShowDraft] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<
    Array<{ id: string; project: string; grant: string; amount: string }>
  >([]);

  const submit = async (q?: string) => {
    const value = (q ?? project).trim();
    if (!value) return;
    setProject(value);
    setLoading(true);
    setError(null);
    setMatches(null);
    setExpanded(null);
    setShowDraft(null);
    try {
      const res = await fetch("/api/demo/grant-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: value }),
      });
      const j = await res.json();
      if (!res.ok || j.error) throw new Error(j.error || `HTTP ${res.status}`);
      setMatches(j.matches);
      if (j.matches?.[0]) setExpanded(j.matches[0].grantId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const addToPipeline = (m: GrantMatch) => {
    const program = m.program;
    if (!program) return;
    setPipeline((prev) => [
      ...prev,
      {
        id: `${m.grantId}-${Date.now()}`,
        project: project.slice(0, 80),
        grant: program.name,
        amount: m.estimatedRequest,
      },
    ]);
  };

  return (
    <div className="px-6 py-6 grid grid-cols-12 gap-4 max-w-7xl mx-auto">
      <div className="col-span-12 lg:col-span-8">
        {/* Header */}
        <div className="mb-4">
          <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)] mb-1">
            RAG · Agent
          </div>
          <h1 className="demo-display text-3xl font-semibold leading-tight">
            Grant Finder Agent
          </h1>
          <p className="text-sm text-[var(--hw-slate-700)] mt-1.5 max-w-2xl leading-relaxed">
            Describe a project. The agent matches against BRIC, Resilient Florida, CWSRF, CDBG-DR, and HMGP — auto-checks eligibility against Hollywood's existing plans, and drafts the narrative.
          </p>
        </div>

        {/* Prompt */}
        <div className="demo-card p-4 mb-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <textarea
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="Describe the project you want to fund. Include scope, properties served, dollar amount, and timeline."
              rows={3}
              className="w-full px-3 py-2.5 rounded-md border border-[var(--hw-slate-200)] focus:border-[var(--hw-teal)] focus:outline-none focus:ring-2 focus:ring-[var(--hw-teal-50)] text-sm resize-none"
            />
            <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_PROJECTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submit(s)}
                    className="demo-chip hover:bg-[var(--hw-teal-50)] hover:text-[var(--hw-teal)] transition"
                  >
                    {s.length > 50 ? s.slice(0, 47) + "…" : s}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={loading || !project.trim()}
                className="demo-btn-primary text-sm inline-flex items-center gap-2 shrink-0"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Find matching grants
              </button>
            </div>
          </form>
        </div>

        {/* Loading */}
        {loading && (
          <div className="demo-card p-8 flex items-center justify-center flex-col gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--hw-teal)]" />
            <div className="text-sm text-[var(--hw-slate-700)]">
              Matching against {GRANT_CATALOG.length} federal & state programs · auto-checking eligibility against Hollywood plans…
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="demo-card p-4 border-l-4 border-[var(--hw-rose)]">
            <div className="text-sm font-medium text-[var(--hw-rose)]">Couldn't run match</div>
            <div className="text-xs text-[var(--hw-slate-700)] mt-1">{error}</div>
          </div>
        )}

        {/* Matches */}
        {matches && (
          <div className="space-y-3">
            <div className="text-xs text-[var(--hw-slate-500)]">
              {matches.length} ranked match{matches.length === 1 ? "" : "es"} — eligibility checks grounded in Hollywood's adopted plans
            </div>
            {matches.map((m, idx) => {
              const isOpen = expanded === m.grantId;
              const isDraft = showDraft === m.grantId;
              if (!m.program) return null;
              return (
                <div key={m.grantId} className="demo-card overflow-hidden">
                  <button
                    onClick={() => setExpanded(isOpen ? null : m.grantId)}
                    className="w-full p-4 flex items-start gap-4 text-left hover:bg-[var(--hw-slate-50)] transition"
                  >
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div
                        className="h-12 w-12 rounded-lg flex items-center justify-center demo-display font-bold text-lg"
                        style={{
                          backgroundColor:
                            m.score >= 85
                              ? "var(--hw-teal)"
                              : m.score >= 70
                                ? "var(--hw-coral)"
                                : "var(--hw-slate-200)",
                          color: m.score >= 70 ? "white" : "var(--hw-slate-700)",
                        }}
                      >
                        {m.score}
                      </div>
                      <span className="text-[10px] text-[var(--hw-slate-500)]">#{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="demo-display font-semibold text-base leading-tight">
                        {m.program.name}
                      </div>
                      <div className="text-xs text-[var(--hw-slate-500)] mt-0.5">
                        {m.program.agency}
                      </div>
                      <p className="text-sm text-[var(--hw-slate-700)] mt-2 leading-snug">
                        {m.summary}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="demo-chip">{m.program.maxAward}</span>
                        <span className="demo-chip">{m.program.matchRequirement}</span>
                        <span className="demo-chip demo-chip-teal">{m.estimatedRequest}</span>
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-[var(--hw-slate-500)] mt-1" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[var(--hw-slate-500)] mt-1" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="border-t border-[var(--hw-slate-200)] p-4 space-y-4 bg-[var(--hw-slate-50)]">
                      {/* Eligibility */}
                      <div>
                        <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-2">
                          Eligibility check ({m.eligibilityCheck.filter((e) => e.status === "green").length} of {m.eligibilityCheck.length} green)
                        </div>
                        <div className="space-y-1.5">
                          {m.eligibilityCheck.map((e, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 bg-white border border-[var(--hw-slate-200)] rounded-md p-2 text-xs"
                            >
                              {e.status === "green" && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              )}
                              {e.status === "amber" && (
                                <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                              )}
                              {e.status === "red" && (
                                <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium">{e.item}</div>
                                <div className="text-[var(--hw-slate-500)] mt-0.5">{e.note}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Scoring evidence */}
                      <div>
                        <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-2">
                          Scoring evidence (from Hollywood RAG corpus)
                        </div>
                        <div className="space-y-1.5">
                          {m.scoringEvidence.map((s, i) => (
                            <div key={i} className="bg-white border border-[var(--hw-slate-200)] rounded-md p-2 text-xs">
                              <div className="font-medium text-[var(--hw-slate-900)]">{s.criterion}</div>
                              <div className="text-[var(--hw-slate-700)] mt-1">{s.evidence}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 items-center">
                        <button className="demo-btn-primary text-sm" onClick={() => setShowDraft(isDraft ? null : m.grantId)}>
                          {isDraft ? "Hide" : "Generate full application draft"}
                        </button>
                        <button
                          className="demo-btn-accent text-sm inline-flex items-center gap-1.5"
                          onClick={() => addToPipeline(m)}
                        >
                          <Bookmark className="h-3.5 w-3.5" />
                          Add to pipeline
                        </button>
                        <span className="text-xs text-[var(--hw-slate-500)] ml-auto">
                          Next step: {m.nextStep}
                        </span>
                      </div>

                      {isDraft && m.draftNarrative && (
                        <div className="bg-white border border-[var(--hw-slate-200)] rounded-md p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-3.5 w-3.5 text-[var(--hw-teal)]" />
                            <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)]">
                              Draft narrative · {m.program.name}
                            </span>
                          </div>
                          <div className="text-sm leading-relaxed text-[var(--hw-slate-900)] whitespace-pre-wrap">
                            {m.draftNarrative}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!matches && !loading && !error && (
          <div className="demo-card p-8 text-center">
            <div className="text-sm text-[var(--hw-slate-500)] mb-2">
              Pick a sample project above or describe one to see the agent run.
            </div>
            <div className="text-xs text-[var(--hw-slate-500)]">
              Indexed catalog: Resilient Florida · FEMA BRIC · EPA CWSRF · HUD CDBG-DR · FEMA HMGP
            </div>
          </div>
        )}
      </div>

      {/* Right rail: pipeline */}
      <div className="col-span-12 lg:col-span-4">
        <div className="demo-card p-4 sticky top-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)]">
              Your grant pipeline
            </div>
            <span className="demo-chip">{pipeline.length}</span>
          </div>
          {pipeline.length === 0 ? (
            <div className="text-xs text-[var(--hw-slate-500)] py-6 text-center">
              Add matches to track total $ requested and % match secured.
            </div>
          ) : (
            <div className="space-y-2">
              {pipeline.map((p) => (
                <div key={p.id} className="border border-[var(--hw-slate-200)] rounded-md p-2.5 text-xs">
                  <div className="font-medium">{p.grant}</div>
                  <div className="text-[var(--hw-slate-500)] truncate mt-0.5">{p.project}</div>
                  <div className="mt-1.5 inline-flex items-center gap-1 demo-chip demo-chip-coral">
                    <DollarSign className="h-2.5 w-2.5" />
                    {p.amount}
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-[var(--hw-slate-200)] text-xs flex items-center justify-between">
                <span className="text-[var(--hw-slate-500)]">Total drafted</span>
                <span className="demo-display font-semibold">{pipeline.length} requests</span>
              </div>
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-[var(--hw-slate-200)] text-[11px] text-[var(--hw-slate-500)] leading-snug">
            <div className="flex items-center gap-1.5 mb-1 text-[var(--hw-slate-700)] font-medium">
              <Sparkles className="h-3 w-3" />
              Why this matters
            </div>
            Every Compact city spends staff hours on the same grant-narrative work. Single highest-ROI feature for a budget-constrained city.
          </div>
        </div>
      </div>
    </div>
  );
}
