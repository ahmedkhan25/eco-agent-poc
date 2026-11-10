"use client";

import dynamic from "next/dynamic";

const RELOAD_FLAG = "systems-modeler-chunk-reload";

// A code chunk can fail to download (dropped connection, or a tab left open
// across a deploy). Retry once, then reload the page once to pick up fresh
// files, instead of showing Next.js's blank "Application error" screen.
async function loadPage() {
  const load = () => import("@/components/systems-modeler/systems-modeler-page");
  try {
    const mod = await load().catch(() => load());
    try {
      sessionStorage.removeItem(RELOAD_FLAG);
    } catch {}
    return mod.SystemsModelerPage;
  } catch (err) {
    let alreadyReloaded = false;
    try {
      alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === "1";
      sessionStorage.setItem(RELOAD_FLAG, "1");
    } catch {}
    if (!alreadyReloaded && typeof window !== "undefined") {
      window.location.reload();
      return () => null;
    }
    throw err;
  }
}

const SystemsModelerPage = dynamic(loadPage, {
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] items-center justify-center text-sm text-slate-500">
      Loading Systems Modeler…
    </div>
  ),
});

export function SystemsModelerClient() {
  return <SystemsModelerPage />;
}
