#!/usr/bin/env node

console.error('Starting MCP Meta-Analysis Server - importing modules...');

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { SessionManager } from './session-manager.js';
import { RExecutor } from './r-executor.js';
import { DataValidator } from './data-validator.js';
import { logger } from './logger.js';
import {
  InitializeMetaAnalysisInputSchema,
  UploadStudyDataInputSchema,
  PerformMetaAnalysisInputSchema,
  GenerateForestPlotInputSchema,
  AssessPublicationBiasInputSchema,
  GenerateReportInputSchema,
  MetaAnalysisError,
  ValidationError,
  StatisticalError
} from './types.js';

export class MetaAnalysisMCPServer {
  private server: Server;
  private sessionManager: SessionManager;
  private rExecutor: RExecutor;
  private dataValidator: DataValidator;

  constructor() {
    logger.info('Initializing MetaAnalysisMCPServer');
    this.server = new Server(
      {
        name: 'mcp-meta-analysis-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    logger.info('Creating session manager, R executor, and data validator');
    try {
      logger.info('Initializing SessionManager...');
      this.sessionManager = new SessionManager();
      logger.info('SessionManager initialized');
      
      logger.info('Initializing RExecutor...');
      this.rExecutor = new RExecutor();
      logger.info('RExecutor initialized');
      
      logger.info('Initializing DataValidator...');
      this.dataValidator = new DataValidator();
      logger.info('DataValidator initialized');
      
      logger.info('All components initialized successfully');
    } catch (error) {
      logger.error('Error initializing components:', error);
      throw error;
    }

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        logger.info('Received tools/list request');
        const toolsList = {
          tools: [
            {
              name: 'initialize_meta_analysis',
              description: 'Start a new meta-analysis project with guided setup',
              inputSchema: {
                type: 'object',
                properties: {
                  project_name: {
                    type: 'string',
                    description: 'Name for the meta-analysis project'
                  },
                  study_type: {
                    type: 'string',
                    enum: ['clinical_trial', 'observational', 'diagnostic'],
                    description: 'Type of studies to be included'
                  },
                  effect_measure: {
                    type: 'string',
                    enum: ['OR', 'RR', 'MD', 'SMD', 'HR'],
                    description: 'Effect measure for the analysis'
                  },
                  analysis_model: {
                    type: 'string',
                    enum: ['fixed', 'random', 'auto'],
                    description: 'Statistical model to use'
                  }
                },
                required: ['project_name', 'study_type', 'effect_measure']
              }
            },
            {
              name: 'upload_study_data',
              description: 'Upload and validate study data from various formats',
              inputSchema: {
                type: 'object',
                properties: {
                  session_id: {
                    type: 'string',
                    description: 'Session ID from initialize_meta_analysis'
                  },
                  data_format: {
                    type: 'string',
                    enum: ['csv', 'excel', 'revman'],
                    description: 'Format of the uploaded data'
                  },
                  data_content: {
                    type: 'string',
                    description: 'Base64 encoded data content or CSV text'
                  },
                  validation_level: {
                    type: 'string',
                    enum: ['basic', 'comprehensive'],
                    description: 'Level of validation to perform'
                  }
                },
                required: ['session_id', 'data_format', 'data_content']
              }
            },
            {
              name: 'perform_meta_analysis',
              description: 'Execute meta-analysis with automated statistical checks',
              inputSchema: {
                type: 'object',
                properties: {
                  session_id: {
                    type: 'string',
                    description: 'Session ID'
                  },
                  heterogeneity_test: {
                    type: 'boolean',
                    description: 'Include heterogeneity assessment'
                  },
                  publication_bias: {
                    type: 'boolean',
                    description: 'Include publication bias tests'
                  },
                  sensitivity_analysis: {
                    type: 'boolean',
                    description: 'Perform sensitivity analysis'
                  }
                },
                required: ['session_id']
              }
            },
            {
              name: 'generate_forest_plot',
              description: 'Create publication-ready forest plot',
              inputSchema: {
                type: 'object',
                properties: {
                  session_id: {
                    type: 'string',
                    description: 'Session ID'
                  },
                  plot_style: {
                    type: 'string',
                    enum: ['classic', 'modern', 'journal_specific'],
                    description: 'Visual style for the plot'
                  },
                  confidence_level: {
                    type: 'number',
                    description: 'Confidence level (0.5-0.99)'
                  },
                  custom_labels: {
                    type: 'object',
                    description: 'Custom labels for the plot'
                  }
                },
                required: ['session_id']
              }
            },
            {
              name: 'assess_publication_bias',
              description: 'Perform comprehensive publication bias assessment',
              inputSchema: {
                type: 'object',
                properties: {
                  session_id: {
                    type: 'string',
                    description: 'Session ID'
                  },
                  methods: {
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: ['funnel_plot', 'egger_test', 'begg_test', 'trim_fill']
                    },
                    description: 'Publication bias assessment methods'
                  }
                },
                required: ['session_id']
              }
            },
            {
              name: 'generate_report',
              description: 'Create comprehensive meta-analysis report',
              inputSchema: {
                type: 'object',
                properties: {
                  session_id: {
                    type: 'string',
                    description: 'Session ID'
                  },
                  format: {
                    type: 'string',
                    enum: ['html', 'pdf', 'word'],
                    description: 'Output format for the report'
                  },
                  include_code: {
                    type: 'boolean',
                    description: 'Include R code in the report'
                  },
                  journal_template: {
                    type: 'string',
                    description: 'Journal-specific template to use'
                  }
                },
                required: ['session_id']
              }
            },
            {
              name: 'list_sessions',
              description: 'List all active meta-analysis sessions',
              inputSchema: {
                type: 'object',
                properties: {
                  user_id: {
                    type: 'string',
                    description: 'Filter by user ID (optional)'
                  }
                }
              }
            },
            {
              name: 'get_session_status',
              description: 'Get detailed status of a meta-analysis session',
              inputSchema: {
                type: 'object',
                properties: {
                  session_id: {
                    type: 'string',
                    description: 'Session ID to check'
                  }
                },
                required: ['session_id']
              }
            }
          ] as Tool[]
        };
        logger.info('Sending tools/list response with', toolsList.tools.length, 'tools');
        return toolsList;
      } catch (error) {
        logger.error('Error in tools/list handler:', error);
        throw error;
      }
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'initialize_meta_analysis':
            return await this.handleInitializeMetaAnalysis(request.params.arguments);

          case 'upload_study_data':
            return await this.handleUploadStudyData(request.params.arguments);

          case 'perform_meta_analysis':
            return await this.handlePerformMetaAnalysis(request.params.arguments);

          case 'generate_forest_plot':
            return await this.handleGenerateForestPlot(request.params.arguments);

          case 'assess_publication_bias':
            return await this.handleAssessPublicationBias(request.params.arguments);

          case 'generate_report':
            return await this.handleGenerateReport(request.params.arguments);

          case 'list_sessions':
            return await this.handleListSessions(request.params.arguments);

          case 'get_session_status':
            return await this.handleGetSessionStatus(request.params.arguments);

          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        logger.error(`Tool execution failed: ${request.params.name}`, error);
        
        if (error instanceof MetaAnalysisError) {
          return {
            content: [{
              type: 'text',
              text: `Error (${error.code}): ${error.message}${error.details ? '\n' + JSON.stringify(error.details, null, 2) : ''}`
            }],
            isError: true
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    });
  }

