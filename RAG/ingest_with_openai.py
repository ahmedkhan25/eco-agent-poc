#!/usr/bin/env python3
"""
Proper ingestion using OpenAI text-embedding-3-small model
"""

import os
import sys
import json
import boto3
from pathlib import Path
from datetime import datetime
import pymupdf4llm
from openai import OpenAI

# --- Configuration ---
S3_SOURCE_BUCKET = "olympia-plans-raw"
S3_VECTOR_BUCKET = "olympia-rag-vectors"
VECTOR_INDEX_NAME = "olympia-pages-idx"
REGION = "us-west-2"
AWS_PROFILE = "ecoheart"
LOCAL_WORK_DIR = "work"
LOCAL_PDF_DIR = os.path.join(LOCAL_WORK_DIR, "pdfs")
INVENTORY_FILE = "inventory.json"

# OpenAI Embedding Model - AS SPECIFIED IN THE PLAN
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1024

# Test with first document, 25 pages
TEST_PDF = "Olympia Neighborhood Centers Strategy"
MAX_PAGES = 25

def init_clients():
    """Initialize AWS and OpenAI clients"""
    # Check for OpenAI API key
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("✗ Error: OPENAI_API_KEY environment variable not set")
        sys.exit(1)
    
    session = boto3.Session(profile_name=AWS_PROFILE, region_name=REGION)
    s3_client = session.client('s3')
    s3vectors_client = session.client('s3vectors')
    openai_client = OpenAI(api_key=api_key)
    
    return s3_client, s3vectors_client, openai_client

def load_inventory():
    """Load inventory file"""
    with open(INVENTORY_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def download_pdf_from_s3(s3_client, s3_key, local_path):
    """Download PDF from S3"""
    print(f"  Downloading {os.path.basename(s3_key)}...")
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    s3_client.download_file(S3_SOURCE_BUCKET, s3_key, str(local_path))
    print(f"  ✓ Downloaded")

def process_pdf_with_pymupdf(local_pdf_path):
    """Process PDF with PyMuPDF4LLM to get page chunks"""
    print(f"  Extracting pages from {os.path.basename(local_pdf_path)}...")
    
    pages = pymupdf4llm.to_markdown(
        str(local_pdf_path),
        page_chunks=True,
        write_images=False,
        ignore_images=True
    )
    
    print(f"  ✓ Extracted {len(pages)} pages")
    return pages

def generate_embedding(openai_client, text):
    """Generate OpenAI embedding"""
    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
        dimensions=EMBEDDING_DIMENSIONS
    )
    return response.data[0].embedding

def write_vectors_batch(s3vectors_client, vectors_batch):
    """Write batch of vectors to S3 Vectors using correct API format"""
    if not vectors_batch:
        return 0
    
    # Prepare vectors with correct format: key, data, metadata
    vectors_to_write = []
    for vec_data in vectors_batch:
        vectors_to_write.append({
            'key': vec_data['key'],
            'data': {'float32': vec_data['embedding']},  # VectorData format with float32
            'metadata': vec_data['metadata']
        })
    
    # Write to S3 Vectors
    try:
        response = s3vectors_client.put_vectors(
            vectorBucketName=S3_VECTOR_BUCKET,
            indexName=VECTOR_INDEX_NAME,
            vectors=vectors_to_write
        )
        return len(vectors_batch)
    except Exception as e:
        print(f"  ✗ Error writing vectors: {e}")
        return 0

