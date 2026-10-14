"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EcoheartLogo } from "@/components/ecoheart-logo";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/roi";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/roi/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      router.replace(next.startsWith("/roi") ? next : "/roi");
      router.refresh();
    } else {
      setError("That password isn't right. Try again.");
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
      <div className="flex items-center gap-2">
        <EcoheartLogo className="h-7 w-7" />
        <span className="font-bold text-slate-900">ecoheart</span>
      </div>
      <div>
        <h1 className="font-serif text-2xl text-slate-900">ROI Advisor</h1>
        <p className="mt-1 text-sm text-slate-500">Internal workspace for the ecoheart team.</p>
      </div>
      <label htmlFor="roi-password" className="block text-sm font-medium text-slate-700">
        Password
      </label>
      <input
        id="roi-password"
        type="password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy || !password}
        className="w-full rounded-xl bg-teal-600 py-3 font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
      >
        {busy ? "Checking..." : "Open the ROI Advisor"}
      </button>
    </form>
  );
}

export default function RoiLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 px-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
