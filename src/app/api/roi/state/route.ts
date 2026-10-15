import { createClient } from "@supabase/supabase-js";

// Shared ROI Advisor workspace (use cases, clients, pricing) for the whole team.
// One JSON file in a private Supabase Storage bucket; last write wins, with a
// version check so a stale browser can't silently overwrite newer team edits.
// Gated by src/middleware.ts.

const BUCKET = "roi-advisor";
// Local test servers set ROI_WORKSPACE_FILE so they never touch the team's file.
const FILE = process.env.ROI_WORKSPACE_FILE || "workspace.json";

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function read(sb: NonNullable<ReturnType<typeof supabase>>) {
  const { data, error } = await sb.storage.from(BUCKET).download(FILE);
  if (error || !data) return null;
  try {
    return JSON.parse(await data.text()) as { updatedAt: number; data: unknown };
  } catch {
    return null;
  }
}

export async function GET() {
  const sb = supabase();
  if (!sb) return Response.json({ shared: false, reason: "Supabase is not configured" });
  const doc = await read(sb);
  return Response.json({ shared: true, updatedAt: doc?.updatedAt ?? 0, data: doc?.data ?? null }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request) {
  const sb = supabase();
  if (!sb) return Response.json({ shared: false, reason: "Supabase is not configured" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { data?: unknown; baseUpdatedAt?: number; force?: boolean } | null;
  if (!body?.data) return Response.json({ error: "No data" }, { status: 400 });
  const current = await read(sb);
  if (current && !body.force && (body.baseUpdatedAt ?? 0) < current.updatedAt) {
    return Response.json({ conflict: true, updatedAt: current.updatedAt, data: current.data }, { status: 409 });
  }
  const updatedAt = Date.now();
  const blob = new Blob([JSON.stringify({ updatedAt, data: body.data })], { type: "application/json" });
  let { error } = await sb.storage.from(BUCKET).upload(FILE, blob, { upsert: true, contentType: "application/json", cacheControl: "0" });
  if (error && /not found|bucket/i.test(error.message)) {
    await sb.storage.createBucket(BUCKET, { public: false });
    ({ error } = await sb.storage.from(BUCKET).upload(FILE, blob, { upsert: true, contentType: "application/json", cacheControl: "0" }));
  }
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, updatedAt });
}
