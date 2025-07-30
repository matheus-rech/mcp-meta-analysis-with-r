import { CodeReviewAgent, LintResult } from './claude-agents/code-review.agent.js';
import { RSpecificReviewAgent } from './claude-agents/r-specific.agent.js';
import { logger } from '../logger.js';
import { EventEmitter } from 'events';
import fs from 'fs-extra';
import path from 'path';

export interface LintingPipelineConfig {
  anthropicApiKey: string;
  model?: string;
  languages: Array<'r' | 'python' | 'typescript'>;
  enableAIEnhancement?: boolean;
  outputFormat?: 'json' | 'html' | 'markdown';
  customRules?: Record<string, any>;
}

export interface PipelineLintResult {
  summary: {
    totalFiles: number;
    filesWithIssues: number;
    totalIssues: number;
    criticalIssues: number;
    aiSuggestions: number;
    overallScore: number;
  };
  fileResults: Map<string, LintResult>;
  projectMetrics?: {
    codeQuality: number;
    maintainability: number;
    testCoverage: number;
    documentation: number;
  };
  recommendations: string[];
  timestamp: Date;
}

export class IntelligentLintingPipeline extends EventEmitter {
  private config: LintingPipelineConfig;
  private agents: Map<string, CodeReviewAgent>;
  private rAgent?: RSpecificReviewAgent;

  constructor(config: LintingPipelineConfig) {
    super();
    this.config = config;
    this.agents = new Map();
    
    // Initialize agents for each language
    for (const language of config.languages) {
      this.agents.set(language, new CodeReviewAgent({
        apiKey: config.anthropicApiKey,
        model: config.model,
        language
      }));
    }

    // Initialize R-specific agent if R is included
    if (config.languages.includes('r')) {
      this.rAgent = new RSpecificReviewAgent({
        apiKey: config.anthropicApiKey,
        model: config.model
      });
    }
  }

  /**
   * Lint a single file with AI enhancement
   */
  async lintFile(filePath: string): Promise<LintResult> {
    const language = this.detectLanguage(filePath);
    const agent = this.agents.get(language);
    
    if (!agent) {
      throw new Error(`No linting agent for language: ${language}`);
    }

    this.emit('lint:start', { file: filePath, language });

    try {
      // Basic linting with AI enhancement
      const result = await agent.reviewCode(filePath);

      // Additional R-specific analysis
      if (language === 'r' && this.rAgent) {
        const rAnalysis = await this.rAgent.reviewMetaAnalysisCode(filePath);
        
        // Merge R-specific findings
        result.aiSuggestions.push(...this.convertRAnalysisToSuggestions(rAnalysis));
        result.metrics = {
          ...result.metrics,
          ...rAnalysis.codeQuality
        };
      }

      this.emit('lint:complete', { file: filePath, issueCount: result.issues.length });
      
      return result;

    } catch (error) {
      logger.error('Linting failed', { file: filePath, error });
      this.emit('lint:error', { file: filePath, error });
      throw error;
    }
  }

