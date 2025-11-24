#!/usr/bin/env python3
"""
Create S3 Vector bucket and index using boto3
"""

import boto3
from botocore.exceptions import ClientError
import sys

AWS_PROFILE = "ecoheart"
REGION = "us-west-2"
VECTOR_BUCKET_NAME = "olympia-rag-vectors"
INDEX_NAME = "olympia-pages-idx"
DIMENSION = 1024
DISTANCE_METRIC = "cosine"

def create_vector_infrastructure():
    """Create S3 Vector bucket and index"""
    
    # Create boto3 session with profile
    session = boto3.Session(profile_name=AWS_PROFILE, region_name=REGION)
    
    # Create S3 Vectors client
    try:
        s3vectors_client = session.client('s3vectors', region_name=REGION)
        print(f"✓ S3 Vectors client created for region: {REGION}")
    except Exception as e:
        print(f"✗ Error creating S3 Vectors client: {e}")
        print("\nNote: S3 Vectors is in preview. If the service is not available in your region,")
        print("you may need to create the vector bucket and index through the AWS Console.")
        print("\nAlternatively, you can request access to the S3 Vectors preview:")
        print("https://aws.amazon.com/s3/vectors/")
        sys.exit(1)
    
    # Step 1: Create vector bucket
    print(f"\n[1/2] Creating S3 Vector bucket: {VECTOR_BUCKET_NAME}")
    try:
        response = s3vectors_client.create_vector_bucket(
            vectorBucketName=VECTOR_BUCKET_NAME
        )
        print(f"✓ Vector bucket created successfully")
        print(f"  ARN: {response.get('vectorBucketArn', 'N/A')}")
    except ClientError as e:
        if e.response['Error']['Code'] == 'BucketAlreadyOwnedByYou':
            print(f"✓ Vector bucket already exists")
        else:
            print(f"✗ Error creating vector bucket: {e}")
            sys.exit(1)
    
    # Step 2: Create vector index
    print(f"\n[2/2] Creating vector index: {INDEX_NAME}")
    try:
        response = s3vectors_client.create_index(
            vectorBucketName=VECTOR_BUCKET_NAME,
            indexName=INDEX_NAME,
            dataType='float32',
            dimension=DIMENSION,
            distanceMetric=DISTANCE_METRIC,
            metadataConfiguration={
                'nonFilterableMetadataKeys': [
                    'doc_id',
                    'title',
                    'page',
                    's3_pdf_key',
                    'snippet',
                    'image_keys',
                    'captions',
                    'doc_type',
                    'timestamp',
                    'chunk_idx'
                ]
            }
        )
        print(f"✓ Vector index created successfully")
        print(f"  Name: {INDEX_NAME}")
        print(f"  Dimensions: {DIMENSION}")
        print(f"  Distance metric: {DISTANCE_METRIC}")
        print(f"  Data type: float32")
    except ClientError as e:
        if 'IndexAlreadyExists' in str(e) or 'already exists' in str(e).lower():
            print(f"✓ Vector index already exists")
        else:
            print(f"✗ Error creating vector index: {e}")
            sys.exit(1)
    
    print("\n" + "="*60)
    print("S3 Vector infrastructure setup complete!")
    print(f"Vector Bucket: {VECTOR_BUCKET_NAME}")
    print(f"Vector Index: {INDEX_NAME}")
    print("="*60)

if __name__ == "__main__":
    create_vector_infrastructure()

