"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { LogOut, MessageSquare, PanelRightClose } from "lucide-react";
import { EcoheartLogo } from "@/components/ecoheart-logo";
import { ROI_AGENT_INSTRUCTIONS } from "@/lib/roi/prompt";
import { useRoiStore } from "@/lib/roi/store";
import { RoiAgent } from "./roi-agent";

const TABS = [
  { label: "Workspace", href: "/roi" },
  { label: "Model & assumptions", href: "/roi/model" },
  { label: "Report", href: "/roi/report" },
  { label: "Proposal", href: "/roi/proposal" },
];

const chatTheme = {
  "--copilot-kit-primary-color": "#0D9488",
  "--copilot-kit-contrast-color": "#ffffff",
  "--copilot-kit-background-color": "#ffffff",
  "--copilot-kit-secondary-color": "#F7F6F2",
  "--copilot-kit-secondary-contrast-color": "#0F172A",
  "--copilot-kit-separator-color": "#E2E8F0",
  "--copilot-kit-muted-color": "#64748B",
} as React.CSSProperties;

export function RoiShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The login page sits outside the gate, so it must not start the chat runtime.
  if (pathname === "/roi/login") return <>{children}</>;
  return (
    <CopilotKit runtimeUrl="/api/roi/copilot" showDevConsole={false} enableInspector={false}>
      <Workspace>{children}</Workspace>
    </CopilotKit>
  );
}

function Workspace({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const chatOpen = useRoiStore((s) => s.chatOpen);
  const setChatOpen = useRoiStore((s) => s.setChatOpen);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const signOut = async () => {
    await fetch("/api/roi/login", { method: "DELETE" });
    router.replace("/roi/login");
  };

  return (
    <div className="flex h-dvh flex-col bg-[#F7F6F2] font-sans text-slate-600 print:h-auto print:bg-white">
      <header className="flex h-14 flex-none items-center gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-6 print:hidden">
        <Link href="/roi" className="flex flex-none items-center gap-2">
          <EcoheartLogo className="h-7 w-7" />
          <span className="font-bold text-[#0F172A]">ecoheart</span>
          <span className="hidden font-serif text-lg italic text-teal-700 sm:inline">ROI Advisor</span>
        </Link>
        <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto" aria-label="ROI Advisor">
          {TABS.map((t) => {
            const active = t.href === "/roi" ? pathname === "/roi" : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  active ? "bg-[#0F172A] text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <span className="hidden rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200 lg:block">
          Internal
        </span>
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="flex flex-none items-center gap-1.5 rounded-full bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Ask the Advisor</span>
          </button>
        )}
        <button onClick={signOut} title="Sign out" className="flex-none rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 print:block">
        <main className="min-w-0 flex-1 overflow-y-auto print:overflow-visible">
          {ready ? children : <div className="p-8 text-sm text-slate-400">Loading...</div>}
        </main>

        {ready && <RoiAgent />}

        <aside
          style={chatTheme}
          className={`${chatOpen ? "flex" : "hidden"} fixed inset-x-0 bottom-0 top-14 z-40 flex-col border-l border-slate-200 bg-white md:static md:w-[400px] md:flex-none print:hidden`}
        >
          <div className="flex h-11 flex-none items-center justify-between border-b border-slate-100 px-4">
            <div className="text-sm font-semibold text-[#0F172A]">
              Ask the <span className="font-serif italic text-teal-700">Advisor</span>
            </div>
            <button onClick={() => setChatOpen(false)} title="Hide chat" className="rounded p-1 text-slate-400 hover:text-slate-700">
              <PanelRightClose className="h-4 w-4" />
            </button>
          </div>
          <div className="roi-chat min-h-0 flex-1">
            <CopilotChat
              instructions={ROI_AGENT_INSTRUCTIONS}
              labels={{
                title: "ROI Advisor",
                initial:
                  "Hi. Tell me about a city and a decision, and I'll build the ROI scenario on the canvas. For example: \"What does Flagstaff get back if the insurance credit is only 2%?\"",
                placeholder: "Ask a what-if, compare options, or ask for a report...",
              }}
              className="h-full"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
