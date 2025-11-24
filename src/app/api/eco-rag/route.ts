import { OpenAI } from 'openai';
import { S3VectorsClient, QueryVectorsCommand } from "@aws-sdk/client-s3vectors";

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
  answer: string;
  sources: Array<{
    doc_id: string;
    title: string;
    page: number;
    s3_pdf_key?: string;
    distance: number;
  }>;
  query: string;
  processingTimeMs: number;
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
 * Generate answer using GPT-4o with RAG context
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
    const { query, topK = 5 } = body;

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
      return Response.json({
        answer: "I couldn't find any relevant information in the Olympia city planning documents for your query. Please try rephrasing your question or asking about a different topic.",
        sources: [],
        query,
        processingTimeMs: Date.now() - startTime,
      } as RAGResponse);
    }

    // Step 3: Build context from results
    const context = buildContext(results);

    // Step 4: Generate answer with GPT-4o
    const answer = await generateAnswer(openai, query, context);

    // Step 5: Format sources
    const sources = results.map(result => ({
      doc_id: result.metadata?.doc_id || 'unknown',
      title: result.metadata?.title || 'Unknown Document',
      page: result.metadata?.page || 0,
      s3_pdf_key: result.metadata?.s3_pdf_key,
      distance: result.distance,
    }));

    const processingTimeMs = Date.now() - startTime;
    console.log('[Eco-RAG] ✓ Query completed in', processingTimeMs, 'ms');

    return Response.json({
      answer,
      sources,
      query,
      processingTimeMs,
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

