import { DataFormatterAgent } from './claude-agents/data-formatter.agent.js';
import { ValidationAgent } from './claude-agents/validation.agent.js';
import { QualityAssessmentAgent } from './claude-agents/quality-assessment.agent.js';
import { SessionManager } from '../session-manager.js';
import { logger } from '../logger.js';
import { StudyData, AnalysisParameters, ValidationError } from '../types.js';
import { EventEmitter } from 'events';

export interface PipelineConfig {
  anthropicApiKey: string;
  enableQualityAssessment?: boolean;
  enableDuplicateDetection?: boolean;
  enableAutoFix?: boolean;
  model?: string;
}

export interface PipelineResult {
  sessionId: string;
  originalDataCount: number;
  processedDataCount: number;
  studies: StudyData[];
  validationReport: any;
  qualityReport?: any;
  recommendations: {
    appropriate: boolean;
    suggestions: Array<{
      parameter: string;
      current: any;
      suggested: any;
      rationale: string;
    }>;
  };
  processingSteps: Array<{
    step: string;
    status: 'success' | 'warning' | 'error';
    duration: number;
    details?: any;
  }>;
}

export class IntelligentIngestionPipeline extends EventEmitter {
  private formatterAgent: DataFormatterAgent;
  private validationAgent: ValidationAgent;
  private qualityAgent: QualityAssessmentAgent;
  private sessionManager: SessionManager;
  private config: PipelineConfig;

  constructor(config: PipelineConfig) {
    super();
    this.config = config;
    
    // Initialize Claude agents
    this.formatterAgent = new DataFormatterAgent({
      apiKey: config.anthropicApiKey,
      model: config.model
    });
    
    this.validationAgent = new ValidationAgent({
      apiKey: config.anthropicApiKey,
      model: config.model
    });
    
    this.qualityAgent = new QualityAssessmentAgent({
      apiKey: config.anthropicApiKey,
      model: config.model
    });
    
    this.sessionManager = new SessionManager();
  }

