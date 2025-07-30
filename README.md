# MCP Meta-Analysis Server

A comprehensive Model Context Protocol (MCP) server for guided meta-analysis workflows with containerized R environments.

## Features

- **Guided Workflow**: Step-by-step meta-analysis process
- **Multiple Effect Measures**: OR, RR, MD, SMD, HR
- **Statistical Validation**: Automated data validation and quality checks
- **Publication Bias Assessment**: Funnel plots, Egger's test, Begg's test, trim-and-fill
- **Visualization**: Forest plots and funnel plots
- **Comprehensive Reporting**: HTML, PDF, Word formats
- **Containerized R Environment**: Isolated and reproducible analysis

## Quick Start

### Prerequisites

- Node.js 18+
- Docker
- TypeScript

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Build Docker container for R environment
npm run docker:build

# Start the MCP server
npm start
```

### Usage

The server provides 8 main MCP tools:

1. **initialize_meta_analysis** - Start new project
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
- meta, metafor, metaSEM packages
- ggplot2, forestplot for visualization
- knitr, rmarkdown for reporting
- Data manipulation packages (dplyr, readxl)

## License

MIT License - see LICENSE file for details.