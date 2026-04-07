/**
 * Standalone spatial query API route for pipeline testing.
 * Uses gpt-5.4-mini for intent parsing, queries public ArcGIS endpoints.
 * Returns full debug data (all pipeline stages) + GeoJSON for map rendering.
 */

import { NextResponse } from "next/server";
import { runSpatialPipeline } from "@/lib/arcgis-query";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = body.query as string;

    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return NextResponse.json(
        { error: "Query must be at least 3 characters" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const result = await runSpatialPipeline(query.trim());

    return NextResponse.json(result);
  } catch (err) {
    console.error("Spatial query pipeline error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
        stack: process.env.NODE_ENV === "development" && err instanceof Error
          ? err.stack
          : undefined,
      },
      { status: 500 }
    );
  }
}
