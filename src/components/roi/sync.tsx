"use client";

// Keeps the shared workspace (use cases, clients, pricing) in step with the team copy
// at /api/roi/state. Scenarios on the canvas stay in this browser.

import { useEffect, useRef, useState } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { pickWorkspace, useRoiStore, type Workspace } from "@/lib/roi/store";

type Status = "connecting" | "saved" | "saving" | "local" | "updated" | "conflict" | "error";

export function useSharedWorkspace() {
  const [status, setStatus] = useState<Status>("connecting");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shared = useRef(false);

  const push = async () => {
    const st = useRoiStore.getState();
    if (st.workspaceEditedAt <= st.workspaceSyncedAt) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/roi/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: pickWorkspace(st), baseUpdatedAt: st.workspaceSyncedAt }),
      });
      const j = await res.json();
      if (res.status === 409 && j.data) {
        useRoiStore.getState().loadWorkspace(j.data as Workspace, j.updatedAt);
        setStatus("conflict");
        return;
      }
      if (!res.ok) throw new Error(j.error || res.statusText);
      useRoiStore.setState({ workspaceSyncedAt: j.updatedAt, workspaceEditedAt: j.updatedAt });
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  const pull = async (first = false) => {
    try {
      const res = await fetch("/api/roi/state", { cache: "no-store" });
      const j = await res.json();
      if (!j.shared) {
        shared.current = false;
        setStatus("local");
        return;
      }
      shared.current = true;
      const st = useRoiStore.getState();
      const pending = st.workspaceEditedAt > st.workspaceSyncedAt;
      if (!j.data) {
        // First use: seed the team copy from this browser.
        useRoiStore.setState({ workspaceEditedAt: Date.now() });
        await push();
        return;
      }
      if (j.updatedAt > st.workspaceSyncedAt && (!pending || first)) {
        st.loadWorkspace(j.data as Workspace, j.updatedAt);
        setStatus(first ? "saved" : "updated");
      } else if (first) setStatus(pending ? "saving" : "saved");
      const now = useRoiStore.getState();
      if (now.workspaceEditedAt > now.workspaceSyncedAt) void push();
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    void pull(true);
    const unsub = useRoiStore.subscribe((s, prev) => {
      if (!shared.current || s.workspaceEditedAt === prev.workspaceEditedAt || s.workspaceEditedAt <= s.workspaceSyncedAt) return;
      if (timer.current) clearTimeout(timer.current);
      setStatus("saving");
      timer.current = setTimeout(() => void push(), 1200);
    });
    const poll = setInterval(() => void pull(false), 30000);
    return () => {
      unsub();
      clearInterval(poll);
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return status;
}

export function SyncBadge({ status }: { status: Status }) {
  const map: Record<Status, { text: string; tone: string; icon: React.ReactNode }> = {
    connecting: { text: "Connecting", tone: "text-slate-400", icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
    saved: { text: "Shared with the team", tone: "text-teal-700", icon: <Cloud className="h-3 w-3" /> },
    saving: { text: "Saving for the team", tone: "text-slate-500", icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
    updated: { text: "Updated by a teammate", tone: "text-teal-700", icon: <Cloud className="h-3 w-3" /> },
    conflict: { text: "A teammate changed this first; reloaded theirs", tone: "text-amber-700", icon: <Cloud className="h-3 w-3" /> },
    local: { text: "This browser only", tone: "text-slate-400", icon: <CloudOff className="h-3 w-3" /> },
    error: { text: "Not saved to the team copy", tone: "text-red-600", icon: <CloudOff className="h-3 w-3" /> },
  };
  const m = map[status];
  return (
    <span title="Use cases, clients and pricing are shared with the team. Scenarios stay in this browser." className={`hidden items-center gap-1 text-[11px] xl:flex ${m.tone}`}>
      {m.icon}
      {m.text}
    </span>
  );
}
