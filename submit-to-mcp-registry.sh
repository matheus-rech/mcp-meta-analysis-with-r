#!/bin/bash

# Script to submit updated server.yaml to MCP Registry
# This script helps with the PR submission process

set -e

echo "📦 MCP Registry Submission Helper"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Fork the MCP Registry${NC}"
echo "If you haven't already, fork: https://github.com/modelcontextprotocol/mcp-registry"
echo ""

echo -e "${BLUE}Step 2: Clone your fork${NC}"
echo "Run these commands:"
echo "  git clone https://github.com/YOUR_USERNAME/mcp-registry.git"
echo "  cd mcp-registry"
echo ""

echo -e "${BLUE}Step 3: Create a feature branch${NC}"
echo "  git checkout -b feat/meta-analysis-ai-enhancements"
echo ""

echo -e "${BLUE}Step 4: Copy the updated server.yaml${NC}"
echo "Copy the server.yaml from this project to your fork:"
echo "  cp $(pwd)/mcp-registry-server.yaml servers/mcp-meta-analysis-r/server.yaml"
echo ""

echo -e "${BLUE}Step 5: Commit changes${NC}"
echo "  git add servers/mcp-meta-analysis-r/server.yaml"
echo "  git commit -m \"feat: Update MCP Meta-Analysis server with AI enhancements\""
echo ""

echo -e "${BLUE}Step 6: Push to your fork${NC}"
echo "  git push origin feat/meta-analysis-ai-enhancements"
echo ""

echo -e "${BLUE}Step 7: Create Pull Request${NC}"
echo "Go to: https://github.com/modelcontextprotocol/mcp-registry"
echo "Click 'Compare & pull request' for your branch"
echo ""

echo -e "${GREEN}PR Template:${NC}"
cat << 'EOF'
Title: feat: Update MCP Meta-Analysis server with AI enhancements

## Description

This PR updates the MCP Meta-Analysis server entry to reflect significant new AI-enhanced capabilities that have been added to the server.

## What's New

### 1. RESTful API Gateway
- Full REST API at `/api/v1` with versioning
- Interactive OpenAPI/Swagger documentation at `/api-docs`
- Enterprise-grade security (Helmet, CORS, rate limiting)

### 2. Intelligent Data Ingestion with Claude SDK
- Automatic data format error detection and fixing
- Missing statistical value calculation
- Duplicate study detection
- Statistical integrity validation
- GRADE quality assessment

### 3. Intelligent Code Linting
- Multi-language support: R (lintr + roxygen2), Python (flake8 + mypy), TypeScript (ESLint + tsc)
- AI-enhanced analysis with Claude SDK
- Context-aware suggestions beyond syntax
- Statistical methodology validation for R code

### 4. Additional Improvements
- Follows US/French API design standards
- Containerized deployment maintained
- MCP protocol compatibility preserved

## Testing

All features have been tested and verified:
- ✅ TypeScript builds successfully
- ✅ API endpoints respond correctly
- ✅ Claude SDK integration functional
- ✅ Traditional linters work
- ✅ Docker image updated: `mmrech/mcp-meta-analysis-r:latest`

## Related Links

- GitHub Repository: https://github.com/matheus-rech/mcp-meta-analysis-with-r
- Docker Hub: https://hub.docker.com/r/mmrech/mcp-meta-analysis-r

## Checklist

- [x] Entry follows the established format
- [x] All links are valid
- [x] Docker image is publicly accessible
- [x] Description accurately reflects capabilities
- [x] No breaking changes to existing functionality
EOF

echo ""
echo -e "${GREEN}✅ Instructions complete!${NC}"
echo ""
echo "The updated server.yaml has been saved as: mcp-registry-server.yaml"
echo "Follow the steps above to submit your PR to the MCP Registry."