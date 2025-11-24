# Olympia RAG Setup and Testing Guide

This guide walks through setting up the Olympia RAG infrastructure and testing the ingestion pipeline.

## Prerequisites

1. **AWS CLI** configured with profile `ecoheart`
2. **OpenAI API Key** set as environment variable
3. **Python 3.10+** with pip

## Phase 1: Infrastructure Setup

### Step 1: Create S3 Vector Bucket

Run the setup script to create the bucket:

```bash
cd RAG
bash setup_s3_vectors.sh
```

This will:
- Create `olympia-rag-vectors` bucket in `us-west-2`
- Enable versioning
- Block public access

### Step 2: Create Vector Index (Manual)

**IMPORTANT**: S3 Vector index creation currently requires AWS Console or SDK.

1. Go to AWS S3 Console: https://console.aws.amazon.com/s3/
2. Select bucket `olympia-rag-vectors`
3. Navigate to "Vector indexing" tab
4. Click "Create index"
5. Configure:
   - **Index name**: `olympia-pages-idx`
   - **Dimensions**: `1024`
   - **Distance metric**: `cosine`
   - **Metadata schema**: Allow dynamic fields (we'll use: doc_id, title, page, s3_pdf_key, snippet, image_keys, captions, doc_type, timestamp)

**Alternative**: If you have AWS SDK configured, you can create the index programmatically (see AWS S3 Vectors documentation).

### Step 3: Update IAM Permissions

Apply the IAM policy to your user/role:

```bash
# Review the policy
cat iam-policy-vectors.json

# Apply to your IAM user (replace YOUR_USER_NAME)
aws iam put-user-policy \
  --user-name YOUR_USER_NAME \
  --policy-name OlympiaRAGVectorAccess \
  --policy-document file://iam-policy-vectors.json \
  --profile ecoheart

# OR apply to a role
aws iam put-role-policy \
  --role-name YOUR_ROLE_NAME \
  --policy-name OlympiaRAGVectorAccess \
  --policy-document file://iam-policy-vectors.json \
  --profile ecoheart
```

## Phase 2: Install Python Dependencies

Create a virtual environment and install dependencies:

```bash
cd RAG

# Create virtual environment
python3 -m venv venv

# Activate
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements-rag.txt
```

## Phase 3: Set Environment Variables

Export your OpenAI API key:

```bash
export OPENAI_API_KEY='your-api-key-here'
```

**For persistence**, add to your `~/.zshrc` or `~/.bashrc`:

```bash
echo 'export OPENAI_API_KEY="your-api-key-here"' >> ~/.zshrc
source ~/.zshrc
```

## Phase 4: Test Ingestion on 2 PDFs

Run the ingestion script in test mode:

```bash
# Make sure you're in the RAG directory with venv activated
cd RAG
source venv/bin/activate

# Run test ingestion (2 PDFs, skip captions to save cost)
python ingest_olympia_pdfs.py --test --skip-captions
```

This will:
1. Process 2 test PDFs:
   - Olympia Neighborhood Centers Strategy
   - Olympia Sea Level Rise Response Plan
2. Download PDFs from S3
3. Extract pages with PyMuPDF4LLM
4. Upload page images to S3
5. Build page chunks
6. Generate embeddings with `text-embedding-3-small` (1024 dims)
7. Write vectors to S3 Vectors index

**Expected output**:
```
Processing 2 documents...
==========================================================
Processing: Olympia Neighborhood Centers Strategy
S3 Key: pdfs/Neighborhood-Centers-Report.pdf
==========================================================
  Doc ID: olympia-neighborhood-centers-s
  Downloading pdfs/Neighborhood-Centers-Report.pdf...
  Extracting pages from olympia-neighborhood-centers-s.pdf...
  ✓ Extracted XX pages
  Uploading images to S3...
  ✓ Uploaded XX images
  Skipping image captioning (disabled)
  Processing XX pages...
  ✓ Created XX chunks, wrote XX vectors

... (similar for second PDF)

==========================================================
INGESTION SUMMARY
==========================================================
Documents processed: 2
  Success: 2
  Failed: 0
  Skipped: 0
Total vectors created: XX
==========================================================
```

### Test with Image Captions (Optional)

To test with image captioning (uses GPT-4o, more expensive):

```bash
python ingest_olympia_pdfs.py --test
```

## Phase 5: Test Retrieval

Once ingestion completes, test retrieval:

```bash
# Test with a query
python test_retrieval.py "Which neighborhoods are considered 15-minute neighborhoods in Olympia?"

# OR run predefined test queries
python test_retrieval.py --test-queries
```

**Expected output**:
```
Query: Which neighborhoods are considered 15-minute neighborhoods in Olympia?

Top 5 Results:
================================================================================

1. Score: 0.8432
   Document: Olympia Neighborhood Centers Strategy
   Page: 4
   Doc ID: olympia-neighborhood-centers-s
   S3 PDF: pdfs/Neighborhood-Centers-Report.pdf

   Preview:
   [DOC]: Olympia Neighborhood Centers Strategy
   [DOC_ID]: olympia-neighborhood-centers-s
   [PAGE]: 4
   [TEXT]
   ...15-minute walkable neighborhoods...

   Image Captions:
   - Figure 3: Map showing designated neighborhood centers...
```

## Phase 6: Scale to All PDFs

Once testing validates the pipeline works:

```bash
# Process all 26 PDFs (skip captions to save cost)
python ingest_olympia_pdfs.py --skip-captions

# OR process with captions (more expensive but better quality)
python ingest_olympia_pdfs.py

# OR process specific documents
python ingest_olympia_pdfs.py --docs "Climate Risk and Vulnerability Assessment" "Housing Action Plan"

# OR limit to first N documents
python ingest_olympia_pdfs.py --limit 5
```

## Troubleshooting

### "Error: Inventory file not found"
- Make sure you've run `download_olympia_pdfs.py` and have `inventory.json` in the RAG directory
- Or copy it from `/Users/ahmedkhan/ecoheart/olympia-rag/inventory.json`

### "Error: OPENAI_API_KEY environment variable not set"
- Export the key: `export OPENAI_API_KEY='your-key'`
- Verify: `echo $OPENAI_API_KEY`

### "Error: AWS credentials not found"
- Verify profile: `aws configure list --profile ecoheart`
- Test S3 access: `aws s3 ls s3://olympia-plans-raw/ --profile ecoheart`

### "Error: Bucket 'olympia-rag-vectors' does not exist"
- Run `bash setup_s3_vectors.sh` to create the bucket

### "ModuleNotFoundError: No module named 'pymupdf4llm'"
- Install dependencies: `pip install -r requirements-rag.txt`
- Make sure venv is activated

### Vectors not appearing in searches
- Verify vector index was created in AWS Console
- Check S3 bucket `olympia-rag-vectors` has files in `vectors/olympia-pages-idx/`
- Verify IAM permissions include `s3vectors:*` actions

## Cost Estimation

### Embeddings (text-embedding-3-small)
- **Cost**: $0.02 per 1M tokens
- **Average**: ~500 tokens per page
- **26 PDFs** (~400 pages total): ~$0.004 (less than a penny)

### Image Captioning (GPT-4o)
- **Cost**: ~$0.005 per image
- **Estimate**: ~50 images across all PDFs: ~$0.25

### S3 Storage
- **Vectors**: ~4KB per vector × 400 pages = ~1.6MB
- **Images**: ~100KB per image × 50 images = ~5MB
- **S3 cost**: Negligible (< $0.01/month)

**Total estimated cost for full ingestion**: **< $0.30**

## Next Steps

After successful testing:
1. Review retrieval results quality
2. Adjust chunking strategy if needed
3. Run full ingestion on all 26 PDFs
4. Integrate with Vercel API endpoint
5. Build frontend for Olympia RAG queries

