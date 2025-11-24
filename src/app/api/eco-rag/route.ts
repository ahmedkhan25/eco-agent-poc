import { OpenAI } from 'openai';
import { S3VectorsClient, QueryVectorsCommand } from "@aws-sdk/client-s3vectors";
import * as db from '@/lib/db';

// Configuration
const VECTOR_BUCKET = "olympia-rag-vectors";
const INDEX_NAME = "olympia-pages-idx";
const REGION = "us-west-2";
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1024;

// 30 seconds max
export const maxDuration = 30;

interface QueryRequest {
  query: string;
  topK?: number;
  sessionId?: string; // NEW: For context storage
}

interface VectorResult {
  key: string;
  distance: number;
  metadata?: {
    doc_id?: string;
    title?: string;
    page?: number;
    snippet?: string;
    s3_pdf_key?: string;
    doc_type?: string;
    timestamp?: string;
  };
}

interface RAGResponse {
  context_id: string;         // NEW: Reference to stored context
  compressed_summary: string; // NEW: Compressed context
  sources: Array<{
    doc_id: string;
    title: string;
    page: number;
    s3_pdf_key?: string;
    distance: number;
  }>;
  query: string;
  processingTimeMs: number;
  tokenCount?: number;        // NEW: Track compression size
}

/**
 * Generate embedding for query text using OpenAI
 */
async function generateQueryEmbedding(openai: OpenAI, query: string): Promise<number[]> {
  console.log('[Eco-RAG] Generating embedding for query:', query);
  
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: query,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  console.log('[Eco-RAG] ✓ Generated', response.data[0].embedding.length, 'dimensional embedding');
  return response.data[0].embedding;
}

/**
 * Query S3 Vectors index
 */
async function queryVectors(
  s3vectors: S3VectorsClient,
  queryEmbedding: number[],
  topK: number = 5
): Promise<VectorResult[]> {
  console.log('[Eco-RAG] Querying S3 Vectors index...');
  console.log('[Eco-RAG]   Bucket:', VECTOR_BUCKET);
  console.log('[Eco-RAG]   Index:', INDEX_NAME);
  console.log('[Eco-RAG]   Top K:', topK);

  const command = new QueryVectorsCommand({
    vectorBucketName: VECTOR_BUCKET,
    indexName: INDEX_NAME,
    queryVector: {
      float32: queryEmbedding,
    },
    topK,
    returnDistance: true,
    returnMetadata: true,
  });

  const response = await s3vectors.send(command);
  
  console.log('[Eco-RAG] ✓ Found', response.vectors?.length || 0, 'results');
  
  return (response.vectors || []).map(vec => ({
    key: vec.key!,
    distance: vec.distance!,
    metadata: vec.metadata as any,
  }));
}

/**
 * Build context from vector results
 */
function buildContext(results: VectorResult[]): string {
  let context = '';
  
  results.forEach((result, index) => {
    const meta = result.metadata || {};
    context += `\n\n--- Source ${index + 1} ---\n`;
    context += `Document: ${meta.title || 'Unknown'}\n`;
    context += `Page: ${meta.page || 'Unknown'}\n`;
    context += `Distance: ${result.distance.toFixed(4)}\n`;
    context += `Content:\n${meta.snippet || 'No content available'}\n`;
  });
  
  return context;
}

/**
 * Compress retrieved context using GPT-4o-mini
 * Budget: max 800 tokens output
 */
async function compressContext(
  openai: OpenAI,
  query: string,
  results: VectorResult[]
): Promise<{ summary: string; tokenCount: number }> {
  console.log('[Eco-RAG] Compressing context with GPT-4o-mini...');
  
  const rawContext = buildContext(results);
  
  const systemPrompt = `You are a context compression assistant. Your job is to take long document excerpts and compress them into concise, fact-dense summaries (max 800 tokens).

Rules:
1. Preserve all key facts, numbers, dates, and policy decisions
2. Keep document citations (titles and page numbers)
3. Remove redundancy and verbose explanations
4. Output ONLY the compressed facts, no meta-commentary
5. Stay under 800 tokens`;

  const userPrompt = `Compress this context for the query: "${query}"

RAW CONTEXT:
${rawContext}

COMPRESSED SUMMARY (max 800 tokens):`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 900, // Slightly higher to allow completion
  });

  const summary = completion.choices[0].message.content || "";
  const tokenCount = completion.usage?.completion_tokens || 0;
  
  console.log(`[Eco-RAG] ✓ Compressed to ${tokenCount} tokens`);
  
  return { summary, tokenCount };
}

/**
 * Generate answer using GPT-4o with RAG context
 * NOTE: This function is now replaced by compressContext for the main flow
 * Kept for potential future use or optional detailed generation
 */
