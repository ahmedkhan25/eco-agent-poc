import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: prompt,
    });

    // Extract image from response
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      return NextResponse.json(
        { error: "No response from image model" },
        { status: 500 }
      );
    }

    for (const part of parts) {
      if (part.inlineData) {
        return NextResponse.json({
          image: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/png",
        });
      }
    }

    return NextResponse.json(
      { error: "No image was generated" },
      { status: 500 }
    );
  } catch (err) {
    console.error("[illustrate]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Image generation failed" },
      { status: 500 }
    );
  }
}
