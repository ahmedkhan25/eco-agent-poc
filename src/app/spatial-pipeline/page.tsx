"use client";

import { useState, useEffect } from "react";
import { EcoheartLogo } from "@/components/ecoheart-logo";
import Link from "next/link";

const COLORS = {
  bg: "#fcf9f4",
  surface: "#ffffff",
  surfaceLight: "#f6f3ee",
  border: "#e5e2dd",
  borderActive: "#2D6A4F",
  green: "#2D6A4F",
  greenLight: "#40916C",
  greenMint: "#0f7a5f",
  greenDim: "#e8f5ef",
  orange: "#E8761B",
  orangeDim: "rgba(232,118,27,0.08)",
  blue: "#2563EB",
  teal: "#0891B2",
  text: "#1c1c19",
  textMuted: "#414844",
  textDim: "#717973",
  code: "#7c3aed",
  codeBlock: "#0D1117",
  white: "#1c1c19",
};

const STAGES = [
  {
    id: "user",
    label: "User Query",
    icon: "\u{1F4AC}",
    color: COLORS.white,
  },
  {
    id: "parse",
    label: "LLM Parses Intent",
    icon: "\u{1F9E0}",
    color: COLORS.code,
  },
  {
    id: "geocode",
    label: "Geocode Location",
    icon: "\u{1F4CD}",
    color: COLORS.orange,
  },
  {
    id: "query",
    label: "ArcGIS REST Query",
    icon: "\u{1F310}",
    color: COLORS.teal,
  },
  {
    id: "analyze",
    label: "LLM Summarizes",
    icon: "\u{1F4CA}",
    color: COLORS.greenLight,
  },
  {
    id: "render",
    label: "Map + Chat Response",
    icon: "\u{1F5FA}\u{FE0F}",
    color: COLORS.greenMint,
  },
];

const EXAMPLE_QUERIES = [
  "Show me how 4th Ave is affected by 1ft of sea level rise",
  "What flood zones are near the Capitol Campus?",
  "Are there wetlands within 500ft of Marine Drive?",
  "Show critical aquifer recharge areas in the Eastside neighborhood",
];

const TOOL_CALL_EXAMPLE = {
  tool: "arcgis_spatial_query",
  params: {
    intent: "sea_level_rise_impact",
    location: {
      street: "4th Avenue",
      geocode_to: "line_geometry",
      city: "Olympia, WA",
    },
    layers: [
      {
        name: "NOAA SLR 1ft Inundation",
        url: "https://coast.noaa.gov/arcgis/rest/services/dc_slr/slr_1ft/MapServer",
        type: "tiledMapLayer",
        purpose: "Show inundation extent at 1ft SLR",
      },
      {
        name: "Olympia Streets",
        url: "FeatureServer/query",
        query: "FULLNAME LIKE '%4TH AVE%'",
        purpose: "Locate the street geometry",
      },
    ],
    spatial_operation: "intersect",
    buffer_ft: 200,
    output: "geojson + text_summary",
  },
};

const GEOJSON_RESPONSE = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        affected_length_ft: 1247,
        total_length_ft: 3400,
        pct_affected: 36.7,
        slr_scenario: "1ft",
        zone: "Low-lying area",
      },
      geometry: { type: "LineString", coordinates: "..." },
    },
  ],
  metadata: {
    source: "NOAA Office for Coastal Management",
    endpoint: "coast.noaa.gov/.../slr_1ft/MapServer",
    query_time_ms: 342,
    bbox: [-122.905, 47.035, -122.895, 47.048],
  },
};

const LLM_SUMMARY = `Based on NOAA's sea level rise inundation model, approximately **1,247 feet (36.7%)** of 4th Avenue in downtown Olympia would be affected by a 1-foot rise in sea level.

The affected section runs from the intersection with Water Street northwest toward the Capitol Lake/Deschutes Estuary shoreline. This aligns with the city's **Sea Level Rise Response Plan** (2019), which identifies the downtown waterfront corridor as a priority adaptation zone.

Key findings:
\u2022 The western end of 4th Ave (near Percival Landing) shows full inundation at 1ft SLR
\u2022 Mid-block sections between Columbia and Water St show partial low-lying area exposure
\u2022 The eastern end (uphill toward Capitol Way) remains above the 1ft threshold

The city's Capital Facilities Plan (2025-2030) allocates stormwater infrastructure upgrades in this corridor \u2014 worth cross-referencing for adaptation planning.`;

