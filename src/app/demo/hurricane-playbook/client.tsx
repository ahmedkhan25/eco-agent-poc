"use client";

import { useState } from "react";
import {
  Wind,
  ShieldAlert,
  Loader2,
  Users,
  HeartPulse,
  Hospital,
  Droplets,
  GraduationCap,
  Download,
  AlertTriangle,
  Upload,
  FileText,
  CheckCircle2,
} from "lucide-react";

interface ChecklistItem { label: string; detail: string; priority: "critical" | "high" | "normal" }
interface Checklist {
  title: string;
  subtitle: string;
  items: ChecklistItem[];
}
interface PreStormResponse {
  header: { stormName: string; category: string; track: string; advisoryAt: string; expectedImpactWindow: string };
  summary: string;
  checklists: {
    residents: Checklist;
    alfs: Checklist;
    hospitals: Checklist;
    liftStations: Checklist;
    schools: Checklist;
  };
  citations: { doc: string; section?: string; quote: string }[];
}

interface PostStormResponse {
  summary: string;
  totalEstimatedCost: string;
  categorized: { category: string; subtotal: string; items: { asset: string; cost: string; note: string }[] }[];
  fema: { scope: string; damageDescription: string; workDescription: string; mitigationOpportunities: string };
  citations: { doc: string; quote: string }[];
}

const CHECKLIST_META = {
  residents: { icon: Users, accent: "var(--hw-teal)" },
  alfs: { icon: HeartPulse, accent: "var(--hw-rose)" },
  hospitals: { icon: Hospital, accent: "var(--hw-coral)" },
  liftStations: { icon: Droplets, accent: "var(--hw-teal)" },
  schools: { icon: GraduationCap, accent: "var(--hw-amber)" },
} as const;

const SAMPLE_CSV = `location,asset,description,estimated_cost
A1A & Sherman St,Pump Station,Wind damage to electrical cabinet; pumps offline,82000
Hollywood Beach Broadwalk,Promenade,2 miles of brick promenade displaced by surge,1450000
Hollywood Hills,Tree canopy,Approx 1100 mature trees down; cleanup + replanting,640000
Memorial Regional,Roof,Wind damage to surgical wing roof + HVAC,425000
South Lake @ Adams St,Tidal valve,Storm debris jammed valve; sustained tidal flooding,38000
Lift Station #04,Generator,Fuel contamination; generator inoperable 48 hrs,71000
Driftwood Elementary,Windows,Impact-rated glass damaged; classrooms inaccessible,180000
City Hall,HVAC,Roof-top units lost; partial flooding of comms room,260000`;

type Tab = keyof PreStormResponse["checklists"];

