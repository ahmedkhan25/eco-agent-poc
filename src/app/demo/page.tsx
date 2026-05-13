import Link from "next/link";
import Image from "next/image";
import {
  Waves,
  Droplets,
  Building2,
  Sparkles,
  Network,
  ShieldAlert,
  ArrowRight,
  MapPin,
  Calendar,
  DollarSign,
  Users,
} from "lucide-react";

const FEATURES = [
  {
    href: "/demo/king-tide",
    icon: Waves,
    tag: "GIS · Flagship",
    title: "King Tide Flood Risk Explorer",
    subtitle:
      "Live NOAA Virginia Key predictions fused with parcel-level vulnerability. See which streets flood, on which days, in the next 60 days.",
    accent: "var(--hw-teal)",
    banner: "/demo/kingtide.webp",
    bannerCaption: "South Florida king-tide flooding — sunny-day, no-storm conditions",
  },
  {
    href: "/demo/septic-priority",
    icon: Droplets,
    tag: "GIS · Cross-pillar",
    title: "Septic-to-Sewer Prioritization Map",
    subtitle:
      "Hollywood has 17,000 unsewered parcels and $1.3B to spend. EcoHeart ranks every parcel on risk × cost × equity and re-clusters the 30-year plan on a slider.",
    accent: "var(--hw-coral)",
    banner: "/demo/septic.png",
    bannerCaption: "Drone view: low-elevation residential blocks — septic-on-the-coast risk profile",
    bannerBadge: "Simulated · 500 parcels",
  },
  {
    href: "/demo/risk-report",
    icon: Building2,
    tag: "RAG + GIS · Flagship",
    title: "Address Climate Risk Report",
    subtitle:
      "Type an address → get a one-page, RAG-grounded, downloadable PDF showing every climate risk, every relevant city plan, and concrete recommendations.",
    accent: "var(--hw-teal)",
    banner: "/demo/risk-report.png",
    bannerCaption: "Single-family parcel under storm-tide conditions — the unit EcoHeart scores",
    bannerBadge: "Live · EcoHeart AI + Nominatim",
  },
  {
    href: "/demo/grant-finder",
    icon: Sparkles,
    tag: "RAG · Agent",
    title: "Grant Finder Agent",
    subtitle:
      "Describe a project — agent matches BRIC, Resilient Florida, CWSRF, CDBG-DR and auto-drafts the narrative grounded in Hollywood's own plans.",
    accent: "var(--hw-coral)",
    banner: "/demo/grant-finder.png",
    bannerCaption: "Grant writer at work — EcoHeart drafts what used to take staff a week",
    bannerBadge: "Live · EcoHeart AI agent",
  },
  {
    href: "/demo/adaptation-pathways",
    icon: Network,
    tag: "Systems Modeler",
    title: "SLR Adaptation Pathways",
    subtitle:
      "Causal loop diagram exploring three adaptation pathways — armoring, accommodation, managed retreat — with feedback loops, the Aha! Paradox, and a humanized narrative.",
    accent: "var(--hw-teal)",
    banner: "/demo/adaptation-pathways.png",
    bannerCaption: "Living shoreline + armored bulkhead — the tradeoff every coastal city is running",
    bannerBadge: "Seeded · 3 pathway models",
  },
  {
    href: "/demo/hurricane-playbook",
    icon: ShieldAlert,
    tag: "RAG · Agent",
    title: "Hurricane After-Action Playbook",
    subtitle:
      "Pre-storm: ALF-specific generator-status checklist with the 2017 Hollywood Hills lesson baked in. Post-storm: drafts the FEMA Project Worksheet.",
    accent: "var(--hw-coral)",
    banner: "/demo/hurricane.png",
    bannerCaption: "Post-storm damage assessment — the inspector tablet input EcoHeart turns into a FEMA worksheet",
    bannerBadge: "Live · EcoHeart AI agent",
  },
];