def process_document(s3_client, s3vectors_client, openai_client, doc_item, max_pages=MAX_PAGES):
    """Process a single document"""
    title = doc_item['excel_title']
    s3_key = doc_item['s3_key']
    local_filename = doc_item['local_filename']
    
    print(f"\n{'='*60}")
    print(f"Processing: {title}")
    print(f"S3 Key: {s3_key}")
    print(f"Max Pages: {max_pages}")
    print(f"{'='*60}")
    
    # Create doc_id from filename
    doc_id = Path(local_filename).stem.lower().replace(' ', '-')
    
    # Download PDF
    local_pdf_path = Path(LOCAL_PDF_DIR) / local_filename
    if not local_pdf_path.exists():
        download_pdf_from_s3(s3_client, s3_key, local_pdf_path)
    else:
        print(f"  ✓ PDF already downloaded")
    
    # Extract pages
    pages = process_pdf_with_pymupdf(local_pdf_path)
    
    # Limit to max_pages
    pages_to_process = pages[:max_pages]
    print(f"  Processing {len(pages_to_process)} pages (of {len(pages)} total)...")
    
    # Process pages in batches
    vectors_batch = []
    batch_size = 10
    total_vectors = 0
    
    for idx, page_data in enumerate(pages_to_process, 1):
        page_num = page_data.get('metadata', {}).get('page', idx - 1) + 1
        page_text = page_data.get('text', '')
        
        if not page_text.strip():
            continue
        
        # Build page chunk text
        chunk_text = f"""[DOC]: {title}
[DOC_ID]: {doc_id}
[PAGE]: {page_num}

[TEXT]
{page_text}
"""
        
        # Generate embedding with OpenAI
        try:
            embedding = generate_embedding(openai_client, chunk_text)
            
            # Prepare vector data
            vector_key = f"{doc_id}:page-{page_num}"
            metadata = {
                'doc_id': doc_id,
                'title': title,
                'page': page_num,
                's3_pdf_key': s3_key,
                'snippet': chunk_text[:500],
                'doc_type': 'planning_document',
                'chunk_id': vector_key,
                'ingested_at': datetime.utcnow().isoformat() + 'Z'
            }
            
            vectors_batch.append({
                'key': vector_key,
                'embedding': embedding,
                'metadata': metadata
            })
            
            # Write batch when it reaches batch_size
            if len(vectors_batch) >= batch_size:
                written = write_vectors_batch(s3vectors_client, vectors_batch)
                total_vectors += written
                print(f"  ✓ Wrote batch of {written} vectors (total: {total_vectors})")
                vectors_batch = []
            
        except Exception as e:
            print(f"  ! Error processing page {page_num}: {e}")
            continue
    
    # Write remaining vectors
    if vectors_batch:
        written = write_vectors_batch(s3vectors_client, vectors_batch)
        total_vectors += written
        print(f"  ✓ Wrote final batch of {written} vectors (total: {total_vectors})")
    
    print(f"\n✓ Successfully processed '{title}'")
    print(f"  Pages processed: {len(pages_to_process)}")
    print(f"  Vectors created: {total_vectors}")
    
    return total_vectors

def main():
    """Main ingestion function"""
    print("=" * 60)
    print("Olympia RAG - OpenAI Embedding Ingestion (25 pages)")
    print(f"Model: {EMBEDDING_MODEL}")
    print(f"Dimensions: {EMBEDDING_DIMENSIONS}")
    print("=" * 60)
    
    # Create work directories
    os.makedirs(LOCAL_WORK_DIR, exist_ok=True)
    os.makedirs(LOCAL_PDF_DIR, exist_ok=True)
    
    # Initialize clients
    print("\nInitializing clients...")
    s3_client, s3vectors_client, openai_client = init_clients()
    print("✓ Clients initialized")
    
    # Load inventory
    print("\nLoading inventory...")
    inventory = load_inventory()
    print(f"✓ Found {len(inventory['files'])} PDFs in inventory")
    
    # Find test PDF
    test_doc = None
    for f in inventory['files']:
        if f['excel_title'] == TEST_PDF:
            test_doc = f
            break
    
    if not test_doc:
        print(f"\n✗ Error: Could not find PDF '{TEST_PDF}' in inventory")
        sys.exit(1)
    
    # Process document
    total_vectors = process_document(s3_client, s3vectors_client, openai_client, test_doc, max_pages=MAX_PAGES)
    
    # Summary
    print("\n" + "=" * 60)
    print("INGESTION COMPLETE")
    print("=" * 60)
    print(f"Document: {test_doc['excel_title']}")
    print(f"Vectors created: {total_vectors}")
    print(f"Embedding model: {EMBEDDING_MODEL}")
    print(f"Vector bucket: {S3_VECTOR_BUCKET}")
    print(f"Vector index: {VECTOR_INDEX_NAME}")
    print("=" * 60)

if __name__ == "__main__":
    main()

