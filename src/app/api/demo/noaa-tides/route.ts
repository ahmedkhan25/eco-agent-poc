import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Live NOAA Tides & Currents — Virginia Key (8723214).
 * Returns predicted high/low tide series and observed (water_level) for the requested window.
 * Public API, no key required.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const station = searchParams.get("station") ?? "8723214";
  const days = Math.min(60, parseInt(searchParams.get("days") ?? "60", 10) || 60);
  const threshold = parseFloat(searchParams.get("threshold") ?? "3.2");

  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + days);
  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

  const baseParams = new URLSearchParams({
    station,
    product: "predictions",
    datum: "MLLW",
    units: "english",
    time_zone: "lst_ldt",
    format: "json",
    begin_date: fmt(today),
    end_date: fmt(end),
    interval: "hilo",
  });

  try {
    // High/low predictions for the upcoming window
    const predUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?${baseParams.toString()}`;
    const predRes = await fetch(predUrl, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });

    if (!predRes.ok) {
      return NextResponse.json(
        { error: `NOAA predictions HTTP ${predRes.status}` },
        { status: 502 }
      );
    }
    const predJson = await predRes.json();
    const predictions: Array<{ t: string; v: string; type: "H" | "L" }> =
      predJson.predictions ?? [];

    // Compute exceedance days vs threshold (high tides above MLLW threshold)
    const exceedanceByDate = new Map<string, number>();
    let peakFt = 0;
    for (const p of predictions) {
      const v = parseFloat(p.v);
      if (p.type === "H" && v >= threshold) {
        const date = p.t.slice(0, 10);
        exceedanceByDate.set(date, Math.max(exceedanceByDate.get(date) ?? 0, v));
        if (v > peakFt) peakFt = v;
      }
    }

    // Last 14 days observed for the sparkline
    const sparkStart = new Date(today);
    sparkStart.setDate(sparkStart.getDate() - 14);
    const obsParams = new URLSearchParams({
      station,
      product: "water_level",
      datum: "MLLW",
      units: "english",
      time_zone: "lst_ldt",
      format: "json",
      begin_date: fmt(sparkStart),
      end_date: fmt(today),
    });
    let observed: Array<{ t: string; v: string }> = [];
    try {
      const obsRes = await fetch(
        `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?${obsParams.toString()}`,
        { signal: AbortSignal.timeout(6000), next: { revalidate: 1800 } }
      );
      if (obsRes.ok) {
        const obsJson = await obsRes.json();
        observed = obsJson.data ?? [];
      }
    } catch {
      /* observed data is best-effort */
    }

    return NextResponse.json({
      station,
      stationName: "Virginia Key, FL (8723214)",
      threshold,
      windowDays: days,
      peakFt: Number(peakFt.toFixed(2)),
      exceedanceDays: exceedanceByDate.size,
      exceedances: Array.from(exceedanceByDate.entries()).map(([date, peak]) => ({
        date,
        peak: Number(peak.toFixed(2)),
      })),
      predictions: predictions.map((p) => ({
        t: p.t,
        v: Number(parseFloat(p.v).toFixed(2)),
        type: p.type,
      })),
      observedRecent: observed.slice(-336).map((p) => ({
        t: p.t,
        v: Number(parseFloat(p.v).toFixed(2)),
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "NOAA fetch failed", detail: msg },
      { status: 502 }
    );
  }
}
