# MCP Meta-Analysis Server - Example Usage

## Overview

This document demonstrates how to use the MCP Meta-Analysis Server with Claude Desktop and other MCP clients. The server provides 8 powerful tools for conducting comprehensive meta-analyses.

## Quick Start

### 1. Claude Desktop Integration

Add this configuration to your Claude Desktop settings (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "meta-analysis": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/your/mcp-meta-analysis-with-r"
    }
  }
}
```

### 2. Available Tools

The server provides these tools:

- `initialize_meta_analysis` - Start a new meta-analysis project
- `upload_study_data` - Upload and validate study data
- `perform_meta_analysis` - Execute statistical analysis
- `generate_forest_plot` - Create forest plots
- `assess_publication_bias` - Test for publication bias
- `generate_report` - Create comprehensive reports
- `list_sessions` - View active sessions
- `get_session_status` - Check session details

## Example Workflows

### Complete Meta-Analysis Workflow

Here's a step-by-step example of conducting a meta-analysis:

#### Step 1: Initialize Project

```
Please use the initialize_meta_analysis tool to start a new meta-analysis project:
- Project name: "Hypertension Drug Efficacy"
- Study type: "clinical_trial"
- Effect measure: "OR"
- Analysis model: "random"
```

#### Step 2: Upload Study Data

```
Use upload_study_data with this CSV data:

study_name,events_treatment,n_treatment,events_control,n_control
HOPE Study,120,2000,180,2000
EUROPA Trial,85,1500,125,1500
PEACE Study,95,1800,140,1800
QUIET Trial,60,1200,85,1200
CAMELOT Study,75,1400,110,1400
```

#### Step 3: Perform Analysis

```
Run the meta-analysis using:
- Session ID: [from step 1]
- Effect measure: "OR"
- Model type: "random"
- Confidence level: 0.95
```

#### Step 4: Generate Visualizations

```
Create a forest plot with:
- Width: 12 inches
- Height: 8 inches
- DPI: 300
```

#### Step 5: Assess Publication Bias

```
Run publication bias assessment with all available methods:
- Egger's test
- Begg's test
- Funnel plot analysis
```

#### Step 6: Generate Report

```
Create a comprehensive HTML report including:
- All plots
- Statistical code
- Interpretation guidelines
```

## Advanced Usage Examples

### Binary Outcomes (OR/RR)

For binary outcomes, your data should include:
```csv
study_name,events_treatment,n_treatment,events_control,n_control
Study A,15,100,25,100
Study B,20,80,30,85
Study C,8,50,12,55
```

### Continuous Outcomes (MD/SMD)

For continuous outcomes:
```csv
study_name,n_treatment,mean_treatment,sd_treatment,n_control,mean_control,sd_control
Study A,50,12.5,2.1,50,10.8,2.3
Study B,40,13.2,1.9,45,11.2,2.0
Study C,60,11.8,2.4,55,10.5,2.1
```

### Survival Outcomes (HR)

For hazard ratios:
```csv
study_name,effect_size,ci_lower,ci_upper
Study A,0.75,0.60,0.94
Study B,0.82,0.65,1.03
Study C,0.68,0.52,0.89
```

## Sample Conversations

### Example 1: Quick Meta-Analysis

**You:** "I need to analyze 5 clinical trials comparing a new blood pressure medication to placebo. Can you help me set up a meta-analysis?"

**Claude:** "I'll help you set up a comprehensive meta-analysis. Let me start by initializing a new project."

*[Claude uses initialize_meta_analysis tool]*

**Claude:** "Great! I've created a new meta-analysis session. Now please provide your study data. For binary outcomes like treatment response, I need columns for events_treatment, n_treatment, events_control, and n_control for each study."

### Example 2: Publication Bias Assessment

**You:** "I've completed my meta-analysis but I'm concerned about publication bias. Can you help assess this?"

**Claude:** "Absolutely! I'll run several publication bias tests including Egger's test, Begg's test, and generate a funnel plot."

*[Claude uses assess_publication_bias tool]*

**Claude:** "Based on the results: Egger's test p=0.23 (no significant asymmetry), Begg's test p=0.18 (no significant bias), and the funnel plot shows fairly symmetric distribution of studies. This suggests minimal publication bias in your analysis."

## Error Handling

The server provides comprehensive error handling:

- **Data validation errors**: Clear messages about missing or invalid data
- **Statistical errors**: Warnings about heterogeneity, small sample sizes
- **File errors**: Issues with plot generation or report creation

## Performance Notes

- **Small datasets** (< 5 studies): Analysis completes in seconds
- **Medium datasets** (5-20 studies): Analysis takes 10-30 seconds
- **Large datasets** (> 20 studies): May take 1-2 minutes for comprehensive analysis

## Troubleshooting

### Common Issues

1. **R packages missing**: Ensure meta, metafor, dplyr, jsonlite, and ggplot2 are installed
2. **File permissions**: Make sure the session directory is writable
3. **Memory issues**: Large datasets may require additional memory

### Debug Mode

Set `NODE_ENV=development` for detailed logging:

```json
{
  "mcpServers": {
    "meta-analysis": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/project",
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

## Next Steps

After completing your meta-analysis:

1. **Review results**: Check for clinical significance beyond statistical significance
2. **Sensitivity analysis**: Test robustness by excluding studies
3. **Subgroup analysis**: Analyze different populations or interventions
4. **Update analysis**: Add new studies as they become available

## Support

For issues or questions:
- Check the error logs in your session directory
- Review the R console output for statistical warnings
- Ensure all required packages are properly installed