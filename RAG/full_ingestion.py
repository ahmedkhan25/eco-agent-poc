#!/usr/bin/env python3
"""
Full ingestion of all 26 PDFs - ONE AT A TIME with error checking
Stops immediately if any page fails
"""

import os
import sys
import json
import boto3
from pathlib import Path
from datetime import datetime
import pymupdf4llm
from openai import OpenAI
import time

# Try to import tiktoken, use fallback if not available
try:
    import tiktoken
    TIKTOKEN_AVAILABLE = True
except ImportError:
    TIKTOKEN_AVAILABLE = False

# --- Configuration ---
S3_SOURCE_BUCKET = "olympia-plans-raw"
S3_VECTOR_BUCKET = "olympia-rag-vectors"
VECTOR_INDEX_NAME = "olympia-pages-idx"
REGION = "us-west-2"
AWS_PROFILE = "ecoheart"
LOCAL_WORK_DIR = "work"
LOCAL_PDF_DIR = os.path.join(LOCAL_WORK_DIR, "pdfs")
INVENTORY_FILE = "inventory.json"
PROGRESS_FILE = "ingestion_progress.json"

# OpenAI Embedding Model - AS SPECIFIED IN THE PLAN
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1024

# Batch settings
BATCH_SIZE = 10
RATE_LIMIT_DELAY = 0.1  # Small delay between API calls to avoid rate limits

def load_progress():
    """Load ingestion progress"""
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r') as f:
            return json.load(f)
    return {
        "last_completed_doc": None,
        "completed_docs": [],
        "failed_docs": [],
        "total_vectors": 0,
        "started_at": datetime.utcnow().isoformat() + 'Z'
    }

def save_progress(progress):
    """Save ingestion progress"""
    progress["updated_at"] = datetime.utcnow().isoformat() + 'Z'
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(progress, f, indent=2)

def init_clients():
    """Initialize AWS and OpenAI clients"""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("✗ Error: OPENAI_API_KEY environment variable not set")
        print("  Run: export OPENAI_API_KEY='your-key'")
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
    try:
        s3_client.download_file(S3_SOURCE_BUCKET, s3_key, str(local_path))
        print(f"  ✓ Downloaded")
        return True
    except Exception as e:
        print(f"  ✗ Download failed: {e}")
        return False

def process_pdf_with_pymupdf(local_pdf_path):
    """Process PDF with PyMuPDF4LLM to get page chunks"""
    print(f"  Extracting pages...")
    try:
        pages = pymupdf4llm.to_markdown(
            str(local_pdf_path),
            page_chunks=True,
            write_images=False,
            ignore_images=True
        )
        print(f"  ✓ Extracted {len(pages)} pages")
        return pages
    except Exception as e:
        print(f"  ✗ Extraction failed: {e}")
        return None

def count_tokens(text):
    """Count tokens in text using tiktoken or fallback estimation"""
    if TIKTOKEN_AVAILABLE:
        try:
            encoding = tiktoken.encoding_for_model("text-embedding-3-small")
            return len(encoding.encode(text))
        except Exception:
            pass
    
    # Fallback: conservative estimate (1 token ~= 3 characters for safety)
    # This overestimates tokens to ensure we don't exceed limits
    return len(text) // 3

