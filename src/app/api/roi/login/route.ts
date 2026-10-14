import { NextResponse } from "next/server";
import { ROI_COOKIE, ROI_COOKIE_MAX_AGE, roiPassword, roiToken } from "@/lib/roi/access";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || password !== roiPassword()) {
    return NextResponse.json({ error: "That password isn't right." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ROI_COOKIE, await roiToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ROI_COOKIE_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ROI_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