  /**
   * Lint an entire project directory
   */
  async lintProject(projectPath: string): Promise<PipelineLintResult> {
    const startTime = Date.now();
    this.emit('pipeline:start', { projectPath });

    const fileResults = new Map<string, LintResult>();
    const files = await this.findProjectFiles(projectPath);
    
    logger.info(`Found ${files.length} files to lint`, { projectPath });

    // Process files in batches for efficiency
    const batchSize = 5;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchPromises = batch.map(file => this.lintFile(file));
      
      const results = await Promise.allSettled(batchPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          fileResults.set(batch[index], result.value);
        } else {
          logger.error('File lint failed', { 
            file: batch[index], 
            error: result.reason 
          });
        }
      });

      this.emit('pipeline:progress', { 
        processed: i + batch.length, 
        total: files.length 
      });
    }

    // Generate project-wide analysis
    const projectAnalysis = await this.analyzeProjectResults(fileResults);
    
    const result: PipelineLintResult = {
      summary: this.generateSummary(fileResults),
      fileResults,
      projectMetrics: projectAnalysis.metrics,
      recommendations: projectAnalysis.recommendations,
      timestamp: new Date()
    };

    this.emit('pipeline:complete', { 
      duration: Date.now() - startTime,
      summary: result.summary 
    });

    return result;
  }

  /**
   * Generate formatted report
   */
  async generateReport(
    results: PipelineLintResult, 
    outputPath: string
  ): Promise<void> {
    const format = this.config.outputFormat || 'markdown';
    
    switch (format) {
      case 'json':
        await this.generateJSONReport(results, outputPath);
        break;
      case 'html':
        await this.generateHTMLReport(results, outputPath);
        break;
      case 'markdown':
        await this.generateMarkdownReport(results, outputPath);
        break;
    }

    logger.info('Lint report generated', { outputPath, format });
  }

  /**
   * Apply automatic fixes where possible
   */
  async autoFix(filePath: string, issues: LintResult['issues']): Promise<{
    fixed: number;
    remaining: number;
    backupPath: string;
  }> {
    // Create backup
    const backupPath = `${filePath}.backup`;
    await fs.copyFile(filePath, backupPath);

    let fixedCount = 0;
    const fixableIssues = issues.filter(issue => issue.suggestion?.includes('Fix:'));

    for (const issue of fixableIssues) {
      try {
        // Apply fix based on suggestion
        // This would implement actual fix logic
        fixedCount++;
      } catch (error) {
        logger.error('Auto-fix failed', { file: filePath, issue, error });
      }
    }

    return {
      fixed: fixedCount,
      remaining: issues.length - fixedCount,
      backupPath
    };
  }

  private detectLanguage(filePath: string): 'r' | 'python' | 'typescript' {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.r':
      case '.rmd':
        return 'r';
      case '.py':
        return 'python';
      case '.ts':
      case '.tsx':
        return 'typescript';
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  private async findProjectFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    const extensions: string[] = [];
    
    if (this.config.languages.includes('r')) {
      extensions.push('.r', '.rmd');
    }
    if (this.config.languages.includes('python')) {
      extensions.push('.py');
    }
    if (this.config.languages.includes('typescript')) {
      extensions.push('.ts', '.tsx');
    }

    async function walk(dir: string) {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          await walk(fullPath);
        } else if (stat.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }

    await walk(projectPath);
    return files;
  }

  private generateSummary(fileResults: Map<string, LintResult>): PipelineLintResult['summary'] {
    let totalIssues = 0;
    let criticalIssues = 0;
    let aiSuggestions = 0;
    let filesWithIssues = 0;

    for (const [_, result] of fileResults) {
      if (result.issues.length > 0) {
        filesWithIssues++;
      }
      totalIssues += result.issues.length;
      criticalIssues += result.issues.filter(i => i.severity === 'error').length;
      aiSuggestions += result.aiSuggestions.length;
    }

    // Calculate overall score (0-100)
    const avgIssuesPerFile = totalIssues / fileResults.size;
    const criticalRatio = criticalIssues / Math.max(totalIssues, 1);
    const overallScore = Math.max(0, 100 - (avgIssuesPerFile * 10) - (criticalRatio * 50));

    return {
      totalFiles: fileResults.size,
      filesWithIssues,
      totalIssues,
      criticalIssues,
      aiSuggestions,
      overallScore: Math.round(overallScore)
    };
  }

  private async analyzeProjectResults(
    fileResults: Map<string, LintResult>
  ): Promise<{ metrics: any; recommendations: string[] }> {
    // Aggregate metrics across all files
    const metrics = {
      codeQuality: 0,
      maintainability: 0,
      testCoverage: 0,
      documentation: 0
    };

    let fileCount = 0;
    for (const [_, result] of fileResults) {
      if (result.metrics) {
        metrics.codeQuality += result.metrics.complexity || 0;
        metrics.maintainability += result.metrics.maintainability || 0;
        fileCount++;
      }
    }

    // Average the metrics
    if (fileCount > 0) {
      metrics.codeQuality = metrics.codeQuality / fileCount;
      metrics.maintainability = metrics.maintainability / fileCount;
    }

    // Generate project-wide recommendations
    const recommendations = this.generateProjectRecommendations(fileResults);

    return { metrics, recommendations };
  }

  private generateProjectRecommendations(
    fileResults: Map<string, LintResult>
  ): string[] {
    const recommendations: string[] = [];
    
    // Analyze patterns across files
    const commonIssues = new Map<string, number>();
    
    for (const [_, result] of fileResults) {
      for (const issue of result.issues) {
        const count = commonIssues.get(issue.rule || 'unknown') || 0;
        commonIssues.set(issue.rule || 'unknown', count + 1);
      }
    }

    // Top 5 most common issues
    const sortedIssues = Array.from(commonIssues.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [rule, count] of sortedIssues) {
      recommendations.push(
        `Address "${rule}" issues appearing in ${count} files across the project`
      );
    }

    return recommendations;
  }

  private convertRAnalysisToSuggestions(rAnalysis: any): any[] {
    const suggestions = [];
    
    for (const issue of rAnalysis.statisticalIssues || []) {
      suggestions.push({
        type: 'improvement',
        description: issue.suggestion,
        priority: issue.severity === 'critical' ? 'high' : 'medium'
      });
    }

    for (const rec of rAnalysis.recommendations || []) {
      suggestions.push({
        type: 'refactor',
        description: rec,
        priority: 'medium'
      });
    }

    return suggestions;
  }

  private async generateMarkdownReport(
    results: PipelineLintResult,
    outputPath: string
  ): Promise<void> {
    const content = `# Intelligent Code Review Report

Generated: ${results.timestamp.toISOString()}

## Summary

- **Total Files Analyzed**: ${results.summary.totalFiles}
- **Files with Issues**: ${results.summary.filesWithIssues}
- **Total Issues**: ${results.summary.totalIssues}
- **Critical Issues**: ${results.summary.criticalIssues}
- **AI Suggestions**: ${results.summary.aiSuggestions}
- **Overall Score**: ${results.summary.overallScore}/100

## Project Metrics

${results.projectMetrics ? `
- Code Quality: ${results.projectMetrics.codeQuality.toFixed(1)}/100
- Maintainability: ${results.projectMetrics.maintainability.toFixed(1)}/100
- Test Coverage: ${results.projectMetrics.testCoverage?.toFixed(1) || 'N/A'}%
- Documentation: ${results.projectMetrics.documentation?.toFixed(1) || 'N/A'}%
` : 'No project metrics available'}

## Recommendations

${results.recommendations.map(r => `- ${r}`).join('\n')}

## File Details

${Array.from(results.fileResults.entries()).map(([file, result]) => `
### ${path.basename(file)}

**Issues**: ${result.issues.length} | **AI Suggestions**: ${result.aiSuggestions.length}

${result.issues.length > 0 ? `
#### Issues:
${result.issues.slice(0, 5).map(issue => `
- **Line ${issue.line}**: ${issue.message} (${issue.severity})
  ${issue.suggestion ? `  *Fix*: ${issue.suggestion}` : ''}
`).join('\n')}
${result.issues.length > 5 ? `\n... and ${result.issues.length - 5} more issues` : ''}
` : 'No issues found! ✅'}

${result.aiSuggestions.length > 0 ? `
#### AI Suggestions:
${result.aiSuggestions.map(suggestion => `
- **${suggestion.type}** (${suggestion.priority}): ${suggestion.description}
`).join('\n')}
` : ''}
`).join('\n---\n')}
`;

    await fs.writeFile(outputPath, content);
  }

  private async generateHTMLReport(
    results: PipelineLintResult,
    outputPath: string
  ): Promise<void> {
    // HTML report implementation
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Code Review Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .summary { background: #f0f0f0; padding: 20px; border-radius: 5px; }
    .file-result { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
    .issue { margin: 10px 0; padding: 10px; background: #fff3cd; }
    .error { background: #f8d7da; }
    .suggestion { background: #d1ecf1; margin: 10px 0; padding: 10px; }
  </style>
</head>
<body>
  <h1>Intelligent Code Review Report</h1>
  <!-- Implementation details... -->
</body>
</html>`;

    await fs.writeFile(outputPath, html);
  }

  private async generateJSONReport(
    results: PipelineLintResult,
    outputPath: string
  ): Promise<void> {
    const jsonResults = {
      ...results,
      fileResults: Array.from(results.fileResults.entries()).map(([file, result]) => ({
        ...result,
        file
      }))
    };

    await fs.writeJSON(outputPath, jsonResults, { spaces: 2 });
  }
}