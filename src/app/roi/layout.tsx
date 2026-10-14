import type { Metadata } from "next";
import { RoiShell } from "@/components/roi/roi-shell";

export const metadata: Metadata = {
  title: "ecoheart ROI Advisor (internal)",
  robots: { index: false, follow: false },
};

export default function RoiLayout({ children }: { children: React.ReactNode }) {
  return <RoiShell>{children}</RoiShell>;
}
