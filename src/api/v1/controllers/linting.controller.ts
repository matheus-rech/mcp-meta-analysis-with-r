import { IntelligentLintingPipeline, LintingPipelineConfig } from '../../../linting/intelligent-linting-pipeline.js';
import { logger } from '../../../logger.js';
import { ValidationError } from '../../../types.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';

export class LintingController {
  private pipelines: Map<string, IntelligentLintingPipeline>;
  private lintJobs: Map<string, any>;

  constructor() {
    this.pipelines = new Map();
    this.lintJobs = new Map();
  }

  /**
   * Create intelligent linting pipeline
   */
  async createLintingPipeline(config: Partial<LintingPipelineConfig>) {
    const pipelineId = uuidv4();
    const apiKey = process.env.ANTHROPIC_API_KEY || config.anthropicApiKey;
    
    if (!apiKey) {
      throw new ValidationError('Anthropic API key required for intelligent linting');
    }

    const pipeline = new IntelligentLintingPipeline({
      anthropicApiKey: apiKey,
      model: config.model || 'claude-3-opus-20240229',
      languages: config.languages || ['r', 'python', 'typescript'],
      enableAIEnhancement: config.enableAIEnhancement ?? true,
      outputFormat: config.outputFormat || 'markdown',
      customRules: config.customRules
    });

    this.pipelines.set(pipelineId, pipeline);

    logger.info('Linting pipeline created', { pipelineId });

    return {
      pipelineId,
      config: {
        model: config.model || 'claude-3-opus-20240229',
        languages: config.languages || ['r', 'python', 'typescript'],
        enableAIEnhancement: config.enableAIEnhancement ?? true,
        outputFormat: config.outputFormat || 'markdown'
      },
      capabilities: {
        languages: ['r', 'python', 'typescript'],
        features: [
          'traditional-linting',
          'ai-enhanced-review',
          'statistical-validation',
          'performance-analysis',
          'security-scanning',
          'auto-fix-suggestions'
        ],
        rSpecific: [
          'lintr-integration',
          'roxygen2-validation',
          'meta-analysis-checks',
          'reproducibility-scoring'
        ]
      }
    };
  }

  /**
   * Lint a single file
   */
  async lintFile(pipelineId: string, filePath: string) {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new ValidationError('Pipeline not found', { pipelineId });
    }

    const jobId = uuidv4();
    
    // Start async linting
    const lintPromise = pipeline.lintFile(filePath);
    
    this.lintJobs.set(jobId, {
      type: 'file',
      status: 'running',
      filePath,
      startedAt: new Date()
    });

    // Process in background
    lintPromise.then(result => {
      this.lintJobs.set(jobId, {
        ...this.lintJobs.get(jobId),
        status: 'completed',
        result,
        completedAt: new Date()
      });
    }).catch(error => {
      this.lintJobs.set(jobId, {
        ...this.lintJobs.get(jobId),
        status: 'failed',
        error: error.message,
        completedAt: new Date()
      });
    });

