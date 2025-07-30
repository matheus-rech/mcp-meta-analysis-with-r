# MCP Meta-Analysis Server

A Model Context Protocol (MCP) server that democratizes meta-analysis through guided workflows, automated statistical validation, and seamless R integration.

## Features

- 🎯 **Guided Workflows**: Step-by-step meta-analysis process
- 🔍 **Automated Validation**: Statistical checks and data quality assessment
- 📊 **Publication-Ready Visualizations**: Forest plots, funnel plots, and more
- 🔬 **Statistical Rigor**: Support for multiple effect measures (OR, RR, MD, SMD, HR)
- 📝 **Comprehensive Reporting**: HTML/PDF/Word reports with reproducible code
- 🐳 **Flexible Deployment**: Works with local R or Docker containers

## Quick Start

### Prerequisites

Choose one of the following:

#### Option 1: Local R Installation (Quick Start)
```bash
# Check if R is installed
R --version

# Install required R packages (if needed)
Rscript install-r-packages.R
```

#### Option 2: Docker (Production)
```bash
# Build the Docker image
docker build -f Dockerfile.production -t mcp-meta-analysis-r:latest .
```

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the MCP server (uses local R by default)
USE_DOCKER=false npm start
```

### Usage in Claude Desktop

The server is already configured in Claude Desktop. The server provides these MCP tools:

1. **initialize_meta_analysis** - Start new project with guided setup
2. **upload_study_data** - Upload and validate data (CSV/Excel/RevMan)
3. **perform_meta_analysis** - Execute statistical analysis
4. **generate_forest_plot** - Create publication-ready forest plots
5. **assess_publication_bias** - Comprehensive bias assessment
6. **generate_report** - Create detailed reports
7. **list_sessions** - View all sessions
8. **get_session_status** - Check session details

### Example Workflow

1. Initialize a new meta-analysis project
2. Upload study data in CSV format
3. Perform the meta-analysis with automated statistical checks
4. Generate forest plots and assess publication bias
5. Create a comprehensive report

### Data Format

For binary outcomes (OR/RR):
```csv
study_name,n_treatment,n_control,events_treatment,events_control,year
Smith 2020,100,95,45,38,2020
Jones 2021,120,110,55,42,2021
```

For continuous outcomes (MD/SMD):
```csv
study_name,n_treatment,n_control,mean_treatment,mean_control,sd_treatment,sd_control,year
Smith 2020,50,48,12.5,10.2,3.1,2.8,2020
Jones 2021,60,55,14.1,11.8,3.5,3.2,2021
```

## Architecture

- **TypeScript MCP Server**: Main application logic
- **R Statistical Engine**: Meta-analysis computations
- **Docker Container**: Isolated R environment
- **Session Management**: User session tracking
- **File Management**: Input/output file handling

## Development

```bash
# Development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## Docker Environment

The R environment includes:
- meta, metafor packages for meta-analysis
- ggplot2 for visualization
- knitr, rmarkdown for reporting
- Data manipulation packages (dplyr, jsonlite)

## Troubleshooting

### "Meta-analysis requires either Docker or R to be installed"
Install R from https://www.r-project.org/ or build the Docker image.

### "Cannot load R package 'meta'"
Run `Rscript install-r-packages.R` to install required packages.

### Server disconnects from Claude Desktop
Check logs in `logs/mcp-meta-analysis.log` for errors.

## License

MIT License - see LICENSE file for details.