const CONCEPT_CARDS = [
  {
    href: "/demo/a1a-coastal",
    title: "A1A Coastal Vulnerability Dashboard",
    blurb: "Scrollytelling tour of A1A — FDOT pump stations, seawall heights, dune health.",
    banner: "/demo/a1a-coastal.png",
  },
  {
    href: "/demo/tree-canopy",
    title: "Tree Canopy & Heat Island Map",
    blurb: "Where Hollywood's thin canopy overlaps highest heat-vulnerability index.",
    banner: "/demo/tree-canopy.png",
  },
  {
    href: "/demo/stormwater",
    title: "Stormwater Outfall + Water Quality",
    blurb: "Outfall-by-outfall E. coli history paired with nearby septic-system proximity.",
    banner: "/demo/stormwater.png",
  },
  {
    href: "/demo/code-assistant",
    title: "Building Resilience Code Assistant",
    blurb: "FBC HVHZ, ASCE 24, Hollywood Zoning §155 — cited paragraph for every answer.",
    banner: "/demo/code-assistant.png",
  },
  {
    href: "/demo/tourism-loop",
    title: "Tourism-Climate Feedback Loop Model",
    blurb: "Broadwalk revenue × storm frequency × resilience CIP.",
    banner: "/demo/tourism-loop.png",
  },
  {
    href: "/demo/triage",
    title: "311 Climate Complaint Triage",
    blurb: "Auto-classify flood reports against tide + radar + nearest CIP project.",
    banner: "/demo/triage.png",
  },
  {
    href: "/demo/equity",
    title: "Climate Equity Index Dashboard",
    blurb: "Climate exposure × CDC SVI × HUD LMI per block group.",
    banner: "/demo/equity.png",
  },
  {
    href: "/demo/ghg",
    title: "GHG Inventory Auto-Updater",
    blurb: "FPL + DOT VMT + waste tonnage → annual CDP-formatted report.",
    banner: "/demo/ghg.png",
  },
];