export function HurricaneClient() {
  const [mode, setMode] = useState<"pre" | "post">("pre");
  const [stormName, setStormName] = useState("Hurricane Iris");
  const [category, setCategory] = useState("Cat 3");
  const [track, setTrack] = useState("Projected landfall ~80 miles south of Miami, 3-day window");
  const [pre, setPre] = useState<PreStormResponse | null>(null);
  const [post, setPost] = useState<PostStormResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("residents");
  const [csv, setCsv] = useState(SAMPLE_CSV);

  const runPre = async () => {
    setLoading(true);
    setError(null);
    setPre(null);
    try {
      const res = await fetch("/api/demo/hurricane-playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "pre", stormName, category, track }),
      });
      const j = await res.json();
      if (!res.ok || j.error) throw new Error(j.error || `HTTP ${res.status}`);
      setPre(j);
      setActiveTab("alfs"); // Lead with the ALF checklist
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const runPost = async () => {
    setLoading(true);
    setError(null);
    setPost(null);
    try {
      const res = await fetch("/api/demo/hurricane-playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "post", damageCsv: csv }),
      });
      const j = await res.json();
      if (!res.ok || j.error) throw new Error(j.error || `HTTP ${res.status}`);
      setPost(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const tabKeys: Tab[] = ["residents", "alfs", "hospitals", "liftStations", "schools"];

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-wider text-[var(--hw-slate-500)] mb-1">
          RAG · Agent
        </div>
        <h1 className="demo-display text-3xl font-semibold leading-tight">
          Hurricane After-Action Playbook
        </h1>
        <p className="text-sm text-[var(--hw-slate-700)] mt-1.5 max-w-2xl leading-relaxed">
          Pre-storm: facility-specific preparedness checklists with the 2017 Hollywood Hills lesson baked in. Post-storm: agent drafts the FEMA Project Worksheet.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setMode("pre")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            mode === "pre" ? "bg-[var(--hw-teal)] text-white" : "demo-btn-ghost"
          }`}
        >
          <Wind className="inline h-3.5 w-3.5 mr-1.5" />
          Pre-storm preparedness
        </button>
        <button
          onClick={() => setMode("post")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            mode === "post" ? "bg-[var(--hw-teal)] text-white" : "demo-btn-ghost"
          }`}
        >
          <ShieldAlert className="inline h-3.5 w-3.5 mr-1.5" />
          Post-storm FEMA worksheet
        </button>
      </div>

      {/* ─── Pre-storm mode ────────────────────────────────────────────── */}
      {mode === "pre" && (
        <>
          <div className="demo-card p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-1 block">
                  Storm name
                </label>
                <input
                  value={stormName}
                  onChange={(e) => setStormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-[var(--hw-slate-200)] focus:border-[var(--hw-teal)] focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-1 block">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-[var(--hw-slate-200)] focus:border-[var(--hw-teal)] focus:outline-none text-sm bg-white"
                >
                  <option>Tropical Storm</option>
                  <option>Cat 1</option>
                  <option>Cat 2</option>
                  <option>Cat 3</option>
                  <option>Cat 4</option>
                  <option>Cat 5</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-1 block">
                  Projected track
                </label>
                <input
                  value={track}
                  onChange={(e) => setTrack(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-[var(--hw-slate-200)] focus:border-[var(--hw-teal)] focus:outline-none text-sm"
                />
              </div>
            </div>
            <div className="mt-3">
              <button
                onClick={runPre}
                disabled={loading || !stormName}
                className="demo-btn-primary text-sm inline-flex items-center gap-2"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                Generate playbook
              </button>
            </div>
          </div>

          {error && (
            <div className="demo-card p-4 mb-4 border-l-4 border-[var(--hw-rose)]">
              <div className="text-sm font-medium text-[var(--hw-rose)]">Failed</div>
              <div className="text-xs text-[var(--hw-slate-700)] mt-1">{error}</div>
            </div>
          )}

          {loading && (
            <div className="demo-card p-8 flex items-center justify-center flex-col gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--hw-teal)]" />
              <div className="text-sm text-[var(--hw-slate-700)]">
                Drafting 5 facility-specific checklists, grounded in Hollywood plans…
              </div>
            </div>
          )}

          {pre && (
            <>
              <div className="demo-card p-4 mb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="demo-chip demo-chip-rose">{pre.header.category}</span>
                      <span className="demo-chip">{pre.header.expectedImpactWindow}</span>
                    </div>
                    <h2 className="demo-display text-xl font-semibold">{pre.header.stormName}</h2>
                    <div className="text-xs text-[var(--hw-slate-500)] mt-0.5">
                      {pre.header.track} · Advisory at {pre.header.advisoryAt}
                    </div>
                    <p className="text-sm text-[var(--hw-slate-700)] mt-2 leading-relaxed">
                      {pre.summary}
                    </p>
                  </div>
                  <button className="demo-btn-ghost text-sm inline-flex items-center gap-1.5 shrink-0">
                    <Download className="h-3.5 w-3.5" />
                    Distribute
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex flex-wrap gap-1 mb-3">
                {tabKeys.map((k) => {
                  const meta = CHECKLIST_META[k];
                  const Icon = meta.icon;
                  const cl = pre.checklists[k];
                  if (!cl) return null;
                  const active = activeTab === k;
                  const isAlfs = k === "alfs";
                  return (
                    <button
                      key={k}
                      onClick={() => setActiveTab(k)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition inline-flex items-center gap-2 ${
                        active
                          ? "text-white"
                          : "bg-white border border-[var(--hw-slate-200)] hover:border-[var(--hw-teal)]"
                      }`}
                      style={active ? { backgroundColor: meta.accent } : undefined}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {cl.title}
                      {isAlfs && !active && (
                        <span className="demo-chip demo-chip-rose text-[10px] ml-1">
                          critical
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active checklist */}
              {(() => {
                const cl = pre.checklists[activeTab];
                if (!cl) return null;
                const meta = CHECKLIST_META[activeTab];
                return (
                  <div className="demo-card p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: meta.accent + "1a", color: meta.accent }}
                      >
                        <meta.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="demo-display text-lg font-semibold">{cl.title}</h3>
                        <p className="text-xs text-[var(--hw-slate-500)]">{cl.subtitle}</p>
                      </div>
                    </div>
                    {activeTab === "alfs" && (
                      <div className="mb-3 p-3 rounded-md bg-rose-50 border border-rose-200 flex gap-2">
                        <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="text-xs leading-relaxed text-rose-900">
                          <span className="font-semibold">Lesson from 2017 (Hurricane Irma):</span>{" "}
                          The Rehabilitation Center at Hollywood Hills lost 12–14 residents to heat after a generator failure. Florida's emergency-generator rule for ALFs was built on this. Generator status &amp; indoor-temp monitoring are item #1 on this list.
                        </div>
                      </div>
                    )}
                    <ol className="space-y-2">
                      {cl.items.map((it, i) => (
                        <li key={i} className="flex items-start gap-3 p-2 rounded border border-[var(--hw-slate-200)]">
                          <CheckCircle2 className="h-4 w-4 text-[var(--hw-teal)] shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{it.label}</span>
                              {it.priority === "critical" && (
                                <span className="demo-chip demo-chip-rose">critical</span>
                              )}
                              {it.priority === "high" && (
                                <span className="demo-chip demo-chip-amber">high</span>
                              )}
                            </div>
                            <div className="text-xs text-[var(--hw-slate-700)] mt-0.5 leading-snug">
                              {it.detail}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                    <div className="mt-4 pt-3 border-t border-[var(--hw-slate-200)] flex gap-2 flex-wrap">
                      <button className="demo-btn-primary text-sm inline-flex items-center gap-1.5">
                        <Download className="h-3.5 w-3.5" />
                        Download {cl.title} PDF
                      </button>
                      <button className="demo-btn-ghost text-sm">Email registered contacts</button>
                    </div>
                  </div>
                );
              })()}

              {pre.citations.length > 0 && (
                <div className="demo-card p-4 mt-4">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-2">
                    Plan citations
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {pre.citations.map((c, i) => (
                      <div key={i} className="text-xs border border-[var(--hw-slate-200)] rounded-md p-2">
                        <div className="font-medium">
                          {c.doc}
                          {c.section && <span className="text-[var(--hw-slate-500)] font-normal"> · {c.section}</span>}
                        </div>
                        <div className="italic text-[var(--hw-slate-700)] mt-1">"{c.quote}"</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ─── Post-storm mode ───────────────────────────────────────────── */}
      {mode === "post" && (
        <>
          <div className="demo-card p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Upload className="h-3.5 w-3.5 text-[var(--hw-teal)]" />
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)]">
                  Paste damage report CSV
                </span>
              </div>
              <button
                onClick={() => setCsv(SAMPLE_CSV)}
                className="text-[11px] text-[var(--hw-teal)] hover:underline"
              >
                Reset sample
              </button>
            </div>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={10}
              className="w-full demo-mono text-[11px] px-3 py-2 rounded-md border border-[var(--hw-slate-200)] focus:border-[var(--hw-teal)] focus:outline-none resize-none bg-[var(--hw-slate-50)]"
            />
            <div className="mt-3">
              <button
                onClick={runPost}
                disabled={loading || !csv.trim()}
                className="demo-btn-primary text-sm inline-flex items-center gap-2"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                Generate FEMA Project Worksheet
              </button>
            </div>
          </div>

          {error && (
            <div className="demo-card p-4 mb-4 border-l-4 border-[var(--hw-rose)]">
              <div className="text-sm font-medium text-[var(--hw-rose)]">Failed</div>
              <div className="text-xs text-[var(--hw-slate-700)] mt-1">{error}</div>
            </div>
          )}

          {loading && (
            <div className="demo-card p-8 flex items-center justify-center flex-col gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--hw-teal)]" />
              <div className="text-sm text-[var(--hw-slate-700)]">
                Categorizing damages, computing exposure, drafting FEMA worksheet…
              </div>
            </div>
          )}

          {post && (
            <>
              <div className="demo-card p-4 mb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-1">
                      Aggregated worksheet
                    </div>
                    <p className="text-sm leading-relaxed text-[var(--hw-slate-900)]">
                      {post.summary}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase text-[var(--hw-slate-500)]">Total est.</div>
                    <div className="demo-display text-2xl font-semibold text-[var(--hw-coral)]">
                      {post.totalEstimatedCost}
                    </div>
                  </div>
                </div>
              </div>

              <div className="demo-card p-4 mb-3">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-3">
                  Categorized damages
                </div>
                <div className="space-y-3">
                  {post.categorized.map((cat) => (
                    <div key={cat.category} className="border border-[var(--hw-slate-200)] rounded-md p-3">
                      <div className="flex justify-between mb-2">
                        <span className="font-semibold text-sm">{cat.category}</span>
                        <span className="demo-chip demo-chip-teal">{cat.subtotal}</span>
                      </div>
                      <div className="space-y-1">
                        {cat.items.map((it, i) => (
                          <div key={i} className="text-xs flex justify-between gap-2 pb-1 border-b border-[var(--hw-slate-200)] last:border-none">
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">{it.asset}</span>
                              <span className="text-[var(--hw-slate-500)]"> — {it.note}</span>
                            </div>
                            <span className="demo-mono shrink-0">{it.cost}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="demo-card p-4 mb-3">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-3">
                  FEMA Project Worksheet sections (draft)
                </div>
                <div className="space-y-3 text-sm">
                  <Section title="Scope" body={post.fema.scope} />
                  <Section title="Damage description" body={post.fema.damageDescription} />
                  <Section title="Work description" body={post.fema.workDescription} />
                  <Section title="Mitigation opportunities" body={post.fema.mitigationOpportunities} />
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--hw-slate-200)] flex gap-2">
                  <button className="demo-btn-primary text-sm inline-flex items-center gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    Export FEMA PW format
                  </button>
                  <button className="demo-btn-accent text-sm">Submit to HMGP/BRIC</button>
                </div>
              </div>

              {post.citations.length > 0 && (
                <div className="demo-card p-4">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)] mb-2">
                    Sources
                  </div>
                  {post.citations.map((c, i) => (
                    <div key={i} className="text-xs border border-[var(--hw-slate-200)] rounded-md p-2 mb-1.5">
                      <div className="font-medium">{c.doc}</div>
                      <div className="italic text-[var(--hw-slate-700)] mt-1">"{c.quote}"</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold mb-1">
        {title}
      </div>
      <p className="text-[var(--hw-slate-900)] leading-relaxed">{body}</p>
    </div>
  );
}
