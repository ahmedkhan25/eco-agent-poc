import { OpenAI } from "openai";
import { S3VectorsClient, QueryVectorsCommand } from "@aws-sdk/client-s3vectors";

// Searches a client's indexed documents and returns quotes with citations, so the
// ROI Advisor can propose local values with sources. Olympia is the only index so far
// (the same S3 Vectors index as the Olympia agent, /api/eco-rag). Gated by src/middleware.ts.

export const maxDuration = 30;

const INDEXES: Record<string, { bucket: string; index: string; region: string; label: string }> = {
  olympia: { bucket: "olympia-rag-vectors", index: "olympia-pages-idx", region: "us-west-2", label: "Olympia, WA planning and budget documents" },
};

export async function POST(req: Request) {
  const { index, question, topK = 6 } = (await req.json().catch(() => ({}))) as { index?: string; question?: string; topK?: number };
  const cfg = INDEXES[String(index ?? "").toLowerCase()];
  if (!cfg) return Response.json({ error: `No document index for this client yet. Indexed: ${Object.keys(INDEXES).join(", ")}` }, { status: 404 });
  if (!question?.trim()) return Response.json({ error: "Ask a question" }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) return Response.json({ error: "Document search needs OPENAI_API_KEY for embeddings" }, { status: 503 });
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const emb = await openai.embeddings.create({ model: "text-embedding-3-small", input: question, dimensions: 1024 });
    const s3 = new S3VectorsClient({ region: cfg.region });
    const res = await s3.send(
      new QueryVectorsCommand({
        vectorBucketName: cfg.bucket,
        indexName: cfg.index,
        queryVector: { float32: emb.data[0].embedding },
        topK: Math.min(10, Math.max(1, Number(topK) || 6)),
        returnDistance: true,
        returnMetadata: true,
      })
    );
    const quotes = (res.vectors ?? []).map((v) => {
      const m = (v.metadata ?? {}) as Record<string, unknown>;
      return { document: String(m.title ?? "Unknown document"), page: m.page ?? null, quote: String(m.snippet ?? "").slice(0, 900), distance: v.distance };
    });
    return Response.json({ collection: cfg.label, question, quotes });
  } catch (e) {
    return Response.json({ error: `Document search failed: ${(e as Error).message}` }, { status: 502 });
  }
}