function CodeBlock({
  code,
  language = "json",
}: {
  code: string;
  language?: string;
}) {
  return (
    <div
      style={{
        background: COLORS.codeBlock,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        overflow: "hidden",
        fontSize: 12,
        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
      }}
    >
      <div
        style={{
          padding: "6px 12px",
          background: "#161B22",
          borderBottom: "1px solid #2D3748",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#FF5F56",
          }}
        />
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#FFBD2E",
          }}
        />
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#27C93F",
          }}
        />
        <span
          style={{
            marginLeft: 8,
            color: "#6B7280",
            fontSize: 11,
          }}
        >
          {language}
        </span>
      </div>
      <pre
        style={{
          padding: 14,
          margin: 0,
          overflowX: "auto",
          color: "#E2E8F0",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {code}
      </pre>
    </div>
  );
}

function PipelineStep({
  stage,
  index,
  active,
  completed,
}: {
  stage: (typeof STAGES)[number];
  index: number;
  active: number;
  completed: number;
}) {
  const isActive = active === index;
  const isDone = completed >= index;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 8,
        background: isActive
          ? COLORS.surfaceLight
          : isDone
            ? COLORS.greenDim
            : "transparent",
        border: `1px solid ${isActive ? stage.color : isDone ? COLORS.greenDim : "transparent"}`,
        opacity: isDone || isActive ? 1 : 0.4,
        transition: "all 0.4s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isActive && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: stage.color,
            borderRadius: "0 2px 2px 0",
          }}
        />
      )}
      <span
        style={{
          fontSize: 18,
          filter: isDone || isActive ? "none" : "grayscale(1)",
        }}
      >
        {isDone ? "\u2705" : stage.icon}
      </span>
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: isActive ? 700 : 500,
            color: isActive
              ? stage.color
              : isDone
                ? COLORS.greenMint
                : COLORS.textDim,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {stage.label}
        </div>
      </div>
    </div>
  );
}