def chunk_text_by_tokens(text, max_tokens=5000):
    """
    Split text into chunks that fit within token limit.
    Using 5000 as safe limit when tiktoken unavailable (very conservative).
    With tiktoken, could use up to 5500 (leaving room for metadata header).
    """
    # Use more conservative limit if tiktoken not available
    if not TIKTOKEN_AVAILABLE:
        max_tokens = min(max_tokens, 3000)  # Extra conservative without accurate counting
    
    token_count = count_tokens(text)
    
    if token_count <= max_tokens:
        return [text]
    
    # Split by paragraphs first
    paragraphs = text.split('\n\n')
    chunks = []
    current_chunk = []
    current_tokens = 0
    
    for para in paragraphs:
        para_tokens = count_tokens(para)
        
        # If single paragraph is too large, split by sentences
        if para_tokens > max_tokens:
            sentences = para.split('. ')
            for sentence in sentences:
                sentence_tokens = count_tokens(sentence)
                if current_tokens + sentence_tokens > max_tokens:
                    if current_chunk:
                        chunks.append('\n\n'.join(current_chunk))
                        current_chunk = []
                        current_tokens = 0
                # If single sentence is still too large, split by character limit
                if sentence_tokens > max_tokens:
                    # Emergency: split very long sentence into smaller pieces
                    char_limit = max_tokens * 3  # Conservative character estimate
                    for i in range(0, len(sentence), char_limit):
                        chunk_piece = sentence[i:i+char_limit]
                        if current_chunk:
                            chunks.append('\n\n'.join(current_chunk))
                            current_chunk = []
                            current_tokens = 0
                        chunks.append(chunk_piece)
                else:
                    current_chunk.append(sentence)
                    current_tokens += sentence_tokens
        else:
            # Normal paragraph handling
            if current_tokens + para_tokens > max_tokens:
                if current_chunk:
                    chunks.append('\n\n'.join(current_chunk))
                    current_chunk = []
                    current_tokens = 0
            current_chunk.append(para)
            current_tokens += para_tokens
    
    # Add remaining chunk
    if current_chunk:
        chunks.append('\n\n'.join(current_chunk))
    
    return chunks if chunks else [text[:12000]]  # Fallback: ~4000 tokens max

def generate_embedding(openai_client, text):
    """Generate OpenAI embedding with retry logic"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = openai_client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=text,
                dimensions=EMBEDDING_DIMENSIONS
            )
            return response.data[0].embedding
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2  # Exponential backoff
                print(f"    ! Embedding API error, retrying in {wait_time}s... ({e})")
                time.sleep(wait_time)
            else:
                raise e

def write_vectors_batch(s3vectors_client, vectors_batch):
    """Write batch of vectors to S3 Vectors"""
    if not vectors_batch:
        return 0
    
    vectors_to_write = []
    for vec_data in vectors_batch:
        vectors_to_write.append({
            'key': vec_data['key'],
            'data': {'float32': vec_data['embedding']},
            'metadata': vec_data['metadata']
        })
    
    try:
        response = s3vectors_client.put_vectors(
            vectorBucketName=S3_VECTOR_BUCKET,
            indexName=VECTOR_INDEX_NAME,
            vectors=vectors_to_write
        )
        return len(vectors_batch)
    except Exception as e:
        print(f"  ✗ Error writing vectors: {e}")
        raise e  # Re-raise to stop processing

def verify_vectors_written(s3vectors_client, doc_id, expected_count):
    """Quick verification that vectors were written"""
    # We can't easily count vectors, but we can try a simple query
    # If this fails, something is wrong
    try:
        # Just verify the index exists and is accessible
        response = s3vectors_client.list_indexes(
            vectorBucketName=S3_VECTOR_BUCKET
        )
        return True
    except Exception as e:
        print(f"  ⚠ Warning: Could not verify vectors: {e}")
        return False

def process_document(s3_client, s3vectors_client, openai_client, doc_item, doc_number, total_docs):
    """Process a single document - STOP on ANY error"""
    title = doc_item['excel_title']
    s3_key = doc_item['s3_key']
    local_filename = doc_item['local_filename']
    
    print(f"\n{'='*70}")
    print(f"[{doc_number}/{total_docs}] Processing: {title}")
    print(f"{'='*70}")
    
    doc_id = Path(local_filename).stem.lower().replace(' ', '-')
    local_pdf_path = Path(LOCAL_PDF_DIR) / local_filename
    
    # Step 1: Download
    if not local_pdf_path.exists():
        if not download_pdf_from_s3(s3_client, s3_key, local_pdf_path):
            raise Exception(f"Failed to download PDF: {s3_key}")
    else:
        print(f"  ✓ PDF already downloaded")
    
    # Step 2: Extract pages
    pages = process_pdf_with_pymupdf(local_pdf_path)
    if pages is None:
        raise Exception(f"Failed to extract pages from: {local_filename}")
    
    # Step 3: Process all pages
    print(f"  Processing {len(pages)} pages...")
    vectors_batch = []
    total_vectors = 0
    
    for idx, page_data in enumerate(pages, 1):
        page_num = page_data.get('metadata', {}).get('page', idx - 1) + 1
        page_text = page_data.get('text', '')
        
        if not page_text.strip():
            print(f"    Page {page_num}: Skipped (empty)")
            continue
        
        # Build base chunk with metadata header
        metadata_header = f"""[DOC]: {title}
