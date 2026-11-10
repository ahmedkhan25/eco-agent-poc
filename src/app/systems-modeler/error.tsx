"use client";

export default function SystemsModelerError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="font-serif text-2xl text-slate-900">
        The Systems Modeler didn&apos;t finish loading
      </h2>
      <p className="max-w-md text-slate-600">
        Part of the page failed to download. Reloading usually fixes it.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-teal-600 px-5 py-2.5 font-semibold text-white hover:bg-teal-700"
        >
          Reload page
        </button>
        <button
          onClick={() => reset()}
          className="rounded-xl border-2 border-teal-600 px-5 py-2.5 font-semibold text-teal-600 hover:bg-teal-50"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