export default function SpatialQueryPipeline() {
  const [activeStep, setActiveStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState(EXAMPLE_QUERIES[0]);
  const [showToolCall, setShowToolCall] = useState(false);
  const [showArcGIS, setShowArcGIS] = useState(false);
  const [showGeoJSON, setShowGeoJSON] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [typedSummary, setTypedSummary] = useState("");

  const runPipeline = () => {
    setIsRunning(true);
    setActiveStep(0);
    setCompletedSteps(-1);
    setShowToolCall(false);
    setShowArcGIS(false);
    setShowGeoJSON(false);
    setShowSummary(false);
    setTypedSummary("");

    const delays = [800, 1800, 2800, 3800, 5200, 6600];
    const contents = [
      () => {},
      () => setShowToolCall(true),
      () => {},
      () => setShowArcGIS(true),
      () => {
        setShowGeoJSON(true);
      },
      () => {
        setShowSummary(true);
      },
    ];

    delays.forEach((delay, i) => {
      setTimeout(() => {
        setActiveStep(i);
        setCompletedSteps(i - 1);
        contents[i]();
        if (i === delays.length - 1) {
          setTimeout(() => {
            setCompletedSteps(i);
            setActiveStep(-1);
            setIsRunning(false);
          }, 1500);
        }
      }, delay);
    });
  };

  // Typewriter effect for summary
  useEffect(() => {
    if (!showSummary) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTypedSummary(LLM_SUMMARY.slice(0, i));
      if (i >= LLM_SUMMARY.length) clearInterval(id);
    }, 8);
    return () => clearInterval(id);
  }, [showSummary]);

  return (
    <div
      style={{
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        background: COLORS.bg,
        color: COLORS.text,
        minHeight: "100vh",
        padding: "24px 16px",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      {/* Banner */}
      <nav
        style={{
          background: "rgba(15,23,42,0.95)",
          backdropFilter: "blur(8px)",
          margin: "-24px -16px 0",
          padding: "14px 24px",
          marginBottom: 28,
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              textDecoration: "none",
            }}
          >
            <EcoheartLogo className="h-10 w-10" />
            <span
              style={{
                color: "white",
                fontWeight: 600,
                fontSize: 20,
                letterSpacing: "-0.01em",
              }}
            >
              ecoheart
            </span>
          </Link>
          <Link
            href="/map-explorer"
            style={{
              color: "#94a3b8",
              fontSize: 13,
              textDecoration: "none",
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid #334155",
              transition: "all 0.2s",
            }}
          >
            &larr; Back to Map Explorer
          </Link>
          <Link
            href="/spatial-test"
            style={{
              color: "#02C39A",
              fontSize: 13,
              textDecoration: "none",
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid #2D6A4F",
              background: "rgba(45,106,79,0.15)",
              transition: "all 0.2s",
            }}
          >
            Test Live Pipeline &rarr;
          </Link>
        </div>
      </nav>

      {/* Title */}
      <div style={{ maxWidth: 900, margin: "0 auto 28px" }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#012d1d",
            margin: "0 0 6px",
            letterSpacing: "-0.02em",
            fontFamily: "'Manrope', 'DM Sans', sans-serif",
          }}
        >
          Spatial Query Pipeline
        </h1>
        <p
          style={{
            color: COLORS.textMuted,
            fontSize: 14,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          How the LLM translates natural language into ArcGIS REST queries,
          fetches GeoJSON, and renders results on the map.
        </p>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Query selector */}
        <div
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: COLORS.textDim,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            Example Queries
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setSelectedQuery(q);
                }}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: `1px solid ${selectedQuery === q ? COLORS.orange : COLORS.border}`,
                  background:
                    selectedQuery === q ? COLORS.orangeDim : "transparent",
                  color:
                    selectedQuery === q ? COLORS.orange : COLORS.textMuted,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                }}
              >
                {q}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div
              style={{
                flex: 1,
                padding: "10px 14px",
                background: COLORS.surfaceLight,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                color: COLORS.text,
                fontSize: 14,
              }}
            >
              {selectedQuery}
            </div>
            <button
              onClick={runPipeline}
              disabled={isRunning}
              style={{
                padding: "10px 22px",
                borderRadius: 8,
                border: "none",
                background: isRunning ? COLORS.textDim : COLORS.green,
                color: "white",
                fontSize: 14,
                fontWeight: 600,
                cursor: isRunning ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}
            >
              {isRunning ? "Running..." : "\u25B6 Run Pipeline"}
            </button>
          </div>
        </div>

        {/* Main content: Pipeline + Details */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "220px 1fr",
            gap: 16,
          }}
        >
          {/* Pipeline steps */}
          <div
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: COLORS.textDim,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 4,
                fontWeight: 600,
                padding: "0 4px",
              }}
            >
              Pipeline Stages
            </div>
            {STAGES.map((stage, i) => (
              <PipelineStep
                key={stage.id}
                stage={stage}
                index={i}
                active={activeStep}
                completed={completedSteps}
              />
            ))}
          </div>

          {/* Detail panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Step 1: Tool call */}
            {showToolCall && (
              <div
                style={{
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  padding: 16,
                  animation: "fadeSlideIn 0.4s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{"\u{1F9E0}"}</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: COLORS.code,
                    }}
                  >
                    LLM generates tool call
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 10,
                      background: "rgba(179,146,240,0.15)",
                      color: COLORS.code,
                      fontWeight: 500,
                    }}
                  >
                    GPT-4o function calling
                  </span>
                </div>
                <CodeBlock
                  code={JSON.stringify(TOOL_CALL_EXAMPLE, null, 2)}
                  language="tool_call.json"
                />
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: COLORS.textMuted,
                    lineHeight: 1.6,
                  }}
                >
                  The LLM decomposes the user&apos;s question into:{" "}
                  <strong style={{ color: COLORS.orange }}>location</strong>{" "}
                  (4th Avenue &rarr; geocode),{" "}
                  <strong style={{ color: COLORS.teal }}>layers</strong> (NOAA
                  SLR 1ft), and{" "}
                  <strong style={{ color: COLORS.greenLight }}>
                    spatial operation
                  </strong>{" "}
                  (intersect with 200ft buffer). All endpoints are public
                  government services.
                </div>
              </div>
            )}

            {/* Step 2: ArcGIS query */}
            {showArcGIS && (
              <div
                style={{
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  padding: 16,
                  animation: "fadeSlideIn 0.4s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{"\u{1F310}"}</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: COLORS.teal,
                    }}
                  >
                    ArcGIS REST API call (no auth)
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 10,
                      background: "rgba(8,145,178,0.15)",
                      color: COLORS.teal,
                      fontWeight: 500,
                    }}
                  >
                    Public endpoint
                  </span>
                </div>
                <CodeBlock
                  code={`// Backend fetch — no API key, no token, no auth header
const url = new URL(
  "https://coast.noaa.gov/arcgis/rest/services/dc_slr/slr_1ft/MapServer/0/query"
);
url.searchParams.set("geometry", JSON.stringify({
  xmin: -122.905, ymin: 47.035,
  xmax: -122.895, ymax: 47.048,
  spatialReference: { wkid: 4326 }
}));
url.searchParams.set("geometryType", "esriGeometryEnvelope");
url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
url.searchParams.set("outFields", "*");
url.searchParams.set("f", "geojson");  // \u2190 key: returns standard GeoJSON

const response = await fetch(url);
const geojson = await response.json();
// \u2192 FeatureCollection with inundation polygons`}
                  language="route.ts (server-side)"
                />
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    background: COLORS.greenDim,
                    borderRadius: 6,
                    fontSize: 12,
                    color: COLORS.greenMint,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {"\u2705"}{" "}
                  <span style={{ color: "#1c1c19" }}>
                    No API key. No token. No account needed. Just a public URL
                    with
                  </span>{" "}
                  <code
                    style={{
                      background: "rgba(15,122,95,0.12)",
                      padding: "1px 5px",
                      borderRadius: 3,
                      color: "#0f7a5f",
                    }}
                  >
                    f=geojson
                  </code>
                </div>
              </div>
            )}

            {/* Step 3: GeoJSON response */}
            {showGeoJSON && (
              <div
                style={{
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  padding: 16,
                  animation: "fadeSlideIn 0.4s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{"\u{1F4CA}"}</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: COLORS.greenLight,
                    }}
                  >
                    GeoJSON &rarr; LLM summarization + Map render
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: COLORS.textDim,
                        marginBottom: 6,
                        fontWeight: 600,
                      }}
                    >
                      Sent to LLM (attribute summary only)
                    </div>
                    <CodeBlock
                      code={JSON.stringify(GEOJSON_RESPONSE, null, 2)}
                      language="geojson_summary.json"
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: COLORS.textDim,
                        marginBottom: 6,
                        fontWeight: 600,
                      }}
                    >
                      Sent to Map (full geometry)
                    </div>
                    <div
                      style={{
                        background: COLORS.codeBlock,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 8,
                        height: "100%",
                        minHeight: 200,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: 16,
                      }}
                    >
                      <div style={{ fontSize: 48 }}>{"\u{1F5FA}\u{FE0F}"}</div>
                      <div
                        style={{
                          fontSize: 13,
                          color: COLORS.textMuted,
                          textAlign: "center",
                        }}
                      >
                        Leaflet renders full GeoJSON
                        <br />
                        with{" "}
                        <span
                          style={{ color: COLORS.orange, fontWeight: 600 }}
                        >
                          EcoHeart orange
                        </span>{" "}
                        styling
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: COLORS.teal,
                          padding: "4px 10px",
                          border: `1px solid ${COLORS.teal}`,
                          borderRadius: 12,
                        }}
                      >
                        L.geoJSON(data).addTo(map)
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    background: COLORS.orangeDim,
                    borderRadius: 6,
                    fontSize: 12,
                    color: COLORS.orange,
                    lineHeight: 1.5,
                  }}
                >
                  {"\u{1F4A1}"} Key pattern: The LLM gets a{" "}
                  <strong>compact attribute summary</strong> (feature count,
                  percentages, stats). The map gets the{" "}
                  <strong>full geometry</strong>. This keeps the LLM context
                  small while rendering all features visually.
                </div>
              </div>
            )}

            {/* Step 4: Final response */}
            {showSummary && (
              <div
                style={{
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.borderActive}`,
                  borderRadius: 10,
                  padding: 16,
                  animation: "fadeSlideIn 0.4s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{"\u{1F5FA}\u{FE0F}"}</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: COLORS.greenMint,
                    }}
                  >
                    Chat response + Map view (split panel)
                  </span>
                </div>
                <div
                  style={{
                    background: COLORS.codeBlock,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    padding: 16,
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: "#E2E8F0",
                    whiteSpace: "pre-wrap",
                    fontFamily: "'DM Sans', sans-serif",
                    maxHeight: 300,
                    overflowY: "auto",
                  }}
                >
                  {typedSummary.split("**").map((part, i) =>
                    i % 2 === 1 ? (
                      <strong key={i} style={{ color: "#02C39A" }}>
                        {part}
                      </strong>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                  <span
                    style={{
                      display: "inline-block",
                      width: 2,
                      height: 16,
                      background: "#02C39A",
                      marginLeft: 2,
                      animation: "blink 1s step-end infinite",
                      verticalAlign: "middle",
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    "Sea Level Rise Response Plan (2019)",
                    "Capital Facilities Plan 2025-2030",
                  ].map((doc) => (
                    <span
                      key={doc}
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        borderRadius: 6,
                        background: COLORS.greenDim,
                        color: "#2D6A4F",
                        border: `1px solid rgba(45,106,79,0.2)`,
                      }}
                    >
                      {"\u{1F4C4}"} {doc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!showToolCall && !showArcGIS && !showGeoJSON && !showSummary && (
              <div
                style={{
                  background: COLORS.surface,
                  border: `1px dashed ${COLORS.border}`,
                  borderRadius: 10,
                  padding: 48,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 36 }}>{"\u{1F446}"}</span>
                <div
                  style={{
                    color: COLORS.textMuted,
                    fontSize: 14,
                    textAlign: "center",
                  }}
                >
                  Click <strong>&quot;Run Pipeline&quot;</strong> to see the
                  full flow from
                  <br />
                  natural language &rarr; ArcGIS query &rarr; map render
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Architecture summary */}
        <div
          style={{
            marginTop: 20,
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: COLORS.text,
              marginBottom: 12,
            }}
          >
            What this means for your Next.js app
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
            }}
          >
            {[
              {
                title: "New tool in tools.ts",
                desc: "arcgis_spatial_query \u2014 the LLM calls this when it detects a spatial/location question. Defined alongside existing web_search and valyu_api tools.",
                color: COLORS.code,
              },
              {
                title: "Server-side fetch in route.ts",
                desc: "Tool execution fetches from public ArcGIS REST endpoints with f=geojson. No proxy, no API key. Returns GeoJSON in the streaming response alongside text.",
                color: COLORS.teal,
              },
              {
                title: "Frontend split-view trigger",
                desc: "chat-interface.tsx detects the spatial payload key in the streamed response \u2192 triggers Leaflet map panel with L.geoJSON(data) + layer controls.",
                color: COLORS.greenMint,
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  padding: 14,
                  background: COLORS.surfaceLight,
                  borderRadius: 8,
                  borderLeft: `3px solid ${item.color}`,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: item.color,
                    marginBottom: 6,
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: COLORS.textMuted,
                    lineHeight: 1.6,
                  }}
                >
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #c1c8c2; border-radius: 3px; }
      `}</style>
    </div>
  );
}
