#!/bin/bash

echo "Monitoring Docker Cloud Build for mmrech/mcp-meta-analysis-r"
echo "============================================="
echo "This build may take 15-30 minutes due to R package compilation."
echo ""

# Start the build in background if not already running
BUILD_ID=$(docker buildx build --builder cloud-mmrech-meta --platform linux/amd64,linux/arm64 -f Dockerfile.production -t mmrech/mcp-meta-analysis-r:latest -t mmrech/mcp-meta-analysis-r:1.0.0 --push . 2>&1 | grep -o 'View build details:.*' | awk '{print $NF}')

if [ -n "$BUILD_ID" ]; then
    echo "Build started: $BUILD_ID"
    echo ""
    echo "You can monitor the build at:"
    echo "$BUILD_ID"
else
    echo "Build may already be running or completed."
fi

echo ""
echo "Once complete, the image will be available at:"
echo "  docker pull mmrech/mcp-meta-analysis-r:latest"
echo ""
echo "For multi-platform support:"
echo "  - linux/amd64"
echo "  - linux/arm64"