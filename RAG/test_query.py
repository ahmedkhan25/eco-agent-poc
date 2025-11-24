#!/usr/bin/env python3
"""
Test querying the S3 Vector index
"""

import boto3
import json
from datetime import datetime

# Configuration
VECTOR_BUCKET = "olympia-rag-vectors"
INDEX_NAME = "olympia-pages-idx"
REGION = "us-west-2"
AWS_PROFILE = "ecoheart"
EMBEDDING_MODEL = "text-embedding-3-small"  # OpenAI model
EMBEDDING_DIMENSIONS = 1024

# Test query
TEST_QUERY = "What are the neighborhood centers in Olympia?"

def generate_query_embedding(openai_client, query_text):
    """Generate embedding for query using OpenAI"""
    print(f"Query: {query_text}")
    print(f"Generating embedding with OpenAI model: {EMBEDDING_MODEL}...\n")
    
    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=query_text,
        dimensions=EMBEDDING_DIMENSIONS
    )
    
    embedding = response.data[0].embedding
    
    print(f"✓ Generated {len(embedding)}-dimensional embedding\n")
    return embedding

def query_vectors(s3vectors_client, query_embedding, top_k=2):
    """Query S3 Vectors index"""
    print(f"Querying S3 Vectors index...")
    print(f"  Bucket: {VECTOR_BUCKET}")
    print(f"  Index: {INDEX_NAME}")
    print(f"  Top K: {top_k}\n")
    
    # According to AWS docs, queryVector should be a VectorData object
    # VectorData is a Union type with float32 format
    response = s3vectors_client.query_vectors(
        vectorBucketName=VECTOR_BUCKET,
        indexName=INDEX_NAME,
        queryVector={
            'float32': query_embedding  # VectorData with 'float32' key
        },
        topK=top_k,
        returnDistance=True,
        returnMetadata=True
    )
    
    return response

def display_results(response):
    """Display query results"""
    print("=" * 60)
    print("QUERY RESULTS")
    print("=" * 60)
    
    distance_metric = response.get('distanceMetric', 'unknown')
    vectors = response.get('vectors', [])
    
    print(f"Distance Metric: {distance_metric}")
    print(f"Results Found: {len(vectors)}\n")
    
    if not vectors:
        print("No results found.")
        return
    
    for i, vec in enumerate(vectors, 1):
        print(f"{i}. Key: {vec.get('key')}")
        print(f"   Distance: {vec.get('distance', 'N/A')}")
        
        metadata = vec.get('metadata', {})
        if metadata:
            print(f"   Metadata:")
            print(f"     - Doc ID: {metadata.get('doc_id')}")
            print(f"     - Title: {metadata.get('title')}")
            print(f"     - Page: {metadata.get('page')}")
            print(f"     - Doc Type: {metadata.get('doc_type')}")
        
        print()
    
    print("=" * 60)

def main():
    """Main query test function"""
    print("=" * 60)
    print("Olympia RAG - Vector Query Test")
    print("=" * 60)
    print()
    
    # Initialize clients
    import os
    from openai import OpenAI
    
    # Check for OpenAI API key
    if not os.environ.get("OPENAI_API_KEY"):
        print("✗ Error: OPENAI_API_KEY environment variable not set")
        return 1
    
    session = boto3.Session(profile_name=AWS_PROFILE, region_name=REGION)
    openai_client = OpenAI()
    s3vectors_client = session.client('s3vectors')
    
    try:
        # Step 1: Generate query embedding
        query_embedding = generate_query_embedding(openai_client, TEST_QUERY)
        
        # Step 2: Query the vector index
        response = query_vectors(s3vectors_client, query_embedding, top_k=2)
        
        # Step 3: Display results
        display_results(response)
        
        print("\n✓ Query test completed successfully!")
        
    except Exception as e:
        print(f"\n✗ Error during query: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())

