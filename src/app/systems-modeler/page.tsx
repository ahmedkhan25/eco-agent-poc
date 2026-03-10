import { SystemsModelerClient } from "./client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Systems Modeler | EcoHeart",
  description:
    "Universal Interactive System Modeler - Create causal loop diagrams with AI using Gene Bellinger's methodology",
};

export default function Page() {
  return <SystemsModelerClient />;
}