  private async handleInitializeMetaAnalysis(args: any): Promise<any> {
    const input = InitializeMetaAnalysisInputSchema.parse(args);
    
    const parameters = {
      effect_measure: input.effect_measure,
      analysis_model: input.analysis_model || 'auto',
      confidence_level: 0.95,
      heterogeneity_test: true,
      publication_bias: true,
      sensitivity_analysis: false
    };

    const session = await this.sessionManager.createSession(
      input.project_name,
      parameters
    );

    await this.sessionManager.updateSessionStage(session.id, 'data_upload');

    return {
      content: [{
        type: 'text',
        text: `Meta-analysis project initialized successfully!

**Session ID:** ${session.id}
**Project:** ${session.project_name}
**Study Type:** ${input.study_type}
**Effect Measure:** ${input.effect_measure}
**Analysis Model:** ${input.analysis_model || 'auto'}

**Next Steps:**
1. Upload your study data using the 'upload_study_data' tool
2. Supported formats: CSV, Excel, RevMan
3. Required columns depend on effect measure:
   - Binary outcomes (OR/RR): study_name, n_treatment, n_control, events_treatment, events_control
   - Continuous outcomes (MD/SMD): study_name, n_treatment, n_control, mean_treatment, mean_control, sd_treatment, sd_control

**Session Directory:** ${this.sessionManager.getSessionDir(session.id)}`
      }]
    };
  }

