import type { Metadata } from "next";
import "./demo.css";
import { DemoShell } from "@/components/demo/demo-shell";

export const metadata: Metadata = {
  title: "EcoHeart × City of Hollywood, FL — Demo",
  description:
    "Climate, GIS, RAG and Systems Modeling for the City of Hollywood, Florida.",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoShell>{children}</DemoShell>;
}
