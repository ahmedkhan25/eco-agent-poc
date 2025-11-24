#!/usr/bin/env python3
"""
Upload PDFs from local directory to S3 bucket olympia-plans-raw
"""

import os
import sys
import json
import boto3
from pathlib import Path
from datetime import datetime
from botocore.exceptions import ClientError, NoCredentialsError

# ---- CONFIGURE THESE ----
BUCKET_NAME = "olympia-plans-raw"
REGION = "us-west-2"
AWS_PROFILE = "ecoheart"
PDF_DIR = "pdfs"
S3_PREFIX = "pdfs/"  # Optional: prefix for files in S3 (e.g., "pdfs/" or "")
INVENTORY_FILE = "inventory.json"  # Local inventory file
INVENTORY_S3_KEY = "inventory.json"  # S3 key for inventory file


def load_inventory():
    """Load inventory file"""
    if not os.path.exists(INVENTORY_FILE):
        print(f"Warning: Inventory file '{INVENTORY_FILE}' not found.")
        print("Creating new inventory from PDF files...")
        return None
    
    try:
        with open(INVENTORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading inventory file: {e}")
        return None


def save_inventory(inventory):
    """Save inventory to JSON file"""
    inventory["metadata"]["updated_at"] = datetime.utcnow().isoformat() + "Z"
    with open(INVENTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(inventory, f, indent=2, ensure_ascii=False)


def upload_file_to_s3(s3_client, local_path: Path, s3_key: str, content_type: str = 'application/pdf') -> bool:
    """Upload a single file to S3"""
    try:
        print(f"[upload] {local_path.name} -> s3://{BUCKET_NAME}/{s3_key}")
        s3_client.upload_file(
            str(local_path),
            BUCKET_NAME,
            s3_key,
            ExtraArgs={'ContentType': content_type}
        )
        return True
    except ClientError as e:
        print(f"  !! Error uploading {local_path.name}: {e}")
        return False
    except Exception as e:
        print(f"  !! Unexpected error uploading {local_path.name}: {e}")
        return False


def main():
    # Check if PDF directory exists
    pdf_dir = Path(PDF_DIR)
    if not pdf_dir.exists():
        print(f"Error: Directory '{PDF_DIR}' does not exist.")
        print(f"Please run download_olympia_pdfs.py first to download PDFs.")
        sys.exit(1)

    # Get all PDF files
    pdf_files = list(pdf_dir.glob("*.pdf"))
    if not pdf_files:
        print(f"No PDF files found in '{PDF_DIR}' directory.")
        sys.exit(1)

    print(f"Found {len(pdf_files)} PDF files to upload.")

    # Initialize S3 client with profile
    try:
        session = boto3.Session(profile_name=AWS_PROFILE)
        s3_client = session.client('s3', region_name=REGION)
        
        # Verify bucket exists and we have access
        try:
            s3_client.head_bucket(Bucket=BUCKET_NAME)
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                print(f"Error: Bucket '{BUCKET_NAME}' does not exist.")
            elif error_code == '403':
                print(f"Error: Access denied to bucket '{BUCKET_NAME}'. Check your IAM permissions.")
            else:
                print(f"Error accessing bucket: {e}")
            sys.exit(1)
    except NoCredentialsError:
        print(f"Error: AWS credentials not found for profile '{AWS_PROFILE}'.")
        print(f"Please configure AWS credentials using:")
        print(f"  aws configure --profile {AWS_PROFILE}")
        sys.exit(1)
    except Exception as e:
        print(f"Error initializing S3 client: {e}")
        sys.exit(1)

    # Load inventory
    inventory = load_inventory()
    
    # Create inventory from scratch if not found
    if inventory is None:
        inventory = {
            "metadata": {
                "created_at": datetime.utcnow().isoformat() + "Z",
                "updated_at": datetime.utcnow().isoformat() + "Z",
                "source_file": None,
                "bucket": BUCKET_NAME
            },
            "files": []
        }
        # Create entries for all PDF files
        for pdf_file in pdf_files:
            inventory["files"].append({
                "excel_title": pdf_file.stem,  # Use filename without extension as title
                "source_url": None,
                "local_filename": pdf_file.name,
                "s3_key": None,
                "s3_bucket": BUCKET_NAME,
                "file_size": pdf_file.stat().st_size,
                "downloaded_at": None,
                "uploaded_at": None
            })
    
    # Create a map of files by filename for quick lookup
    files_by_name = {f["local_filename"]: f for f in inventory["files"]}
    
    # Upload files
    uploaded = 0
    failed = []
    uploaded_at = datetime.utcnow().isoformat() + "Z"

    for pdf_file in pdf_files:
        # Construct S3 key (path in bucket)
        s3_key = f"{S3_PREFIX}{pdf_file.name}" if S3_PREFIX else pdf_file.name
        
        if upload_file_to_s3(s3_client, pdf_file, s3_key):
            uploaded += 1
            
            # Update inventory
            if pdf_file.name in files_by_name:
                files_by_name[pdf_file.name]["s3_key"] = s3_key
                files_by_name[pdf_file.name]["uploaded_at"] = uploaded_at
            else:
                # Add new entry if not in inventory
                inventory["files"].append({
                    "excel_title": pdf_file.stem,
                    "source_url": None,
                    "local_filename": pdf_file.name,
                    "s3_key": s3_key,
                    "s3_bucket": BUCKET_NAME,
                    "file_size": pdf_file.stat().st_size,
                    "downloaded_at": None,
                    "uploaded_at": uploaded_at
                })
        else:
            failed.append(pdf_file.name)
    
    # Save updated inventory locally
    save_inventory(inventory)
    
    # Upload inventory file to S3
    print(f"\n[upload] {INVENTORY_FILE} -> s3://{BUCKET_NAME}/{INVENTORY_S3_KEY}")
    if upload_file_to_s3(s3_client, Path(INVENTORY_FILE), INVENTORY_S3_KEY, content_type='application/json'):
        print(f"✓ Inventory uploaded to S3")
    else:
        print(f"⚠ Warning: Failed to upload inventory to S3")

    # Summary
    print(f"\n{'='*60}")
    print(f"Upload Summary:")
    print(f"  Successfully uploaded: {uploaded}/{len(pdf_files)}")
    if failed:
        print(f"\nFailed uploads:")
        for filename in failed:
            print(f"  - {filename}")
    print(f"{'='*60}")

    if uploaded == len(pdf_files):
        print(f"\n✓ All PDFs uploaded successfully to s3://{BUCKET_NAME}/{S3_PREFIX}")
    elif uploaded > 0:
        print(f"\n⚠ Partial success: {uploaded} files uploaded, {len(failed)} failed")
    else:
        print(f"\n✗ Upload failed for all files")
        sys.exit(1)


if __name__ == "__main__":
    main()