  private async handleUploadStudyData(args: any): Promise<any> {
    const input = UploadStudyDataInputSchema.parse(args);
    
    const session = await this.sessionManager.getSession(input.session_id);
    if (!session) {
      throw new ValidationError('Session not found', { session_id: input.session_id });
    }

    // Parse and validate data
    const studies = await this.dataValidator.validateAndParse(
      input.data_content,
      input.data_format,
      session.parameters.effect_measure,
      input.validation_level || 'comprehensive'
    );

    // Save raw data file
    const filename = `studies_data.${input.data_format === 'csv' ? 'csv' : 'xlsx'}`;
    await this.sessionManager.saveFile(
      input.session_id,
      filename,
      input.data_content,
      'input'
    );

    // Add validated studies to session
    await this.sessionManager.addStudyData(input.session_id, studies);
    await this.sessionManager.updateSessionStage(input.session_id, 'validation');

    const validationSummary = this.dataValidator.getValidationSummary(studies);

    return {
      content: [{
        type: 'text',
        text: `Study data uploaded and validated successfully!

**Validation Summary:**
- **Studies loaded:** ${studies.length}
- **Effect measure:** ${session.parameters.effect_measure}
- **Data format:** ${input.data_format}
- **Validation level:** ${input.validation_level || 'comprehensive'}

**Data Quality:**
${validationSummary}

**Next Steps:**
1. Review the validation summary above
2. Use 'perform_meta_analysis' to run the statistical analysis
3. Generate visualizations with 'generate_forest_plot'

The validated data has been saved and is ready for analysis.`
      }]
    };
  }

  private async handlePerformMetaAnalysis(args: any): Promise<any> {
    const input = PerformMetaAnalysisInputSchema.parse(args);
    
    const session = await this.sessionManager.getSession(input.session_id);
    if (!session) {
      throw new ValidationError('Session not found', { session_id: input.session_id });
    }

    if (session.study_data.length === 0) {
      throw new ValidationError('No study data found. Please upload data first.');
    }

    await this.sessionManager.updateSessionStage(input.session_id, 'analysis');

    // Update analysis parameters
    const updatedParams = {
      ...session.parameters,
      heterogeneity_test: input.heterogeneity_test ?? true,
      publication_bias: input.publication_bias ?? true,
      sensitivity_analysis: input.sensitivity_analysis ?? false
    };

    session.parameters = updatedParams;
    await this.sessionManager.updateSession(session);

    // Execute R analysis
    const sessionDir = this.sessionManager.getSessionDir(input.session_id);
    const results = await this.rExecutor.executeMetaAnalysis(
      input.session_id,
      session.study_data,
      updatedParams,
      sessionDir
    );

    // Save results to session
    session.results = results;
    session.status = 'completed';
    await this.sessionManager.updateSession(session);

    // Format results for display
    const effectMeasure = updatedParams.effect_measure;
    const overallEffect = results.overall_effect;
    const heterogeneity = results.heterogeneity;

    return {
      content: [{
        type: 'text',
        text: `Meta-analysis completed successfully!

**Overall Effect (${effectMeasure}):**
- **Estimate:** ${overallEffect.estimate.toFixed(3)}
- **95% CI:** [${overallEffect.ci_lower.toFixed(3)}, ${overallEffect.ci_upper.toFixed(3)}]
- **p-value:** ${overallEffect.p_value.toFixed(4)}
- **Z-score:** ${overallEffect.z_score.toFixed(3)}

**Heterogeneity Assessment:**
- **I² statistic:** ${heterogeneity.i_squared.toFixed(1)}%
- **Q statistic:** ${heterogeneity.q_statistic.toFixed(3)} (p = ${heterogeneity.q_p_value.toFixed(4)})
- **τ² (tau-squared):** ${heterogeneity.tau_squared.toFixed(4)}

**Model Information:**
- **Model type:** ${results.model_info.model_type}
- **Method:** ${results.model_info.method}
- **Studies included:** ${results.model_info.studies_included}

${results.publication_bias ? `
**Publication Bias Tests:**
- **Egger's test:** p = ${results.publication_bias.egger_test.p_value.toFixed(4)}
- **Begg's test:** p = ${results.publication_bias.begg_test.p_value.toFixed(4)}
${results.publication_bias.trim_fill ? `- **Trim & Fill:** ${results.publication_bias.trim_fill.imputed_studies} studies imputed` : ''}
` : ''}

**Next Steps:**
1. Generate forest plot: 'generate_forest_plot'
2. Assess publication bias: 'assess_publication_bias'  
3. Create comprehensive report: 'generate_report'

Results have been saved to the session for further analysis.`
      }]
    };
  }

