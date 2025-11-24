# Olympia Eco-RAG API

## Overview

The Eco-RAG (Retrieval-Augmented Generation) API provides semantic search and question-answering capabilities over the City of Olympia's planning and policy documents.

## Architecture

```
User Query → OpenAI Embedding → S3 Vector Search → Context Building → GPT-4o → Answer + Citations
```

### Components

1. **Embedding Generation**: Uses OpenAI `text-embedding-3-small` (1024 dimensions)
2. **Vector Storage**: AWS S3 Vectors index (`olympia-pages-idx`)
3. **Answer Generation**: GPT-4o with custom system prompt for Olympia planning
4. **Frontend**: React test interface at `/eco-rag-test`

## API Endpoints

### POST /api/eco-rag

Query the RAG system with a natural language question.

**Request:**
```json
{
  "query": "What are the neighborhood centers in Olympia?",
  "topK": 5
}
```

**Response:**
```json
{
  "answer": "Based on the Olympia Neighborhood Centers Strategy document...",
  "sources": [
    {
      "doc_id": "neighborhood-centers-report",
      "title": "Olympia Neighborhood Centers Strategy",
      "page": 12,
      "s3_pdf_key": "pdfs/Neighborhood-Centers-Report.pdf",
      "distance": 0.1234
    }
  ],
  "query": "What are the neighborhood centers in Olympia?",
  "processingTimeMs": 1234
}
```

**Parameters:**
- `query` (required): Natural language question about Olympia planning
- `topK` (optional, default: 5): Number of relevant document chunks to retrieve

### GET /api/eco-rag

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "Olympia Eco-RAG",
  "version": "1.0.0",
  "config": {
    "vectorBucket": "olympia-rag-vectors",
    "indexName": "olympia-pages-idx",
    "embeddingModel": "text-embedding-3-small",
    "embeddingDimensions": 1024
  }
}
```

## Environment Setup

### Required Environment Variables

Add these to your `.env.local`:

```bash
# OpenAI API Key (required)
OPENAI_API_KEY=sk-...

# AWS Credentials (required for S3 Vectors access)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_SESSION_TOKEN=...  # Optional, if using temporary credentials
AWS_REGION=us-west-2
```

### Getting AWS Credentials

If you're using the `ecoheart` AWS profile:

```bash
# Export credentials from your AWS profile
export AWS_ACCESS_KEY_ID=$(aws configure get aws_access_key_id --profile ecoheart)
export AWS_SECRET_ACCESS_KEY=$(aws configure get aws_secret_access_key --profile ecoheart)
export AWS_REGION=us-west-2
```

Or add them directly to `.env.local`.

## Testing the RAG Endpoint

### 1. Using the Web Interface

Navigate to: `http://localhost:3000/eco-rag-test`

This provides a user-friendly interface with:
- Query input with example questions
- Real-time answer generation
- Source citations with page numbers
- Performance metrics

### 2. Using curl

```bash
# Health check
curl http://localhost:3000/api/eco-rag

# Query
curl -X POST http://localhost:3000/api/eco-rag \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the neighborhood centers in Olympia?",
    "topK": 5
  }'
```

### 3. Using the Python Test Script

The Python test script in `RAG/test_query.py` queries the S3 Vector index directly:

```bash
cd RAG
export OPENAI_API_KEY=sk-...
python test_query.py
```

## Document Coverage

The RAG system includes 26 official Olympia city documents:

- **Planning**: Comprehensive Plans, Neighborhood Centers Strategy
- **Environment**: Climate Risk Assessment, Sea Level Rise Plan, Greenhouse Gas Inventory
- **Budget**: Annual Reports, Capital Facilities Plans, Financial Projections
- **Infrastructure**: Water System Plan, Stormwater Management, Transportation Master Plan
- **Community**: Housing Action Plan, Parks & Recreation Plan, Urban Forestry Manual
- **Safety**: Emergency Management Plan, Hazard Mitigation Plan, Street Safety Plan

Full inventory available in `RAG/inventory.json`.

## Ingestion Status

Check `RAG/ingestion_progress.json` for current ingestion status:

```bash
cat RAG/ingestion_progress.json
```

## Example Queries

Try these questions:

1. "What are the neighborhood centers in Olympia?"
2. "What is Olympia's approach to climate change?"
3. "Tell me about Olympia's sea level rise planning"
4. "What are the major transportation projects planned?"
5. "What is the city's budget for 2025?"
6. "How does Olympia manage stormwater?"
7. "What is the housing action plan focused on?"
8. "Tell me about Olympia's urban forestry initiatives"

## Performance

Typical query performance:
- Embedding generation: ~100-200ms
- Vector search: ~50-100ms
- Answer generation: ~1-3 seconds
- **Total**: ~1.5-3.5 seconds

## Troubleshooting

### "Missing OPENAI_API_KEY" Error

Make sure `OPENAI_API_KEY` is set in `.env.local`.

### AWS Credentials Error

1. Verify AWS credentials are set in environment
2. Ensure you have access to the `olympia-rag-vectors` bucket
3. Check that the S3 Vectors service is available in `us-west-2`

### No Results Found

1. Check if vector ingestion is complete: `cat RAG/ingestion_progress.json`
2. Verify the S3 Vector index exists: `aws s3vectors list-indexes --vector-bucket-name olympia-rag-vectors --region us-west-2 --profile ecoheart`
3. Try a different query or broader search terms

### Slow Response Times

1. Reduce `topK` parameter (try 3 instead of 5)
2. Check network latency to AWS S3
3. Monitor OpenAI API response times

## Development

### Modifying the System Prompt

Edit the `systemPrompt` in `src/app/api/eco-rag/route.ts` to change how the AI responds.

### Adjusting Retrieval

- Increase/decrease `topK` for more/fewer source documents
- Modify the embedding model (requires re-ingestion)
- Adjust GPT-4o temperature for more creative/factual responses

### Adding More Documents

1. Update `RAG/inventory.json` with new document metadata
2. Run `RAG/full_ingestion.py` to ingest new documents
3. Monitor `RAG/ingestion_progress.json` for progress

## Next Steps

- [ ] Add document download/preview functionality
- [ ] Implement query caching for common questions
- [ ] Add conversation memory for follow-up questions
- [ ] Create document chunking visualization
- [ ] Build analytics dashboard for query patterns

