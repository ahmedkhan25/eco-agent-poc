"use client";

import dynamic from "next/dynamic";

const SystemsModelerPage = dynamic(
  () =>
    import("@/components/systems-modeler/systems-modeler-page").then(
      (mod) => mod.SystemsModelerPage
    ),
  { ssr: false }
);

export function SystemsModelerClient() {
  return <SystemsModelerPage />;
}
