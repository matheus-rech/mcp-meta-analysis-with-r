# MCP Meta-Analysis Server

A professional Model Context Protocol (MCP) server for conducting meta-analyses with automated statistical validation, containerized R environments, and publication-ready outputs.

## 🎯 Key Features

- **Comprehensive Meta-Analysis**: Support for binary (OR, RR) and continuous (MD, SMD) effect measures
- **Automated Validation**: 4-stage data validation pipeline ensuring statistical integrity
- **Publication-Ready Outputs**: Generate forest plots, funnel plots, and comprehensive reports
- **Statistical Rigor**: Heterogeneity assessment (I², Q-test, τ²) and publication bias testing
- **Multiple Data Formats**: Support for CSV, Excel, and RevMan formats
- **Session Management**: Isolated analysis sessions with complete reproducibility

## 🛠️ Available Tools

1. **initialize_meta_analysis** - Start a new meta-analysis project with guided setup
2. **upload_study_data** - Upload and validate study data from various formats
3. **perform_meta_analysis** - Execute meta-analysis with automated statistical checks
4. **generate_forest_plot** - Create publication-ready forest plots
5. **assess_publication_bias** - Perform comprehensive publication bias assessment
6. **generate_report** - Generate comprehensive reports (HTML/PDF/Word)
7. **list_sessions** - List all active meta-analysis sessions
8. **get_session_status** - Get detailed status of a specific session

## 📋 Requirements

- Docker Desktop with MCP support
- No additional R installation needed (containerized)

## 🚀 Quick Start

### Using Docker Desktop MCP Toolkit

1. The server will be available in the MCP catalog
2. Click "Install" in Docker Desktop
3. Start using the meta-analysis tools immediately

### Manual Configuration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "meta-analysis": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "mcp/meta-analysis:latest"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## 📊 Example Workflow

1. **Initialize a project**:
   ```
   Tool: initialize_meta_analysis
   Parameters: {
     "project_name": "Hypertension Drug Efficacy",
     "study_type": "clinical_trial",
     "effect_measure": "OR"
   }
   ```

2. **Upload study data**:
   ```
   Tool: upload_study_data
   Parameters: {
     "session_id": "xxx-xxx",
     "data_format": "csv",
     "data_content": "base64_encoded_csv"
   }
   ```

3. **Perform analysis**:
   ```
   Tool: perform_meta_analysis
   Parameters: {
     "session_id": "xxx-xxx",
     "heterogeneity_test": true,
     "publication_bias": true
   }
   ```

4. **Generate visualizations**:
   ```
   Tool: generate_forest_plot
   Parameters: {
     "session_id": "xxx-xxx",
     "plot_style": "modern"
   }
   ```

## 🔧 Technical Architecture

- **Backend**: Node.js with TypeScript
- **Statistical Engine**: R (containerized) with meta, metafor packages
- **Data Validation**: Multi-stage validation pipeline
- **Session Management**: File-based persistence with UUID isolation
- **Security**: Input sanitization, session isolation, no external dependencies

## 📈 Use Cases

- Clinical trial meta-analyses
- Systematic reviews
- Evidence synthesis
- Healthcare decision-making
- Research publication preparation

## 🤝 Contributing

Contributions welcome! Please see our [GitHub repository](https://github.com/matheusrech/mcp-meta-analysis-with-r) for guidelines.

## 📄 License

MIT License - see LICENSE file for details.