    return {
      jobId,
      pipelineId,
      type: 'file',
      filePath,
      status: 'processing',
      links: {
        status: `/api/v1/linting/jobs/${jobId}`,
        result: `/api/v1/linting/jobs/${jobId}/result`
      }
    };
  }

  /**
   * Lint entire project
   */
  async lintProject(pipelineId: string, projectPath: string) {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new ValidationError('Pipeline not found', { pipelineId });
    }

    const jobId = uuidv4();
    
    // Setup progress tracking
    pipeline.on('pipeline:progress', (data) => {
      const job = this.lintJobs.get(jobId);
      if (job) {
        job.progress = {
          processed: data.processed,
          total: data.total,
          percentage: Math.round((data.processed / data.total) * 100)
        };
      }
    });

    // Start async project linting
    const lintPromise = pipeline.lintProject(projectPath);
    
    this.lintJobs.set(jobId, {
      type: 'project',
      status: 'running',
      projectPath,
      startedAt: new Date(),
      progress: { processed: 0, total: 0, percentage: 0 }
    });

    // Process in background
    lintPromise.then(async (result) => {
      // Generate report
      const reportPath = path.join(
        process.cwd(),
        'reports',
        `lint_report_${jobId}.md`
      );
      await fs.ensureDir(path.dirname(reportPath));
      await pipeline.generateReport(result, reportPath);

      this.lintJobs.set(jobId, {
        ...this.lintJobs.get(jobId),
        status: 'completed',
        result,
        reportPath,
        completedAt: new Date()
      });
    }).catch(error => {
      this.lintJobs.set(jobId, {
        ...this.lintJobs.get(jobId),
        status: 'failed',
        error: error.message,
        completedAt: new Date()
      });
    });

    return {
      jobId,
      pipelineId,
      type: 'project',
      projectPath,
      status: 'processing',
      links: {
        status: `/api/v1/linting/jobs/${jobId}`,
        result: `/api/v1/linting/jobs/${jobId}/result`,
        report: `/api/v1/linting/jobs/${jobId}/report`
      }
    };
  }

  /**
   * Get linting job status
   */
  async getJobStatus(jobId: string) {
    const job = this.lintJobs.get(jobId);
    if (!job) {
      throw new ValidationError('Job not found', { jobId });
    }

    return {
      jobId,
      type: job.type,
      status: job.status,
      progress: job.progress,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error
    };
  }

  /**
   * Get linting results
   */
  async getJobResult(jobId: string) {
    const job = this.lintJobs.get(jobId);
    if (!job) {
      throw new ValidationError('Job not found', { jobId });
    }

    if (job.status !== 'completed') {
      throw new ValidationError('Job not completed', { jobId, status: job.status });
    }

    return job.result;
  }

  /**
   * Download lint report
   */
  async downloadReport(jobId: string) {
    const job = this.lintJobs.get(jobId);
    if (!job || !job.reportPath) {
      throw new ValidationError('Report not found', { jobId });
    }

    const stream = fs.createReadStream(job.reportPath);
    const filename = path.basename(job.reportPath);

    return {
      stream,
      filename,
      contentType: 'text/markdown'
    };
  }

  /**
   * Apply auto-fixes
   */
  async applyAutoFixes(pipelineId: string, filePath: string, issueIds: string[]) {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new ValidationError('Pipeline not found', { pipelineId });
    }

    // Get the lint results first
    const lintResult = await pipeline.lintFile(filePath);
    
    // Filter issues to fix
    const issuesToFix = lintResult.issues.filter((issue, index) => 
      issueIds.includes(`issue-${index}`)
    );

    // Apply fixes
    const fixResult = await pipeline.autoFix(filePath, issuesToFix);

    logger.info('Auto-fixes applied', { 
      filePath, 
      fixed: fixResult.fixed,
      remaining: fixResult.remaining 
    });

    return {
      filePath,
      fixed: fixResult.fixed,
      remaining: fixResult.remaining,
      backupPath: fixResult.backupPath,
      message: `Applied ${fixResult.fixed} fixes. Original file backed up to ${fixResult.backupPath}`
    };
  }

  /**
   * Get linting statistics
   */
  async getLintingStats() {
    const stats = {
      activePipelines: this.pipelines.size,
      totalJobs: this.lintJobs.size,
      jobsByStatus: {
        running: 0,
        completed: 0,
        failed: 0
      },
      jobsByType: {
        file: 0,
        project: 0
      }
    };

    for (const [_, job] of this.lintJobs) {
      stats.jobsByStatus[job.status as keyof typeof stats.jobsByStatus]++;
      stats.jobsByType[job.type as keyof typeof stats.jobsByType]++;
    }

    return stats;
  }

  /**
   * Get R-specific linting rules
   */
  getRLintingRules() {
    return {
      categories: {
        style: {
          name: 'Code Style',
          rules: [
            'line_length_linter: Max 120 characters per line',
            'object_name_linter: Use snake_case for objects',
            'assignment_linter: Use <- for assignment, not =',
            'spaces_left_parentheses_linter: Space before (',
            'commas_linter: Space after commas'
          ]
        },
        correctness: {
          name: 'Correctness',
          rules: [
            'T_and_F_symbol_linter: Use TRUE/FALSE not T/F',
            'equals_na_linter: Use is.na() not == NA',
            'implicit_integer_linter: Use 1L for integers',
            'undesirable_function_linter: Avoid attach(), setwd()'
          ]
        },
        efficiency: {
          name: 'Efficiency',
          rules: [
            'seq_linter: Use seq_len() or seq_along()',
            'unnecessary_concatenation_linter: Avoid c() with single element',
            'vector_logic_linter: Use && and || for scalars'
          ]
        },
        metaAnalysis: {
          name: 'Meta-Analysis Specific',
          rules: [
            'set.seed() required for reproducibility',
            'Document effect size calculations',
            'Include sensitivity analyses',
            'Save all intermediate results',
            'Use established packages (meta, metafor)'
          ]
        }
      },
      customizable: true,
      aiEnhanced: [
        'Statistical methodology validation',
        'Reproducibility scoring',
        'Performance optimization suggestions',
        'Security vulnerability detection'
      ]
    };
  }
}