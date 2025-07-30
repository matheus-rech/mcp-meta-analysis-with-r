## Add Meta-Analysis MCP Server

This PR adds the Meta-Analysis MCP Server to the Docker MCP Registry.

### About the Server

The Meta-Analysis MCP Server democratizes meta-analysis through guided workflows, automated statistical validation, and seamless R integration. It's designed for researchers, clinicians, and data scientists conducting systematic reviews and meta-analyses.

### Key Features

- 🎯 **Guided Workflows**: Step-by-step meta-analysis process from data import to report generation
- 📊 **Multiple Effect Measures**: Support for OR, RR, MD, SMD, HR
- 🔍 **Automated Validation**: Statistical checks and data quality assessment
- 📈 **Publication-Ready Visualizations**: Forest plots and funnel plots
- 🔬 **Publication Bias Assessment**: Egger's test, Begg's test, trim-and-fill
- 📝 **Comprehensive Reporting**: HTML/PDF/Word formats with reproducible code
- 🐳 **Containerized R Environment**: Includes meta, metafor, and essential R packages

### Docker Image

- **Image**: `mmrech/mcp-meta-analysis-r:latest`
- **Platforms**: linux/amd64, linux/arm64
- **Docker Hub**: https://hub.docker.com/r/mmrech/mcp-meta-analysis-r

### Source Code

- **GitHub Repository**: https://github.com/matheus-rech/mcp-meta-analysis-with-r
- **License**: MIT
- **Documentation**: Comprehensive README with examples and setup instructions

### MCP Tools Provided

1. `initialize_meta_analysis` - Start new meta-analysis projects
2. `upload_study_data` - Upload and validate data (CSV/Excel/RevMan)
3. `perform_meta_analysis` - Execute statistical analysis
4. `generate_forest_plot` - Create publication-ready forest plots
5. `assess_publication_bias` - Comprehensive bias assessment
6. `generate_report` - Create detailed reports
7. `list_sessions` - View all sessions
8. `get_session_status` - Check session details

### Testing

The server has been tested with:
- Local R installations
- Docker containerized environments
- Claude Desktop integration
- Multiple data formats and effect measures

### Category

Submitted under: `data-science`

---

Please let me know if any additional information is needed for the review process.