async function generateAnswer(
  openai: OpenAI,
  query: string,
  context: string
): Promise<string> {
  console.log('[Eco-RAG] Generating answer with GPT-4o...');
  
  const systemPrompt = `You are an expert assistant for the City of Olympia, Washington, specializing in city planning, environmental initiatives, infrastructure, and municipal operations.

You have access to official city documents including comprehensive plans, budget reports, climate action plans, transportation plans, and more.

When answering questions:
1. Base your answers ONLY on the provided context from city documents
2. Cite specific documents and page numbers when possible
3. If the context doesn't contain enough information, acknowledge what's missing
4. Be precise and factual
5. Structure your response clearly with relevant sections
6. Highlight key statistics, dates, and policy decisions

Always maintain a professional, helpful tone while providing accurate information about Olympia's planning and operations.`;

  const userPrompt = `Based on the following context from Olympia city planning documents, please answer this question:

QUESTION: ${query}

CONTEXT FROM CITY DOCUMENTS:
${context}

Please provide a comprehensive answer based on the context above. Cite specific documents and page numbers where relevant.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3, // Lower temperature for more factual responses
    max_tokens: 2000,
  });

  const answer = completion.choices[0].message.content || "I couldn't generate an answer.";
  console.log('[Eco-RAG] ✓ Generated answer');
  
  return answer;
}

/**
 * POST /api/eco-rag
 * RAG query endpoint for Olympia city planning documents
 */
export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    console.log('[Eco-RAG] ========== NEW RAG QUERY ==========');
    
    // Parse request
    const body: QueryRequest = await req.json();
    const { query, topK = 5, sessionId } = body;

    if (!query || query.trim().length === 0) {
      return Response.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    console.log('[Eco-RAG] Query:', query);
    console.log('[Eco-RAG] Top K:', topK);

    // Check for required API keys
    if (!process.env.OPENAI_API_KEY) {
      console.error('[Eco-RAG] Missing OPENAI_API_KEY');
      return Response.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Initialize clients
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize S3 Vectors client
    // Uses AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_SESSION_TOKEN from environment
    const s3vectors = new S3VectorsClient({
      region: REGION,
    });

    // Step 1: Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(openai, query);

    // Step 2: Query vector index
    const results = await queryVectors(s3vectors, queryEmbedding, topK);

    if (results.length === 0) {
      console.log('[Eco-RAG] No results found');
      const contextId = `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return Response.json({
        context_id: contextId,
        compressed_summary: "I couldn't find any relevant information in the Olympia city planning documents for your query. Please try rephrasing your question or asking about a different topic.",
        sources: [],
        query,
        processingTimeMs: Date.now() - startTime,
        tokenCount: 0,
      } as RAGResponse);
    }

    // Step 3: Compress context using GPT-4o-mini (instead of generating full answer)
    const { summary, tokenCount } = await compressContext(openai, query, results);

    // Step 4: Format sources for citation system
    const sources = results.map((result, index) => ({
      doc_id: result.metadata?.doc_id || 'unknown',
      title: result.metadata?.title || 'Unknown Document',
      page: result.metadata?.page || 0,
      s3_pdf_key: result.metadata?.s3_pdf_key,
      distance: result.distance,
      // Add URL for citations - using S3 bucket URL with PDF key
      url: result.metadata?.s3_pdf_key 
        ? `https://olympia-plans-raw.s3.us-west-2.amazonaws.com/${result.metadata.s3_pdf_key}#page=${result.metadata.page || 1}`
        : `#source-${index + 1}`,
      // Add content/description for citation preview
      content: result.metadata?.snippet || '',
      description: `${result.metadata?.title} - Page ${result.metadata?.page}`,
      source: 'City of Olympia Official Documents',
      relevanceScore: 1 - result.distance, // Convert distance to relevance (0-1)
      toolType: 'olympia' as const, // Tool type for citation rendering
    }));

    const processingTimeMs = Date.now() - startTime;

    // Step 5: Generate context_id and store full context in database
    const contextId = `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store full context in DB if sessionId provided
    if (sessionId) {
      try {
        const rawContext = buildContext(results);
        await db.createRagContext({
          id: contextId,
          sessionId,
          query,
          fullContext: { results, rawContext },
          compressedSummary: summary,
          sources,
          tokenCount,
        });
        console.log('[Eco-RAG] ✓ Stored context in database:', contextId);
      } catch (error) {
        console.error('[Eco-RAG] Failed to store context in database:', error);
        // Continue even if storage fails - don't block the response
      }
    }

    console.log('[Eco-RAG] ✓ Query completed in', processingTimeMs, 'ms');

    return Response.json({
      context_id: contextId,
      compressed_summary: summary,
      sources,
      query,
      processingTimeMs,
      tokenCount,
    } as RAGResponse);

  } catch (error) {
    console.error('[Eco-RAG] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return Response.json(
      {
        error: 'RAG query failed',
        details: errorMessage,
        processingTimeMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/eco-rag
 * Health check endpoint
 */
export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'Olympia Eco-RAG',
    version: '1.0.0',
    config: {
      vectorBucket: VECTOR_BUCKET,
      indexName: INDEX_NAME,
      embeddingModel: EMBEDDING_MODEL,
      embeddingDimensions: EMBEDDING_DIMENSIONS,
    },
  });
}

