#!/bin/bash
# Simple production startup script for MCP Meta-Analysis Server
# Use this when Docker build is taking too long

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting MCP Meta-Analysis Server in Production Mode${NC}"

# Set production environment
export NODE_ENV=production
export LOG_LEVEL=info

# Build the application
echo -e "${GREEN}📦 Building application...${NC}"
npm run build

# Create necessary directories
echo -e "${GREEN}📁 Creating directories...${NC}"
mkdir -p logs
mkdir -p user_sessions/shared_resources
mkdir -p user_sessions/templates

# Start the server
echo -e "${GREEN}🌟 Starting MCP server...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Start server with process monitoring
node dist/index.js