export default function DemoOverview() {
  return (
    <div className="px-6 py-8 max-w-7xl">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl p-8 mb-8 min-h-[320px]">
        <Image
          src="/demo/kingtide.webp"
          alt="South Florida king-tide flooding — sunny-day, no-storm conditions"
          fill
          sizes="100vw"
          priority
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(110deg, rgba(14,124,123,0.95) 0%, rgba(14,124,123,0.85) 45%, rgba(14,124,123,0.35) 75%, rgba(14,124,123,0.15) 100%)",
          }}
        />
        <div className="relative z-10 max-w-3xl text-white">
          <div className="text-xs uppercase tracking-widest opacity-80 mb-3">
            EcoHeart × City of Hollywood, FL
          </div>
          <h1 className="demo-display text-4xl font-semibold leading-tight mb-3">
            Twice a day, two hours.
          </h1>
          <p className="text-base opacity-90 leading-relaxed mb-5 max-w-2xl">
            That's how long the South Lake neighborhood is trapped by tidal flooding during a king-tide
            week. Hollywood is spending $2.5B on water and wastewater to fix it. EcoHeart makes the
            homework cheaper and faster — and shows it to commissioners, residents, and grant reviewers
            in one URL.
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="demo-chip" style={{ backgroundColor: "rgba(255,255,255,0.18)", color: "white", borderColor: "transparent" }}>
              SE FL Climate Compact 2019 SLR Projection
            </span>
            <span className="demo-chip" style={{ backgroundColor: "rgba(255,255,255,0.18)", color: "white", borderColor: "transparent" }}>
              $800K Resilient Florida CVA Update grant
            </span>
            <span className="demo-chip" style={{ backgroundColor: "rgba(255,255,255,0.18)", color: "white", borderColor: "transparent" }}>
              Resolution R-2017-168 (Paris Agreement)
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/demo/king-tide" className="inline-flex items-center gap-2 bg-white text-[var(--hw-teal-600)] px-4 py-2 rounded-md font-medium hover:bg-[var(--hw-cream)] transition">
              Start with the King Tide Explorer
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/demo/risk-report" className="inline-flex items-center gap-2 bg-[var(--hw-coral)] text-white px-4 py-2 rounded-md font-medium hover:bg-[var(--hw-coral-600)] transition">
              Generate a Risk Report
            </Link>
          </div>
        </div>
        <div className="absolute bottom-2 right-3 z-10 text-[10px] text-white/70 italic">
          South FL king-tide flooding — sunny-day, no storm
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard
          icon={MapPin}
          label="Unsewered parcels"
          value="~17,000"
          sub="≈50% of city · groundwater risk"
        />
        <StatCard
          icon={DollarSign}
          label="30-yr capital plan"
          value="$2.5B"
          sub="$1.3B septic-to-sewer"
        />
        <StatCard
          icon={Calendar}
          label="King-tide flood days"
          value="9 / 23"
          sub="Oct 3–25, 2026 window"
        />
        <StatCard
          icon={Users}
          label="GHG reduction target"
          value="80% by 2050"
          sub="SAP §3 · 99 actions"
        />
      </section>

      {/* Feature grid */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="demo-display text-2xl font-semibold">Demo features</h2>
          <span className="text-sm text-[var(--hw-slate-500)]">
            Live RAG, GIS, agents, systems modeling — wired against public data.
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.href}
                href={f.href}
                className="demo-card overflow-hidden hover:shadow-md transition-shadow group block"
              >
                {f.banner && (
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <Image
                      src={f.banner}
                      alt={f.bannerCaption ?? f.title}
                      fill
                      sizes="(max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      priority
                    />
                    {/* Top gradient — for the badges */}
                    <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent" />
                    {/* Bottom gradient — much stronger so the caption pops */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/55 to-transparent" />
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-white bg-black/55 backdrop-blur-sm px-2 py-1 rounded-full drop-shadow">
                        {f.bannerBadge ?? "Live · NOAA Virginia Key"}
                      </span>
                      <span
                        className="text-[10px] uppercase tracking-wider font-bold text-white px-2 py-1 rounded-full drop-shadow"
                        style={{ backgroundColor: f.accent }}
                      >
                        {f.tag}
                      </span>
                    </div>
                    {f.bannerCaption && (
                      <div
                        className="absolute bottom-3 left-3 right-3 text-[12px] font-medium text-white leading-snug"
                        style={{
                          textShadow: "0 1px 4px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.6)",
                        }}
                      >
                        {f.bannerCaption}
                      </div>
                    )}
                  </div>
                )}
                <div className="p-5">
                  {!f.banner && (
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: f.accent + "1a", color: f.accent }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--hw-slate-500)]">
                        {f.tag}
                      </span>
                    </div>
                  )}
                  <h3 className="demo-display text-lg font-semibold mb-1.5 group-hover:text-[var(--hw-teal)] transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-sm text-[var(--hw-slate-700)] leading-relaxed">
                    {f.subtitle}
                  </p>
                  <div className="mt-4 inline-flex items-center text-sm text-[var(--hw-teal)] font-medium">
                    Open
                    <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Concept cards (the closer slide) */}
      <section className="mt-10">
        <div className="flex items-baseline gap-3 mb-3">
          <h2 className="demo-display text-xl font-semibold">What else EcoHeart can build</h2>
          <span className="text-sm text-[var(--hw-slate-500)]">Phase-2 concept set</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {CONCEPT_CARDS.map((c) => (
            <Link
              key={c.title}
              href={c.href}
              className="demo-card overflow-hidden flex flex-col hover:shadow-md transition-shadow group block"
            >
              <div className="relative h-32 w-full overflow-hidden">
                <Image
                  src={c.banner}
                  alt={c.title}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                <span className="absolute top-1.5 left-1.5 text-[9px] uppercase tracking-wider font-bold text-white bg-black/55 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                  Phase-2 Concept
                </span>
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <div className="text-sm font-semibold text-[var(--hw-slate-900)] leading-snug group-hover:text-[var(--hw-teal)] transition-colors">
                  {c.title}
                </div>
                <div className="text-xs text-[var(--hw-slate-500)] mt-1 leading-snug flex-1">
                  {c.blurb}
                </div>
                <div className="mt-2 inline-flex items-center text-[11px] text-[var(--hw-teal)] font-medium">
                  Open concept
                  <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="demo-card p-4">
      <div className="flex items-center gap-2 mb-2 text-[var(--hw-slate-500)]">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] uppercase tracking-wider font-semibold">
          {label}
        </span>
      </div>
      <div className="demo-display text-2xl font-semibold mb-1">{value}</div>
      <div className="text-xs text-[var(--hw-slate-500)]">{sub}</div>
    </div>
  );
}
