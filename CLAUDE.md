# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **MCP Meta-Analysis Server** project designed to democratize meta-analysis through guided workflows, automated statistical validation, and containerized R environments. The system provides a comprehensive Model Context Protocol (MCP) server that makes meta-analysis accessible to researchers without deep statistical programming knowledge.

## Architecture

The project follows a modular MCP server architecture with these core components:

### MCP Server Components
- **Workflow Orchestrator**: Guides users through meta-analysis steps
- **Statistical Validator**: Automated validation of statistical methods and data
- **R Engine Manager**: Containerized R environment execution
- **Data Parser & Validator**: Input validation and format checking
- **Plot Generator**: Forest plots, funnel plots, and visualization
- **Template Manager**: Pre-configured analysis templates

### MCP Tools Interface
The server exposes these primary MCP tools:
- `initialize_meta_analysis`: Start new projects with guided setup
- `upload_study_data`: Data upload and validation (CSV/Excel/RevMan)
- `perform_meta_analysis`: Execute analysis with automated checks
- `generate_forest_plot`: Create publication-ready visualizations
- `assess_publication_bias`: Publication bias testing
- `generate_report`: Comprehensive reporting (HTML/PDF/Word)

## Development Architecture

### Container Strategy
The project uses Docker containers for R environments with these key packages:
- Statistical: `meta`, `metafor`, `metaSEM`
- Visualization: `ggplot2`, `forestplot`
- Documentation: `knitr`, `rmarkdown`
- Data handling: `dplyr`, `readxl`, `jsonlite`

### File Organization Pattern
```
user_sessions/
├── session_id/
│   ├── input/           # Raw uploaded data
│   ├── processing/      # Validated data and R workspace
│   ├── output/          # Generated plots and reports
│   └── logs/            # Validation and analysis logs
├── templates/           # Analysis templates by study type
└── shared_resources/    # Reference datasets and schemas
```

## Key Implementation Patterns

### Statistical Validation Pipeline
All data goes through a 4-stage validation:
1. **Format Check**: CSV/Excel/RevMan validation
2. **Schema Check**: Required columns and data types
3. **Statistical Validation**: Effect sizes, confidence intervals, sample sizes
4. **Quality Assessment**: Missing data, outliers, duplicate detection

### Decision Tree Guidance
The system implements automated guidance for:
- Effect measure selection (OR/RR/MD/SMD based on data type)
- Model selection (fixed vs. random effects based on heterogeneity)
- Statistical method appropriateness validation

### Session Management
Each analysis session maintains:
- Unique session ID with user isolation
- Complete audit trail of operations
- Intermediate results caching
- Reproducible R workspace storage

## GitHub Actions Integration

The repository includes Claude Code Actions workflows:
- **General Actions**: `@claude` mentions for feature requests and bug fixes
- **Automatic Review**: PR-triggered comprehensive code review
- **On-Demand Review**: `@claude-review` for targeted statistical methodology review

### Statistical Code Review Focus
When reviewing R code, Claude should prioritize:
- Statistical methodology correctness
- Effect size calculation validation
- Confidence interval computation accuracy
- Meta-analysis best practices (heterogeneity, publication bias)
- R coding standards and error handling

## Deployment Considerations

### Scalability Architecture
- Horizontal scaling with multiple MCP server instances
- Container orchestration for R environment management
- Shared file storage for user sessions
- Background queue processing for long analyses

### Security & Compliance
- Data encryption at rest and in transit
- Session isolation and access control
- GDPR compliance with data export/deletion
- Complete audit logging for reproducibility

## Development Workflow

Since this is primarily an architectural planning repository:
- Focus on MCP server implementation details
- Container strategy for R environments
- Statistical validation algorithms
- Session management and file handling
- Security and compliance frameworks

## Meta-Analysis Domain Knowledge

When working on this project, understanding these meta-analysis concepts is crucial:
- **Effect sizes**: OR (odds ratio), RR (risk ratio), MD (mean difference), SMD (standardized mean difference)
- **Heterogeneity**: I² statistic, Q-test, τ² (tau-squared)
- **Publication bias**: Funnel plots, Egger's test, trim-and-fill method
- **Model types**: Fixed-effects vs. random-effects models
- **Study types**: Clinical trials, observational studies, diagnostic accuracy studies

The system should guide users through appropriate statistical choices based on their data characteristics and research questions.