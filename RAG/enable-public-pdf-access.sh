#!/bin/bash

# Enable public read access for PDFs in the olympia-plans-raw bucket
# This allows the RAG frontend to link directly to PDF files

set -e

BUCKET_NAME="olympia-plans-raw"
AWS_PROFILE="ecoheart"
REGION="us-west-2"

echo "=========================================="
echo "Enable Public PDF Access"
echo "=========================================="
echo ""
echo "Bucket: $BUCKET_NAME"
echo "Region: $REGION"
echo "Profile: $AWS_PROFILE"
echo ""

# Step 1: Disable Block Public Access (if needed)
echo "Step 1: Checking Block Public Access settings..."
aws s3api get-public-access-block \
  --bucket $BUCKET_NAME \
  --profile $AWS_PROFILE \
  --region $REGION 2>/dev/null || echo "No block settings found"

echo ""
echo "Disabling Block Public Access..."
aws s3api delete-public-access-block \
  --bucket $BUCKET_NAME \
  --profile $AWS_PROFILE \
  --region $REGION

echo "✓ Block Public Access disabled"
echo ""

# Step 2: Create bucket policy for public read access
echo "Step 2: Creating public read policy..."

cat > /tmp/bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${BUCKET_NAME}/pdfs/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
  --bucket $BUCKET_NAME \
  --policy file:///tmp/bucket-policy.json \
  --profile $AWS_PROFILE \
  --region $REGION

echo "✓ Bucket policy created"
echo ""

# Step 3: Verify policy
echo "Step 3: Verifying policy..."
aws s3api get-bucket-policy \
  --bucket $BUCKET_NAME \
  --profile $AWS_PROFILE \
  --region $REGION \
  --output json | jq -r '.Policy' | jq .

echo ""
echo "✓ Policy verified"
echo ""

# Step 4: Test access to a sample PDF
echo "Step 4: Testing public access..."
SAMPLE_PDF="pdfs/Neighborhood-Centers-Report.pdf"
SAMPLE_URL="https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${SAMPLE_PDF}"

echo "Sample URL: $SAMPLE_URL"
echo ""

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SAMPLE_URL")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Public access working! (HTTP $HTTP_CODE)"
else
  echo "⚠️  Public access may not be working (HTTP $HTTP_CODE)"
  echo "   This could be normal if the file doesn't exist yet."
fi

echo ""
echo "=========================================="
echo "✓ Public PDF Access Enabled!"
echo "=========================================="
echo ""
echo "PDFs are now publicly accessible at:"
echo "https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/pdfs/<filename>.pdf"
echo ""
echo "Users can now view PDFs directly from the RAG interface!"
echo ""

# Clean up
rm -f /tmp/bucket-policy.json

