# Olympia RAG - S3 Bucket Setup

## Bucket Creation

The S3 bucket `olympia-plans-raw` has been created for storing files (PDFs, CSVs, etc.) that will be accessible via signed URLs for web downloads.

### Bucket Details

- **Bucket Name**: `olympia-plans-raw`
- **Region**: `us-west-2`
- **Access**: Private (public access blocked)
- **Versioning**: Enabled

## Upload Files

Upload files to the bucket using the AWS CLI:

```bash
aws s3 cp file.pdf s3://olympia-plans-raw/path/to/file.pdf --profile ecoheart
```

## Bucket Permissions

The bucket is configured with:

- **Public Access**: Blocked (all public access settings enabled)
- **CORS**: Configured for web access
- **Versioning**: Enabled for file version history
- **Access Control**: Files are accessed via signed URLs only

## IAM Permissions Required

To upload files or generate signed URLs, your IAM user/role needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::olympia-plans-raw",
        "arn:aws:s3:::olympia-plans-raw/*"
      ]
    }
  ]
}
```

## Signed URLs

Files are accessed via signed URLs (not public URLs). Generate signed URLs using:

- AWS CLI: `aws s3 presign`
- AWS SDK: `getSignedUrl()` method
- Your application code