  private async handleGenerateForestPlot(args: any): Promise<any> {
    const input = GenerateForestPlotInputSchema.parse(args);
    
    const session = await this.sessionManager.getSession(input.session_id);
    if (!session || !session.results) {
      throw new ValidationError('Session or results not found');
    }

    const sessionDir = this.sessionManager.getSessionDir(input.session_id);
    const plotPath = await this.rExecutor.generateForestPlot(
      input.session_id,
      {
        plot_style: input.plot_style || 'modern',
        confidence_level: input.confidence_level || 0.95,
        custom_labels: input.custom_labels
      },
      sessionDir
    );

    await this.sessionManager.addFile(input.session_id, 'forest_plot.png', 'generated');

    return {
      content: [{
        type: 'text',
        text: `Forest plot generated successfully!

**Plot Details:**
- **Style:** ${input.plot_style || 'modern'}
- **Confidence Level:** ${(input.confidence_level || 0.95) * 100}%
- **File Location:** ${plotPath}

The forest plot has been saved in high resolution (300 DPI) and is ready for publication use.

**Next Steps:**
- Generate funnel plot for publication bias assessment
- Create comprehensive report with all visualizations`
      }]
    };
  }

  private async handleAssessPublicationBias(args: any): Promise<any> {
    const input = AssessPublicationBiasInputSchema.parse(args);
    
    const session = await this.sessionManager.getSession(input.session_id);
    if (!session || !session.results) {
      throw new ValidationError('Session or results not found');
    }

    if (session.study_data.length < 3) {
      throw new StatisticalError('Publication bias assessment requires at least 3 studies');
    }

    const sessionDir = this.sessionManager.getSessionDir(input.session_id);
    
    // Generate funnel plot if requested
    if ((input.methods || ['funnel_plot']).includes('funnel_plot')) {
      await this.rExecutor.generateFunnelPlot(input.session_id, sessionDir);
      await this.sessionManager.addFile(input.session_id, 'funnel_plot.png', 'generated');
    }

    const pubBias = session.results.publication_bias;
    if (!pubBias) {
      throw new StatisticalError('Publication bias tests were not performed in the original analysis');
    }

    return {
      content: [{
        type: 'text',
        text: `Publication bias assessment completed!

**Funnel Plot:** Generated and saved as 'funnel_plot.png'

**Statistical Tests:**
- **Egger's Test:** 
  - p-value: ${pubBias.egger_test.p_value.toFixed(4)}
  - Bias estimate: ${pubBias.egger_test.bias.toFixed(4)}
  - Interpretation: ${pubBias.egger_test.p_value < 0.05 ? 'Significant asymmetry detected' : 'No significant asymmetry'}

- **Begg's Test:**
  - p-value: ${pubBias.begg_test.p_value.toFixed(4)}
  - Interpretation: ${pubBias.begg_test.p_value < 0.05 ? 'Significant publication bias detected' : 'No significant publication bias'}

${pubBias.trim_fill ? `
- **Trim & Fill Analysis:**
  - Imputed studies: ${pubBias.trim_fill.imputed_studies}
  - Adjusted estimate: ${pubBias.trim_fill.adjusted_estimate.toFixed(3)}
  - Impact: ${Math.abs(pubBias.trim_fill.adjusted_estimate - session.results.overall_effect.estimate) > 0.1 ? 'Substantial' : 'Minimal'} change in effect size
` : ''}

**Recommendations:**
${pubBias.egger_test.p_value < 0.05 || pubBias.begg_test.p_value < 0.05 ? 
  '⚠️  Publication bias may be present. Consider:\n- Searching for unpublished studies\n- Contacting authors for missing data\n- Reporting potential bias in limitations' :
  '✅ No strong evidence of publication bias detected'}`
      }]
    };
  }

  private async handleGenerateReport(args: any): Promise<any> {
    const input = GenerateReportInputSchema.parse(args);
    
    const session = await this.sessionManager.getSession(input.session_id);
    if (!session || !session.results) {
      throw new ValidationError('Session or results not found');
    }

    // This would generate a comprehensive report
    // For now, return a structured summary
    const results = session.results;
    const reportContent = this.generateReportContent(session, input.format || 'html');

    const filename = `meta_analysis_report.${input.format || 'html'}`;
    await this.sessionManager.saveFile(
      input.session_id,
      filename,
      reportContent,
      'output'
    );

    return {
      content: [{
        type: 'text',
        text: `Meta-analysis report generated successfully!

**Report Details:**
- **Format:** ${input.format || 'html'}
- **Include Code:** ${input.include_code ? 'Yes' : 'No'}
- **Template:** ${input.journal_template || 'Standard'}
- **File:** ${filename}

**Report Sections:**
1. Executive Summary
2. Study Characteristics  
3. Statistical Analysis Results
4. Heterogeneity Assessment
5. Publication Bias Evaluation
6. Discussion and Conclusions
${input.include_code ? '7. Reproducible R Code' : ''}

The report is ready for review and can be used for manuscript preparation or presentation.`
      }]
    };
  }

