// Password gate for the internal ROI Advisor area (/roi). Light protection for
// internal demos; the password lives in ROI_ACCESS_PASSWORD on Render.
import { NextResponse, type NextRequest } from "next/server";

export const ROI_COOKIE = "roi_access";
export const ROI_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function roiPassword(): string {
  return process.env.ROI_ACCESS_PASSWORD || "eco";
}

/** Cookie value: a hash of the password, so changing the password logs everyone out. */
export async function roiToken(password = roiPassword()): Promise<string> {
  const data = new TextEncoder().encode(`ecoheart-roi:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function isRoiPath(pathname: string): boolean {
  return pathname === "/roi" || pathname.startsWith("/roi/") || pathname.startsWith("/api/roi/");
}

const OPEN_PATHS = new Set(["/roi/login", "/api/roi/login"]);

/** Returns a response to send instead of the page, or null when access is allowed. */
export async function roiGate(request: NextRequest): Promise<NextResponse | null> {
  const { pathname, search } = request.nextUrl;
  if (OPEN_PATHS.has(pathname)) return null;
  const cookie = request.cookies.get(ROI_COOKIE)?.value;
  if (cookie && cookie === (await roiToken())) return null;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Password required" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/roi/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}
