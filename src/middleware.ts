import { NextResponse, type NextRequest } from "next/server";
import { roiGate } from "@/lib/roi/access";

// Next.js only loads middleware from src/ in this project (the root middleware.ts
// is not picked up), so this file is scoped to the internal ROI Advisor area only.
export async function middleware(request: NextRequest) {
  return (await roiGate(request)) ?? NextResponse.next();
}

export const config = {
  matcher: ["/roi", "/roi/:path*", "/api/roi/:path*"],
};
