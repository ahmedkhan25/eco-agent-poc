# Olympia RAG Pipeline

Retrieval-Augmented Generation (RAG) system for Olympia city planning documents.

## Overview

This pipeline:
1. **Downloads** 26 planning PDFs from S3
2. **Extracts** pages with text and images using PyMuPDF4LLM
3. **Captions** images using GPT-4o vision (optional)
4. **Embeds** page chunks using OpenAI `text-embedding-3-small` (1024 dims)
5. **Indexes** vectors in S3 Vectors for semantic search
6. **Retrieves** relevant content for RAG queries

## Quick Start

### 1. Setup Infrastructure

```bash
# Create S3 vector bucket
bash setup_s3_vectors.sh

# Then manually create vector index in AWS Console
# See SETUP_GUIDE.md for details
```

### 2. Install Dependencies

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-rag.txt
```

### 3. Set API Key

```bash
export OPENAI_API_KEY='your-api-key'
```

### 4. Run Test Ingestion

```bash
# Test on 2 PDFs (skip captions to save cost)
python ingest_olympia_pdfs.py --test --skip-captions
```

### 5. Test Retrieval

```bash
python test_retrieval.py "What are Olympia's climate plans?"
```

### 6. Scale to All PDFs

```bash
python ingest_olympia_pdfs.py --skip-captions
```

## Files

### Scripts

- **`ingest_olympia_pdfs.py`** - Main ingestion pipeline
- **`test_retrieval.py`** - Test vector search
- **`download_olympia_pdfs.py`** - Download PDFs from web (already run)
- **`upload_to_s3.py`** - Upload PDFs to S3 (already run)
- **`cleanup_s3.py`** - Clean S3 buckets
- **`setup_s3_vectors.sh`** - Create S3 vector bucket

### Configuration

- **`requirements-rag.txt`** - Python dependencies
- **`iam-policy-vectors.json`** - IAM policy for S3 Vectors
- **`inventory.json`** - Metadata for all 26 PDFs (from download step)

### Documentation

- **`SETUP_GUIDE.md`** - Detailed setup and testing guide
- **`olympia-workflow.md`** - PDF download workflow
- **`Olympia-RAG-Readme.md`** - S3 bucket configuration

## Architecture

### Embedding Model
- **Model**: `text-embedding-3-small`
- **Dimensions**: 1024
- **Cost**: $0.02 per 1M tokens (~$0.004 for all 26 PDFs)

### Vector Storage
- **Bucket**: `olympia-rag-vectors`
- **Index**: `olympia-pages-idx`
- **Distance**: Cosine similarity

### Source Data
- **Bucket**: `olympia-plans-raw`
- **PDFs**: 26 planning documents (~400 pages)
- **Images**: Extracted and stored in `page-images/`

## Usage Examples

### Ingest specific documents

```bash
python ingest_olympia_pdfs.py --docs "Climate Risk and Vulnerability Assessment"
```

### Ingest with image captions

```bash
python ingest_olympia_pdfs.py --test  # No --skip-captions flag
```

### Limit to first N documents

```bash
python ingest_olympia_pdfs.py --limit 5
```

### Test retrieval with custom query

```bash
python test_retrieval.py "What is the sea level rise plan?" --top-k 10
```

### Run predefined test queries

```bash
python test_retrieval.py --test-queries
```

## Troubleshooting

See **SETUP_GUIDE.md** for detailed troubleshooting.

Common issues:
- Missing `inventory.json`: Copy from `/Users/ahmedkhan/ecoheart/olympia-rag/`
- Missing API key: `export OPENAI_API_KEY='your-key'`
- AWS credentials: `aws configure --profile ecoheart`
- Python dependencies: `pip install -r requirements-rag.txt`

## Next Steps

After successful testing:
1. Review retrieval quality
2. Run full ingestion on all 26 PDFs
3. Integrate with Vercel API endpoint (`/api/olympia-rag`)
4. Build frontend UI for queries
5. Add monitoring and logging

## Cost Estimation

- **Embeddings**: < $0.01
- **Image captions** (optional): ~$0.25
- **S3 storage**: < $0.01/month
- **Total**: < $0.30 for complete ingestion

