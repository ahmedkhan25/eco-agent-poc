# Olympia PDF Download and Upload Workflow

This workflow downloads PDFs from a CSV file and uploads them to the S3 bucket `olympia-plans-raw`.

## Prerequisites

1. **AWS CLI configured** with profile `ecoheart`:
   ```bash
   aws configure --profile ecoheart
   ```

2. **Python dependencies** installed:
   ```bash
   pip install -r requirements-olympia.txt
   ```

3. **CSV file** named `Olympia Weblinks .xlsx - Olympia.csv` in the RAG directory

## Step 1: Download PDFs

Run the download script to fetch PDFs from URLs in the CSV:

```bash
cd RAG
python download_olympia_pdfs.py
```

This will:
- Read the CSV file
- Extract PDF URLs (handles both full URLs and filenames)
- Download PDFs to the `./pdfs` directory
- Skip files that already exist locally
- Print a summary of downloaded and skipped files

**Configuration** (edit `download_olympia_pdfs.py`):
- `CSV_PATH`: Path to your CSV file
- `OUTPUT_DIR`: Local directory to save PDFs (default: `pdfs`)
- `BASE_PDF_URL`: Base URL for relative PDF filenames

## Step 2: Upload to S3

After downloading, upload all PDFs to the S3 bucket:

```bash
cd RAG
python upload_to_s3.py
```

This will:
- Find all PDF files in the `./pdfs` directory
- Upload each file to `s3://olympia-plans-raw/pdfs/`
- Use AWS profile `ecoheart`
- Set proper Content-Type headers
- Print upload progress and summary

**Configuration** (edit `upload_to_s3.py`):
- `BUCKET_NAME`: S3 bucket name (default: `olympia-plans-raw`)
- `REGION`: AWS region (default: `us-west-2`)
- `AWS_PROFILE`: AWS CLI profile (default: `ecoheart`)
- `PDF_DIR`: Local directory with PDFs (default: `pdfs`)
- `S3_PREFIX`: Optional prefix for S3 keys (default: `pdfs/`)

## Quick Start

```bash
# Navigate to RAG folder
cd RAG

# 1. Install dependencies
pip install -r requirements-olympia.txt

# 2. Download PDFs (CSV file should be in RAG folder)
python download_olympia_pdfs.py

# 3. Upload to S3
python upload_to_s3.py
```

**Note**: The `pdfs` folder will be created inside the `RAG` directory when you run the download script.

## Troubleshooting

### Download Issues
- **CSV not found**: Make sure `Olympia Weblinks .xlsx - Olympia.csv` is in the `RAG` directory
- **404 errors**: Some URLs in the CSV may be broken - check the skipped rows output
- **Base URL wrong**: Update `BASE_PDF_URL` if relative filenames aren't resolving correctly

### Upload Issues
- **Credentials error**: Run `aws configure --profile ecoheart` to set up credentials
- **Permission denied**: Ensure your IAM user/role has `s3:PutObject` permission on the bucket
- **Bucket not found**: Verify the bucket name and region match your setup

## S3 Bucket Details

- **Bucket**: `olympia-plans-raw`
- **Region**: `us-west-2`
- **Access**: Private (files accessed via signed URLs)
- **Versioning**: Enabled

See `Olympia-RAG-Readme.md` for more bucket configuration details.

