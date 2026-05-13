"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Waves,
  Droplets,
  Building2,
  Sparkles,
  Network,
  ShieldAlert,
  Home,
  ArrowUpRight,
  Info,
  Wind,
  Trees,
  Activity,
  BookOpen,
  Hotel,
  Inbox,
  Users,
  Flame,
} from "lucide-react";
import { EcoheartLogo } from "@/components/ecoheart-logo";

const NAV = [
  { href: "/demo", label: "Overview", icon: Home, group: "" },
  { href: "/demo/king-tide", label: "King Tide Explorer", icon: Waves, group: "GIS" },
  { href: "/demo/septic-priority", label: "Septic-to-Sewer Map", icon: Droplets, group: "GIS" },
  { href: "/demo/risk-report", label: "Address Risk Report", icon: Building2, group: "RAG + GIS" },
  { href: "/demo/grant-finder", label: "Grant Finder Agent", icon: Sparkles, group: "RAG" },
  { href: "/demo/adaptation-pathways", label: "SLR Adaptation Pathways", icon: Network, group: "Systems" },
  { href: "/demo/hurricane-playbook", label: "Hurricane Playbook", icon: ShieldAlert, group: "RAG" },
  // Phase 2 concepts
  { href: "/demo/a1a-coastal", label: "A1A Coastal Dashboard", icon: Wind, group: "Phase 2" },
  { href: "/demo/tree-canopy", label: "Tree Canopy + Heat", icon: Trees, group: "Phase 2" },
  { href: "/demo/stormwater", label: "Stormwater Outfall", icon: Activity, group: "Phase 2" },
  { href: "/demo/code-assistant", label: "Code Assistant", icon: BookOpen, group: "Phase 2" },
  { href: "/demo/tourism-loop", label: "Tourism Loop Model", icon: Hotel, group: "Phase 2" },
  { href: "/demo/triage", label: "311 Triage", icon: Inbox, group: "Phase 2" },
  { href: "/demo/equity", label: "Equity Index", icon: Users, group: "Phase 2" },
  { href: "/demo/ghg", label: "GHG Auto-Updater", icon: Flame, group: "Phase 2" },
];

export function DemoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="demo-root min-h-screen flex flex-col">
      {/* Brand accent strip */}
      <div className="h-1 bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#6366f1]" />
      {/* Top bar — matches main EcoHeart product */}
      <header className="bg-[#0f172a] text-white">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link href="/demo" className="flex items-center gap-2.5 group">
              <EcoheartLogo className="h-9 w-9" />
              <div className="flex items-baseline gap-2">
                <span className="demo-display text-xl font-semibold tracking-tight text-white">
                  ecoheart
                </span>
                <span className="hidden sm:inline-flex text-[10px] uppercase tracking-wider text-white/50">
                  × Hollywood, FL
                </span>
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-2 ml-2 pl-4 border-l border-white/15">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--hw-teal)]/20 text-[var(--hw-teal)] border border-[var(--hw-teal)]/30">
                Sustainable Hollywood Action Plan
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-white/70 border border-white/10">
                80% GHG by 2050
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--hw-coral)]/20 text-[var(--hw-coral)] border border-[var(--hw-coral)]/30">
                $2.5B Water/Wastewater
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-sm text-white/70 hover:text-white inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-white/10 transition"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              Olympia POC
            </Link>
            <button
              className="text-sm inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--hw-teal)] hover:bg-[var(--hw-teal-600)] text-white transition"
            >
              <Info className="h-3.5 w-3.5" />
              About
            </button>
          </div>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 min-h-0">
        <aside className="w-60 shrink-0 border-r border-[var(--hw-slate-200)] bg-white p-3 flex flex-col gap-1">
          {/* Overview */}
          <NavGroup
            items={NAV.filter((n) => !n.group)}
            pathname={pathname}
          />
          <NavSection title="GIS">
            <NavGroup
              items={NAV.filter((n) => n.group === "GIS")}
              pathname={pathname}
            />
          </NavSection>
          <NavSection title="RAG + GIS">
            <NavGroup
              items={NAV.filter((n) => n.group === "RAG + GIS")}
              pathname={pathname}
            />
          </NavSection>
          <NavSection title="RAG">
            <NavGroup
              items={NAV.filter((n) => n.group === "RAG")}
              pathname={pathname}
            />
          </NavSection>
          <NavSection title="Systems">
            <NavGroup
              items={NAV.filter((n) => n.group === "Systems")}
              pathname={pathname}
            />
          </NavSection>
          <NavSection title="Phase 2 · Concepts">
            <NavGroup
              items={NAV.filter((n) => n.group === "Phase 2")}
              pathname={pathname}
            />
          </NavSection>
          <div className="mt-auto pt-4 border-t border-[var(--hw-slate-200)] text-[11px] text-[var(--hw-slate-500)] leading-snug">
            <div className="font-medium text-[var(--hw-slate-700)] mb-1">
              Powered by EcoHeart
            </div>
            Cited from City of Hollywood plans, Resilient Florida, NOAA &amp; FEMA public data.
          </div>
        </aside>
        <main className="flex-1 min-w-0 overflow-y-auto demo-scroll">{children}</main>
      </div>
    </div>
  );
}

function NavSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3">
      <div className="px-3 mb-1 text-[10px] uppercase tracking-wider text-[var(--hw-slate-500)] font-semibold">
        {title}
      </div>
      {children}
    </div>
  );
}

function NavGroup({
  items,
  pathname,
}: {
  items: typeof NAV;
  pathname: string;
}) {
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/demo"
            ? pathname === "/demo"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`demo-nav-link${active ? " active" : ""}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}
