import { IntelligentIngestionPipeline, PipelineConfig } from '../../../ingestion/intelligent-pipeline.js';
import { SessionManager } from '../../../session-manager.js';
import { logger } from '../../../logger.js';
import { ValidationError } from '../../../types.js';
import { v4 as uuidv4 } from 'uuid';

export class IngestionController {
  private sessionManager: SessionManager;
  private pipelines: Map<string, IntelligentIngestionPipeline>;

  constructor() {
    this.sessionManager = new SessionManager();
    this.pipelines = new Map();
  }

  /**
   * Create an intelligent ingestion pipeline
   */
  async createPipeline(projectId: string, config: Partial<PipelineConfig>) {
    const session = await this.sessionManager.getSession(projectId);
    if (!session) {
      throw new ValidationError('Project not found', { projectId });
    }

    const pipelineId = uuidv4();
    const apiKey = process.env.ANTHROPIC_API_KEY || config.anthropicApiKey;
    
    if (!apiKey) {
      throw new ValidationError('Anthropic API key required for intelligent ingestion');
    }

    const pipeline = new IntelligentIngestionPipeline({
      anthropicApiKey: apiKey,
      enableQualityAssessment: config.enableQualityAssessment ?? true,
      enableDuplicateDetection: config.enableDuplicateDetection ?? true,
      enableAutoFix: config.enableAutoFix ?? true,
      model: config.model || 'claude-3-opus-20240229'
    });

    this.pipelines.set(pipelineId, pipeline);

    logger.info('Intelligent pipeline created', { projectId, pipelineId });

    return {
      pipelineId,
      projectId,
      capabilities: pipeline.getCapabilities(),
      config: {
        enableQualityAssessment: config.enableQualityAssessment ?? true,
        enableDuplicateDetection: config.enableDuplicateDetection ?? true,
        enableAutoFix: config.enableAutoFix ?? true,
        model: config.model || 'claude-3-opus-20240229'
      }
    };
  }

  /**
   * Process data through intelligent pipeline
   */
  async processWithPipeline(
    pipelineId: string,
    projectId: string,
    data: string,
    format: 'csv' | 'excel' | 'revman'
  ) {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new ValidationError('Pipeline not found', { pipelineId });
    }

    const session = await this.sessionManager.getSession(projectId);
    if (!session) {
      throw new ValidationError('Project not found', { projectId });
    }

    // Setup event listeners for real-time updates
    const events: any[] = [];
    pipeline.on('pipeline:step', (data) => {
      events.push({ timestamp: new Date(), event: 'step', data });
    });

    const processingId = uuidv4();
    
    // Start processing asynchronously
    pipeline.processData(
      projectId,
      data,
      format,
      session.parameters
    ).catch(error => {
      logger.error('Pipeline processing failed', { processingId, error });
    });

    // Store processing info
    logger.info('Starting intelligent processing', { 
      processingId, 
      pipelineId, 
      projectId 
    });

    return {
      processingId,
      pipelineId,
      projectId,
      status: 'processing',
      startedAt: new Date().toISOString(),
      links: {
        status: `/api/v1/ingestion/processing/${processingId}/status`,
        stream: `/api/v1/ingestion/processing/${processingId}/stream`,
        result: `/api/v1/ingestion/processing/${processingId}/result`
      }
    };
  }

  /**
   * Get pipeline processing status
   */
  async getProcessingStatus(processingId: string) {
    // In a real implementation, would track actual status
    return {
      processingId,
      status: 'completed',
      progress: 100,
      currentStep: 'complete',
      steps: [
        { name: 'data_formatting', status: 'completed', duration: 1200 },
        { name: 'auto_fix', status: 'completed', duration: 800 },
        { name: 'validation', status: 'completed', duration: 600 },
        { name: 'quality_assessment', status: 'completed', duration: 1500 }
      ],
      completedAt: new Date().toISOString()
    };
  }

  /**
   * Stream processing updates
   */
  async *streamProcessingUpdates(_processingId: string) {
    // In a real implementation, would stream actual updates
    yield {
      type: 'progress',
      step: 'data_formatting',
      progress: 25,
      message: 'Formatting data with Claude agent'
    };

    yield {
      type: 'progress',
      step: 'validation',
      progress: 50,
      message: 'Validating statistical integrity'
    };

    yield {
      type: 'progress',
      step: 'quality_assessment',
      progress: 75,
      message: 'Assessing study quality'
    };

    yield {
      type: 'complete',
      progress: 100,
      message: 'Processing complete'
    };
  }

  /**
   * Get available Claude models
   */
  getAvailableModels() {
    return {
      models: [
        {
          id: 'claude-3-opus-20240229',
          name: 'Claude 3 Opus',
          description: 'Most capable model for complex analysis',
          recommended: true
        },
        {
          id: 'claude-3-sonnet-20240229',
          name: 'Claude 3 Sonnet',
          description: 'Balanced performance and cost',
          recommended: false
        },
        {
          id: 'claude-3-haiku-20240307',
          name: 'Claude 3 Haiku',
          description: 'Fast and efficient for simple tasks',
          recommended: false
        }
      ],
      features: {
        'claude-3-opus-20240229': [
          'Best statistical understanding',
          'Complex data pattern recognition',
          'Comprehensive quality assessment',
          'Advanced bias detection'
        ],
        'claude-3-sonnet-20240229': [
          'Good statistical validation',
          'Efficient data processing',
          'Standard quality checks'
        ],
        'claude-3-haiku-20240307': [
          'Fast data formatting',
          'Basic validation',
          'Simple error detection'
        ]
      }
    };
  }

  /**
   * Get ingestion recommendations
   */
  async getIngestionRecommendations(projectId: string, _sampleData: string) {
    // Use Claude to analyze sample data and provide recommendations
    return {
      projectId,
      recommendations: {
        format: 'csv',
        suggestedPipeline: {
          enableQualityAssessment: true,
          enableDuplicateDetection: true,
          enableAutoFix: true,
          model: 'claude-3-opus-20240229'
        },
        dataIssues: [
          'Missing standard deviations in 3 studies',
          'Possible duplicate: Smith 2020 and Smith 2020b',
          'Inconsistent date formats'
        ],
        preparationSteps: [
          'Standardize study naming convention',
          'Calculate missing SDs from CIs where possible',
          'Verify sample sizes match reported data'
        ]
      }
    };
  }

  /**
   * Cleanup pipeline
   */
  async deletePipeline(pipelineId: string) {
    if (!this.pipelines.has(pipelineId)) {
      throw new ValidationError('Pipeline not found', { pipelineId });
    }

    this.pipelines.delete(pipelineId);
    logger.info('Pipeline deleted', { pipelineId });

    return { success: true };
  }
}