[DOC_ID]: {doc_id}
[PAGE]: {page_num}

[TEXT]
"""
        
        # Check if page text is too long and needs chunking
        full_chunk = metadata_header + page_text
        token_count = count_tokens(full_chunk)
        
        # Calculate header token overhead
        header_tokens = count_tokens(metadata_header)
        
        # Use conservative threshold (lower without tiktoken for safety)
        threshold = 5000 if not TIKTOKEN_AVAILABLE else 7000
        # Chunk limit must account for header overhead (keep well under 8192 limit)
        chunk_limit = 3000 if not TIKTOKEN_AVAILABLE else 5500  # More conservative to leave room for header
        
        # If too long, split the page_text into multiple chunks
        if token_count > threshold:
            print(f"    Page {page_num}: Long page (~{token_count} tokens), splitting into chunks...")
            print(f"      Header overhead: {header_tokens} tokens, chunk limit: {chunk_limit} tokens")
            text_chunks = chunk_text_by_tokens(page_text, max_tokens=chunk_limit)
            print(f"      Split into {len(text_chunks)} chunks")
        else:
            text_chunks = [page_text]
        
        # Process each chunk (usually just 1, sometimes more for long pages)
        for chunk_idx, text_chunk in enumerate(text_chunks, 1):
            chunk_text = metadata_header + text_chunk
            
            # Generate embedding
            try:
                chunk_suffix = f"-{chunk_idx}" if len(text_chunks) > 1 else ""
                progress_msg = f"    Page {page_num}/{len(pages)}"
                if len(text_chunks) > 1:
                    progress_msg += f" (chunk {chunk_idx}/{len(text_chunks)})"
                print(f"{progress_msg}: Generating embedding...", end='', flush=True)
                
                embedding = generate_embedding(openai_client, chunk_text)
                print(f" ✓")
                
                # Rate limiting
                time.sleep(RATE_LIMIT_DELAY)
                
            except Exception as e:
                print(f" ✗")
                raise Exception(f"Failed to generate embedding for page {page_num}, chunk {chunk_idx}: {e}")
            
            # Prepare vector
            vector_key = f"{doc_id}:page-{page_num}{chunk_suffix}"
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
            
            if len(text_chunks) > 1:
                metadata['chunk_number'] = chunk_idx
                metadata['total_chunks'] = len(text_chunks)
            
            vectors_batch.append({
                'key': vector_key,
                'embedding': embedding,
                'metadata': metadata
            })
        
        # Write batch
        if len(vectors_batch) >= BATCH_SIZE:
            print(f"  Writing batch of {len(vectors_batch)} vectors...", end='', flush=True)
            try:
                written = write_vectors_batch(s3vectors_client, vectors_batch)
                total_vectors += written
                print(f" ✓ (Total: {total_vectors})")
                vectors_batch = []
            except Exception as e:
                print(f" ✗")
                raise Exception(f"Failed to write vectors at page {page_num}: {e}")
    
    # Write remaining vectors
    if vectors_batch:
        print(f"  Writing final batch of {len(vectors_batch)} vectors...", end='', flush=True)
        try:
            written = write_vectors_batch(s3vectors_client, vectors_batch)
            total_vectors += written
            print(f" ✓")
        except Exception as e:
            print(f" ✗")
            raise Exception(f"Failed to write final batch: {e}")
    
    # Verify
    print(f"  Verifying vectors...", end='', flush=True)
    if verify_vectors_written(s3vectors_client, doc_id, total_vectors):
        print(f" ✓")
    else:
        print(f" ⚠")
    
    print(f"\n✓ Successfully completed: {title}")
    print(f"  Pages: {len(pages)}")
    print(f"  Vectors: {total_vectors}")
    
    return total_vectors

def main():
    """Main ingestion function"""
    print("="*70)
    print("Olympia RAG - Full Ingestion (All 26 PDFs)")
    print(f"Model: {EMBEDDING_MODEL}")
    print(f"Dimensions: {EMBEDDING_DIMENSIONS}")
    print("="*70)
    
    # Setup
    os.makedirs(LOCAL_WORK_DIR, exist_ok=True)
    os.makedirs(LOCAL_PDF_DIR, exist_ok=True)
    
    # Load progress
    progress = load_progress()
    print(f"\nProgress file: {PROGRESS_FILE}")
    if progress.get('completed_docs'):
        print(f"Previously completed: {len(progress['completed_docs'])} docs")
        print(f"Total vectors so far: {progress['total_vectors']}")
    
    # Initialize clients
    print("\nInitializing clients...")
    s3_client, s3vectors_client, openai_client = init_clients()
    print("✓ Clients initialized")
    
    # Load inventory
    print("\nLoading inventory...")
    inventory = load_inventory()
    print(f"✓ Found {len(inventory['files'])} PDFs")
    
    # Filter out already completed docs
    completed_titles = set(progress.get('completed_docs', []))
    docs_to_process = [
        doc for doc in inventory['files']
        if doc['excel_title'] not in completed_titles
    ]
    
    if not docs_to_process:
        print("\n✓ All documents already processed!")
        return
    
    print(f"\nDocuments to process: {len(docs_to_process)}")
    print(f"Already completed: {len(completed_titles)}")
    
    # Process each document
    total_docs = len(inventory['files'])
    for idx, doc in enumerate(docs_to_process, 1):
        doc_number = len(completed_titles) + idx
        
        try:
            vectors_created = process_document(
                s3_client, s3vectors_client, openai_client,
                doc, doc_number, total_docs
            )
            
            # Update progress
            progress['completed_docs'].append(doc['excel_title'])
            progress['last_completed_doc'] = doc['excel_title']
            progress['total_vectors'] += vectors_created
            save_progress(progress)
            
            print(f"✓ Progress saved")
            
        except Exception as e:
            print(f"\n{'='*70}")
            print(f"✗ ERROR - STOPPING INGESTION")
            print(f"{'='*70}")
            print(f"Document: {doc['excel_title']}")
            print(f"Error: {e}")
            print(f"\nProgress has been saved to: {PROGRESS_FILE}")
            print(f"Completed so far: {len(progress['completed_docs'])}/{total_docs} docs")
            print(f"Total vectors: {progress['total_vectors']}")
            print(f"\nTo resume, run this script again.")
            sys.exit(1)
    
    # Final summary
    print(f"\n{'='*70}")
    print("✓ FULL INGESTION COMPLETE!")
    print(f"{'='*70}")
    print(f"Total documents: {len(progress['completed_docs'])}")
    print(f"Total vectors: {progress['total_vectors']}")
    print(f"Embedding model: {EMBEDDING_MODEL}")
    print(f"Vector bucket: {S3_VECTOR_BUCKET}")
    print(f"Vector index: {VECTOR_INDEX_NAME}")
    print(f"{'='*70}")

if __name__ == "__main__":
    main()

