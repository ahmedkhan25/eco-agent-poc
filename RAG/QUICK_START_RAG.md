# Eco-RAG Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Configure AWS Credentials

Run the setup script to export AWS credentials to `.env.local`:

```bash
cd /Users/ahmedkhan/Repos/eco-agent/eco-agent-poc
./RAG/setup-aws-credentials.sh ecoheart
```

This will:
- Extract credentials from your AWS profile
- Update `.env.local` with AWS credentials
- Create a backup of your existing `.env.local`

### Step 2: Add OpenAI API Key

Make sure your `.env.local` includes your OpenAI API key:

```bash
# If not already set, add it:
echo "OPENAI_API_KEY=sk-your-key-here" >> .env.local
```

### Step 3: Start the Development Server

```bash
npm run dev
```

## ✅ Test the RAG Endpoint

### Option 1: Web Interface (Easiest)

Open your browser to:
```
http://localhost:3000/eco-rag-test
```

Try example queries like:
- "What are the neighborhood centers in Olympia?"
- "What is Olympia's approach to climate change?"
- "Tell me about sea level rise planning"

### Option 2: Command Line Test

Run the automated test script:

```bash
./RAG/test-rag-endpoint.sh
```

This will run multiple tests including health checks and sample queries.

### Option 3: Manual curl Test

```bash
# Health check
curl http://localhost:3000/api/eco-rag | jq

# Query
curl -X POST http://localhost:3000/api/eco-rag \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the neighborhood centers in Olympia?",
    "topK": 5
  }' | jq
```

## 📊 Check Ingestion Status

See how many documents have been ingested:

```bash
cat RAG/ingestion_progress.json
```

Expected output:
```json
{
  "last_completed_doc": "Housing-Action-Plan.pdf",
  "completed_docs": [...],
  "total_vectors": 1234,
  "started_at": "2025-11-23T22:16:25.692782Z",
  "updated_at": "2025-11-23T23:45:00.000000Z"
}
```

## 🔍 Troubleshooting

### "Cannot find module 'openai'"

Install the OpenAI package:
```bash
npm install --save openai --legacy-peer-deps
```

### "Missing OPENAI_API_KEY"

Add it to `.env.local`:
```bash
echo "OPENAI_API_KEY=sk-your-key-here" >> .env.local
```

### AWS Credentials Error

Re-run the setup script:
```bash
./RAG/setup-aws-credentials.sh ecoheart
```

### No Results Found

Check ingestion status:
```bash
cat RAG/ingestion_progress.json
```

If no documents are ingested, run:
```bash
cd RAG
python full_ingestion.py
```

## 📁 Files Overview

```
RAG/
├── ECO_RAG_API_README.md          # Full API documentation
├── QUICK_START_RAG.md             # This file
├── setup-aws-credentials.sh       # AWS credentials setup script
├── test-rag-endpoint.sh           # Automated test script
├── full_ingestion.py              # Document ingestion script
├── test_query.py                  # Direct S3 Vector test
├── ingestion_progress.json        # Ingestion status
└── inventory.json                 # Document inventory

src/app/
├── api/eco-rag/route.ts           # RAG API endpoint
└── eco-rag-test/page.tsx          # Test UI page
```

## 🎯 Next Steps

1. **Test with Different Queries**: Try various questions about Olympia planning
2. **Monitor Performance**: Check processing times in the response
3. **Explore Sources**: Review which documents are being cited
4. **Customize System Prompt**: Edit `src/app/api/eco-rag/route.ts` to adjust AI behavior

## 📚 Full Documentation

For complete API documentation, see:
- `RAG/ECO_RAG_API_README.md` - Full API reference
- `RAG/README.md` - RAG system overview
- `RAG/SETUP_GUIDE.md` - Detailed setup instructions

## 💡 Example Queries

Here are some great questions to test:

**Planning & Development:**
- "What are the key components of the comprehensive plan?"
- "Tell me about the neighborhood centers strategy"
- "What zoning changes are planned?"

**Climate & Environment:**
- "What is Olympia's greenhouse gas inventory showing?"
- "How is the city preparing for sea level rise?"
- "What are the climate risk vulnerabilities?"

**Infrastructure:**
- "What are the major transportation projects?"
- "Tell me about the water system plan"
- "How does stormwater management work?"

**Budget & Finance:**
- "What is the 2025 budget focused on?"
- "What are the capital facilities priorities?"
- "Show me the long-range financial projections"

**Community Services:**
- "What is the housing action plan?"
- "Tell me about parks and recreation planning"
- "What are the urban forestry goals?"

## 🔥 Pro Tips

1. **Be Specific**: More detailed questions get better answers
2. **Check Sources**: Always review the cited documents and page numbers
3. **Adjust topK**: Use fewer results (topK=3) for faster responses
4. **Follow Up**: Build on previous queries for deeper insights

---

**Need Help?** Check the full documentation in `ECO_RAG_API_README.md` or review the code in `src/app/api/eco-rag/route.ts`.

