# MCP Meta-Analysis Server Setup Guide

## Prerequisites

The MCP Meta-Analysis Server requires a statistical computing environment to perform analyses. You have two options:

### Option 1: Docker (Recommended for Production)

Docker provides a consistent, isolated environment with all required R packages pre-installed.

```bash
# Build the Docker image
docker build -f Dockerfile.production -t mcp-meta-analysis-r:latest .

# Test the image
docker run --rm mcp-meta-analysis-r:latest Rscript -e "library(meta); print('R packages loaded successfully')"
```

### Option 2: Local R Installation

If you prefer to use a local R installation:

1. **Install R** (version 4.0 or higher)
   - Download from: https://www.r-project.org/
   - macOS: `brew install r`
   - Ubuntu/Debian: `sudo apt-get install r-base`

2. **Install Required R Packages**
   ```r
   # Run in R console
   install.packages(c(
     "meta",      # Core meta-analysis package
     "metafor",   # Advanced meta-analysis methods
     "dplyr",     # Data manipulation
     "jsonlite",  # JSON parsing
     "ggplot2"    # Plotting
   ))
   ```

3. **Verify Installation**
   ```bash
   Rscript -e "library(meta); library(metafor); print('R packages loaded successfully')"
   ```

## Running the Server

### With Claude Desktop

1. Ensure R or Docker is properly installed (see above)
2. The server is already configured in your Claude Desktop
3. Start using the meta-analysis tools!

### Standalone Mode

```bash
# Production mode
npm start

# Development mode
npm run dev
```

## Troubleshooting

### "Meta-analysis requires either Docker or R to be installed"

This error means the server cannot find R or the Docker image. Follow the prerequisites above.

### "Cannot load R package 'meta'"

The required R packages are not installed. Run the package installation commands in Step 2 of Option 2.

### Docker Image Build Fails

Ensure Docker Desktop is running and you have sufficient disk space. The image includes R and multiple packages, requiring ~2GB.

## Why No Mock Data?

This server performs real statistical analyses for scientific research. Mock data would be inappropriate and potentially misleading for meta-analysis, which requires accurate statistical computations for:

- Effect size calculations
- Confidence intervals
- Heterogeneity assessments
- Publication bias tests

Always use real R or Docker environments to ensure valid, reproducible results.