  /**
   * Process data through intelligent pipeline with Claude agents
   */
  async processData(
    sessionId: string,
    rawData: string,
    format: 'csv' | 'excel' | 'revman',
    parameters: AnalysisParameters
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const processingSteps: PipelineResult['processingSteps'] = [];
    
    this.emit('pipeline:start', { sessionId, format });
    
    try {
      // Step 1: Intelligent Data Formatting
      logger.info('Starting intelligent data formatting', { sessionId });
      const formatStart = Date.now();
      
      let studies = await this.formatterAgent.formatStudyData(rawData, format);
      
      processingSteps.push({
        step: 'data_formatting',
        status: 'success',
        duration: Date.now() - formatStart,
        details: { studyCount: studies.length }
      });
      
      this.emit('pipeline:step', { 
        step: 'formatting', 
        status: 'complete',
        studyCount: studies.length 
      });

      // Step 2: Auto-fix Issues (if enabled)
      if (this.config.enableAutoFix) {
        const fixStart = Date.now();
        logger.info('Detecting and fixing data issues', { sessionId });
        
        const fixResult = await this.formatterAgent.detectAndFixIssues(studies);
        studies = fixResult.fixed;
        
        processingSteps.push({
          step: 'auto_fix',
          status: fixResult.issues.length > 0 ? 'warning' : 'success',
          duration: Date.now() - fixStart,
          details: { 
            issuesFixed: fixResult.issues.length,
            issues: fixResult.issues 
          }
        });
        
        this.emit('pipeline:step', { 
          step: 'auto_fix', 
          status: 'complete',
          issuesFixed: fixResult.issues.length 
        });
      }

      // Step 3: Intelligent Validation
      const validationStart = Date.now();
      logger.info('Performing intelligent validation', { sessionId });
      
      const validationReport = await this.validationAgent.validateStatisticalIntegrity(
        studies,
        parameters
      );
      
      processingSteps.push({
        step: 'validation',
        status: validationReport.valid ? 'success' : 'warning',
        duration: Date.now() - validationStart,
        details: validationReport
      });
      
      this.emit('pipeline:step', { 
        step: 'validation', 
        status: 'complete',
        valid: validationReport.valid,
        issueCount: validationReport.issues.length 
      });

      // Step 4: Duplicate Detection (if enabled)
      if (this.config.enableDuplicateDetection) {
        const dupStart = Date.now();
        logger.info('Checking for duplicate studies', { sessionId });
        
        const duplicateCheck = await this.validationAgent.detectDuplicates(studies);
        
        processingSteps.push({
          step: 'duplicate_detection',
          status: duplicateCheck.duplicateGroups.length > 0 ? 'warning' : 'success',
          duration: Date.now() - dupStart,
          details: duplicateCheck
        });
        
        this.emit('pipeline:step', { 
          step: 'duplicate_check', 
          status: 'complete',
          duplicatesFound: duplicateCheck.duplicateGroups.length 
        });
      }

      // Step 5: Analysis Recommendations
      const recStart = Date.now();
      logger.info('Getting analysis recommendations', { sessionId });
      
      const recommendations = await this.validationAgent.validateAnalysisApproach(
        studies, 
        { 
          effect_measure: 'OR',
          analysis_model: 'random',
          confidence_level: 0.95,
          heterogeneity_test: true,
          publication_bias: true,
          sensitivity_analysis: false
        }
      );
      
      processingSteps.push({
        step: 'recommendations',
        status: 'success',
        duration: Date.now() - recStart,
        details: recommendations
      });
      
      this.emit('pipeline:step', { 
        step: 'recommendations', 
        status: 'complete',
        appropriate: recommendations.appropriate 
      });

      // Step 6: Quality Assessment (if enabled)
      let qualityReport: any = null;
      if (this.config.enableQualityAssessment) {
        const qualityStart = Date.now();
        logger.info('Performing quality assessment', { sessionId });
        
        qualityReport = await this.qualityAgent.assessStudyQuality(studies);
        
        // Add quality scores to studies
        studies = studies.map(study => {
          const assessment = qualityReport.assessments.find(
            (a: any) => a.study_id === study.study_id
          );
          return {
            ...study,
            quality_score: assessment?.quality_score || 5
          };
        });
        
        processingSteps.push({
          step: 'quality_assessment',
          status: 'success',
          duration: Date.now() - qualityStart,
          details: qualityReport.summary
        });
        
        this.emit('pipeline:step', { 
          step: 'quality_assessment', 
          status: 'complete',
          highQualityCount: qualityReport.summary.high_quality_count 
        });
      }

      // Step 7: Save to Session
      const saveStart = Date.now();
      await this.sessionManager.addStudyData(sessionId, studies);
      await this.sessionManager.updateSessionStage(sessionId, 'validation');
      
      processingSteps.push({
        step: 'save_to_session',
        status: 'success',
        duration: Date.now() - saveStart,
        details: { studiesSaved: studies.length }
      });

      // Prepare final result
      const result: PipelineResult = {
        sessionId,
        originalDataCount: studies.length,
        processedDataCount: studies.length,
        studies,
        validationReport,
        qualityReport,
        recommendations: {
          appropriate: recommendations.appropriate,
          suggestions: recommendations.suggestions
        },
        processingSteps
      };

      this.emit('pipeline:complete', { 
        sessionId, 
        duration: Date.now() - startTime,
        studyCount: studies.length 
      });

      logger.info('Intelligent pipeline completed successfully', { 
        sessionId,
        duration: Date.now() - startTime,
        steps: processingSteps.length
      });

      return result;

    } catch (error) {
      logger.error('Pipeline processing failed', { sessionId, error });
      
      processingSteps.push({
        step: 'error',
        status: 'error',
        duration: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : String(error) }
      });
      
      this.emit('pipeline:error', { sessionId, error });
      
      throw new ValidationError('Pipeline processing failed', { 
        sessionId, 
        error: error instanceof Error ? error.message : String(error),
        steps: processingSteps 
      });
    }
  }

  /**
   * Process data with streaming updates
   */
  async *processDataStream(
    sessionId: string,
    rawData: string,
    format: 'csv' | 'excel' | 'revman',
    parameters: AnalysisParameters
  ): AsyncGenerator<{
    type: 'progress' | 'result' | 'error';
    step?: string;
    progress?: number;
    message?: string;
    data?: any;
  }> {
    try {
      // Setup event listeners for streaming
      const progressHandler = (data: any) => {
        return {
          type: 'progress' as const,
          step: data.step,
          progress: data.progress || 0,
          message: data.message
        };
      };

      this.on('pipeline:step', (data) => {
        progressHandler(data);
      });

      // Run pipeline
      const result = await this.processData(sessionId, rawData, format, parameters);

      yield {
        type: 'result',
        data: result
      };

    } catch (error) {
      yield {
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
        data: error
      };
    }
  }

  /**
   * Get pipeline capabilities
   */
  getCapabilities(): {
    supportedFormats: string[];
    agents: string[];
    features: string[];
  } {
    return {
      supportedFormats: ['csv', 'excel', 'revman'],
      agents: [
        'data-formatter',
        'validation',
        'quality-assessment'
      ],
      features: [
        'intelligent-formatting',
        'auto-fix-issues',
        'duplicate-detection',
        'quality-scoring',
        'analysis-recommendations',
        'streaming-updates'
      ]
    };
  }
}