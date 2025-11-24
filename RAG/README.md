# RAG - Olympia PDF Processing

This folder contains scripts and documentation for downloading PDFs from Olympia's website and uploading them to S3 for RAG (Retrieval-Augmented Generation) processing.

## Files

- **`download_olympia_pdfs.py`** - Downloads PDFs from URLs in a CSV file
- **`upload_to_s3.py`** - Uploads downloaded PDFs to S3 bucket `olympia-plans-raw`
- **`requirements-olympia.txt`** - Python dependencies needed for the scripts
- **`olympia-workflow.md`** - Detailed workflow documentation
- **`Olympia-RAG-Readme.md`** - S3 bucket setup and configuration details

## Quick Start

```bash
cd RAG
pip install -r requirements-olympia.txt
python download_olympia_pdfs.py
python upload_to_s3.py
```

See `olympia-workflow.md` for detailed instructions.