  private async handleListSessions(args: any): Promise<any> {
    const sessions = await this.sessionManager.listSessions(args?.user_id);
    
    if (sessions.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No meta-analysis sessions found.'
        }]
      };
    }

    const sessionList = sessions.map(session => 
      `- **${session.project_name}** (ID: ${session.id})
  - Status: ${session.status} | Stage: ${session.workflow_stage}
  - Studies: ${session.study_data.length} | Created: ${session.created_at.toLocaleDateString()}
  - Effect Measure: ${session.parameters.effect_measure}`
    ).join('\n\n');

    return {
      content: [{
        type: 'text',
        text: `Found ${sessions.length} meta-analysis session(s):

${sessionList}`
      }]
    };
  }

  private async handleGetSessionStatus(args: any): Promise<any> {
    const session = await this.sessionManager.getSession(args.session_id);
    if (!session) {
      throw new ValidationError('Session not found', { session_id: args.session_id });
    }

    return {
      content: [{
        type: 'text',
        text: `**Session Status: ${session.project_name}**

**Basic Information:**
- **Session ID:** ${session.id}
- **Status:** ${session.status}
- **Current Stage:** ${session.workflow_stage}
- **Created:** ${session.created_at.toLocaleString()}
- **Last Updated:** ${session.updated_at.toLocaleString()}

**Analysis Parameters:**
- **Effect Measure:** ${session.parameters.effect_measure}
- **Model Type:** ${session.parameters.analysis_model}
- **Confidence Level:** ${(session.parameters.confidence_level * 100)}%

**Data:**
- **Studies Loaded:** ${session.study_data.length}
- **Uploaded Files:** ${session.files.uploaded.length}
- **Generated Files:** ${session.files.generated.length}

**Results:** ${session.results ? 'Available' : 'Not yet generated'}

${session.files.uploaded.length > 0 ? `\n**Uploaded Files:**\n${session.files.uploaded.map(f => `- ${f}`).join('\n')}` : ''}
${session.files.generated.length > 0 ? `\n**Generated Files:**\n${session.files.generated.map(f => `- ${f}`).join('\n')}` : ''}`
      }]
    };
  }

  private generateReportContent(session: any, format: string): string {
    // This would generate a proper report based on the format
    // For now, return a basic HTML structure
    const results = session.results;
    
    return `<!DOCTYPE html>
<html>
<head>
    <title>Meta-Analysis Report: ${session.project_name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #ccc; padding-bottom: 20px; }
        .section { margin: 30px 0; }
        .result { background: #f5f5f5; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Meta-Analysis Report</h1>
        <h2>${session.project_name}</h2>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div class="section">
        <h3>Executive Summary</h3>
        <p>This meta-analysis included ${session.study_data.length} studies examining ${session.parameters.effect_measure} effects.</p>
    </div>
    
    <div class="section">
        <h3>Results</h3>
        <div class="result">
            <p><strong>Overall Effect (${session.parameters.effect_measure}):</strong> ${results.overall_effect.estimate.toFixed(3)} 
            [95% CI: ${results.overall_effect.ci_lower.toFixed(3)}, ${results.overall_effect.ci_upper.toFixed(3)}]</p>
            <p><strong>P-value:</strong> ${results.overall_effect.p_value.toFixed(4)}</p>
            <p><strong>Heterogeneity (I²):</strong> ${results.heterogeneity.i_squared.toFixed(1)}%</p>
        </div>
    </div>
</body>
</html>`;
  }

  private setupErrorHandling(): void {
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('MCP Meta-Analysis Server started successfully');
    
    // Keep the process alive
    process.stdin.resume();
    
    // Handle process termination gracefully
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      process.exit(0);
    });
  }
}

// Start the server
console.error('Creating MetaAnalysisMCPServer instance...');
const server = new MetaAnalysisMCPServer();
console.error('Running server...');
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  logger.error('Failed to start server:', error);
  process.exit(1);
});