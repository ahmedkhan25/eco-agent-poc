#!/bin/bash

# Test script for the Eco-RAG API endpoint
# Make sure your Next.js dev server is running on port 3000

set -e

echo "=========================================="
echo "Eco-RAG API Test Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo -e "${BLUE}Checking if Next.js server is running...${NC}"
if ! curl -s http://localhost:3000/api/eco-rag > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Next.js server not running on port 3000${NC}"
    echo "Please start the server with: npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Test 1: Health check
echo -e "${BLUE}Test 1: Health Check${NC}"
echo "GET /api/eco-rag"
curl -s http://localhost:3000/api/eco-rag | jq '.'
echo ""
echo ""

# Test 2: Simple query
echo -e "${BLUE}Test 2: Simple Query - Neighborhood Centers${NC}"
echo "POST /api/eco-rag"
curl -s -X POST http://localhost:3000/api/eco-rag \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the neighborhood centers in Olympia?",
    "topK": 3
  }' | jq '.'
echo ""
echo ""

# Test 3: Climate query
echo -e "${BLUE}Test 3: Climate Query${NC}"
echo "POST /api/eco-rag"
curl -s -X POST http://localhost:3000/api/eco-rag \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is Olympia'\''s approach to climate change?",
    "topK": 3
  }' | jq '.'
echo ""
echo ""

# Test 4: Error handling - empty query
echo -e "${BLUE}Test 4: Error Handling - Empty Query${NC}"
echo "POST /api/eco-rag"
curl -s -X POST http://localhost:3000/api/eco-rag \
  -H "Content-Type: application/json" \
  -d '{
    "query": "",
    "topK": 3
  }' | jq '.'
echo ""
echo ""

echo -e "${GREEN}=========================================="
echo "All tests completed!"
echo "==========================================${NC}"
echo ""
echo "To test in browser, visit: http://localhost:3000/eco-rag-test"

