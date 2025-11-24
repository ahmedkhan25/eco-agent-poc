#!/bin/bash

# Setup script to export AWS credentials to environment variables
# This is needed for the Eco-RAG API to access S3 Vectors

set -e

echo "=========================================="
echo "AWS Credentials Setup for Eco-RAG"
echo "=========================================="
echo ""

AWS_PROFILE="${1:-ecoheart}"

echo "Using AWS Profile: $AWS_PROFILE"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first:"
    echo "   brew install awscli"
    exit 1
fi

# Check if profile exists
if ! aws configure list --profile $AWS_PROFILE &> /dev/null; then
    echo "❌ AWS profile '$AWS_PROFILE' not found"
    echo ""
    echo "Available profiles:"
    aws configure list-profiles
    echo ""
    echo "Usage: $0 <profile-name>"
    exit 1
fi

echo "✓ AWS CLI found"
echo "✓ Profile '$AWS_PROFILE' exists"
echo ""

# Extract credentials
echo "Extracting credentials from profile..."
ACCESS_KEY=$(aws configure get aws_access_key_id --profile $AWS_PROFILE)
SECRET_KEY=$(aws configure get aws_secret_access_key --profile $AWS_PROFILE)
REGION=$(aws configure get region --profile $AWS_PROFILE)

if [ -z "$ACCESS_KEY" ] || [ -z "$SECRET_KEY" ]; then
    echo "❌ Could not extract credentials from profile"
    exit 1
fi

if [ -z "$REGION" ]; then
    REGION="us-west-2"
    echo "⚠️  No region set in profile, using default: us-west-2"
fi

echo "✓ Credentials extracted"
echo ""

# Create or update .env.local
ENV_FILE=".env.local"

echo "Updating $ENV_FILE..."
echo ""

# Create backup if file exists
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "✓ Created backup of existing .env.local"
fi

# Remove old AWS credentials from .env.local
if [ -f "$ENV_FILE" ]; then
    sed -i.bak '/^AWS_ACCESS_KEY_ID=/d' "$ENV_FILE"
    sed -i.bak '/^AWS_SECRET_ACCESS_KEY=/d' "$ENV_FILE"
    sed -i.bak '/^AWS_REGION=/d' "$ENV_FILE"
    rm -f "${ENV_FILE}.bak"
fi

# Append new credentials
echo "# AWS Credentials for S3 Vectors (Eco-RAG)" >> "$ENV_FILE"
echo "AWS_ACCESS_KEY_ID=$ACCESS_KEY" >> "$ENV_FILE"
echo "AWS_SECRET_ACCESS_KEY=$SECRET_KEY" >> "$ENV_FILE"
echo "AWS_REGION=$REGION" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"

echo "✓ Updated $ENV_FILE with AWS credentials"
echo ""

echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "AWS credentials have been added to .env.local"
echo ""
echo "Next steps:"
echo "  1. Make sure OPENAI_API_KEY is also set in .env.local"
echo "  2. Restart your Next.js dev server:"
echo "     npm run dev"
echo "  3. Test the endpoint:"
echo "     ./RAG/test-rag-endpoint.sh"
echo "  4. Or visit: http://localhost:3000/eco-rag-test"
echo ""

# Show .env.local status (without showing secrets)
echo "Current .env.local status:"
if [ -f "$ENV_FILE" ]; then
    echo "  ✓ AWS_ACCESS_KEY_ID: $(grep -q 'AWS_ACCESS_KEY_ID=' $ENV_FILE && echo 'Set' || echo 'Not set')"
    echo "  ✓ AWS_SECRET_ACCESS_KEY: $(grep -q 'AWS_SECRET_ACCESS_KEY=' $ENV_FILE && echo 'Set' || echo 'Not set')"
    echo "  ✓ AWS_REGION: $(grep 'AWS_REGION=' $ENV_FILE | cut -d'=' -f2)"
    echo "  ✓ OPENAI_API_KEY: $(grep -q 'OPENAI_API_KEY=' $ENV_FILE && echo 'Set' || echo 'Not set')"
else
    echo "  ⚠️  .env.local not found"
fi
echo ""

