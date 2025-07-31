import { SessionManager } from '../../../session-manager.js';
import { RExecutor } from '../../../r-executor.js';
import { DataValidator } from '../../../data-validator.js';
import { logger } from '../../../logger.js';
import { v4 as uuidv4 } from 'uuid';
import { MetaAnalysisError, ValidationError } from '../../../types.js';

interface CreateProjectDto {
  projectName: string;
  studyType: 'clinical_trial' | 'observational' | 'diagnostic';
  effectMeasure: 'OR' | 'RR' | 'MD' | 'SMD' | 'HR';
  analysisModel?: 'fixed' | 'random' | 'auto';
  description?: string;
  tags?: string[];
}

interface AnalysisOptionsDto {
  heterogeneityTest?: boolean;
  publicationBias?: boolean;
  sensitivityAnalysis?: boolean;
}

export class MetaAnalysisController {
  private sessionManager: SessionManager;
  private rExecutor: RExecutor;
  private dataValidator: DataValidator;

  constructor() {
    this.sessionManager = new SessionManager();
    this.rExecutor = new RExecutor();
    this.dataValidator = new DataValidator();
  }

  async createProject(dto: CreateProjectDto) {
    try {
      
      const parameters = {
        effect_measure: dto.effectMeasure,
        analysis_model: dto.analysisModel || 'auto',
        confidence_level: 0.95,
        heterogeneity_test: true,
        publication_bias: true,
        sensitivity_analysis: false
      };

      const session = await this.sessionManager.createSession(
        dto.projectName,
        parameters
      );

      logger.info('Created new meta-analysis project', {
        projectId: session.id,
        projectName: dto.projectName,
        studyType: dto.studyType
      });

      return {
        id: session.id,
        projectName: session.project_name,
        studyType: dto.studyType,
        effectMeasure: dto.effectMeasure,
        analysisModel: dto.analysisModel || 'auto',
        status: session.status,
        createdAt: session.created_at,
        links: {
          self: `/api/v1/meta-analysis/projects/${session.id}`,
          upload: `/api/v1/data/projects/${session.id}/upload`,
          analyze: `/api/v1/meta-analysis/projects/${session.id}/analyze`
        }
      };
    } catch (error) {
      logger.error('Failed to create project:', error);
      throw new MetaAnalysisError(
        'Failed to create meta-analysis project',
        'PROJECT_CREATION_FAILED',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  async getProject(projectId: string) {
    const session = await this.sessionManager.getSession(projectId);
    
    if (!session) {
      throw new ValidationError('Project not found', { projectId });
    }

    return {
      id: session.id,
      projectName: session.project_name,
      status: session.status,
      workflowStage: session.workflow_stage,
      parameters: session.parameters,
      studyCount: session.study_data.length,
      hasResults: !!session.results,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      files: session.files,
      links: {
        self: `/api/v1/meta-analysis/projects/${session.id}`,
        results: session.results ? `/api/v1/meta-analysis/projects/${session.id}/results` : null,
        visualizations: `/api/v1/visualizations?projectId=${session.id}`,
        reports: `/api/v1/reports?projectId=${session.id}`
      }
    };
  }

  async listProjects(query: any) {
    const { userId, status, page = 1, limit = 20 } = query;
    const sessions = await this.sessionManager.listSessions(userId);
    
    // Filter by status if provided
    const filtered = status && status !== 'all' 
      ? sessions.filter(s => s.status === status)
      : sessions;
    
    // Paginate
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);
    
    return {
      data: paginated.map(session => ({
        id: session.id,
        projectName: session.project_name,
        status: session.status,
        studyCount: session.study_data.length,
        effectMeasure: session.parameters.effect_measure,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        links: {
          self: `/api/v1/meta-analysis/projects/${session.id}`
        }
      })),
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit)
      }
    };
  }

  async performAnalysis(projectId: string, options: AnalysisOptionsDto) {
    const session = await this.sessionManager.getSession(projectId);
    
    if (!session) {
      throw new ValidationError('Project not found', { projectId });
    }
    
    if (session.study_data.length === 0) {
      throw new ValidationError('No study data available for analysis');
    }

    // Update session stage
    await this.sessionManager.updateSessionStage(projectId, 'analysis');

    // Update analysis parameters
    const updatedParams = {
      ...session.parameters,
      heterogeneity_test: options.heterogeneityTest ?? true,
      publication_bias: options.publicationBias ?? true,
      sensitivity_analysis: options.sensitivityAnalysis ?? false
    };

    // Start analysis (async)
    const analysisId = uuidv4();
    
    // In a real implementation, this would be queued
    setImmediate(async () => {
      try {
        const sessionDir = this.sessionManager.getSessionDir(projectId);
        const results = await this.rExecutor.executeMetaAnalysis(
          projectId,
          session.study_data,
          updatedParams,
          sessionDir
        );
        
        session.results = results;
        session.status = 'completed';
        await this.sessionManager.updateSession(session);
        
        logger.info('Analysis completed', { projectId, analysisId });
      } catch (error) {
        logger.error('Analysis failed', { projectId, analysisId, error });
        session.status = 'failed';
        await this.sessionManager.updateSession(session);
      }
    });

    return {
      analysisId,
      projectId,
      status: 'processing',
      message: 'Analysis started. Check status endpoint for updates.',
      estimatedTime: '2-5 minutes',
      links: {
        status: `/api/v1/meta-analysis/projects/${projectId}/results`,
        project: `/api/v1/meta-analysis/projects/${projectId}`
      }
    };
  }

  async getResults(projectId: string) {
    const session = await this.sessionManager.getSession(projectId);
    
    if (!session) {
      throw new ValidationError('Project not found', { projectId });
    }
    
    if (!session.results) {
      return {
        projectId,
        status: session.status === 'analysis' ? 'processing' : 'no_results',
        message: session.status === 'analysis' 
          ? 'Analysis in progress' 
          : 'No analysis results available yet'
      };
    }

    return {
      projectId,
      status: 'completed',
      results: session.results,
      generatedAt: session.updated_at,
      links: {
        forestPlot: `/api/v1/visualizations?projectId=${projectId}&type=forest`,
        funnelPlot: `/api/v1/visualizations?projectId=${projectId}&type=funnel`,
        report: `/api/v1/reports?projectId=${projectId}`
      }
    };
  }

  async assessPublicationBias(projectId: string, options: any) {
    const session = await this.sessionManager.getSession(projectId);
    
    if (!session || !session.results) {
      throw new ValidationError('No analysis results available');
    }
    
    if (session.study_data.length < 3) {
      throw new ValidationError(
        'Publication bias assessment requires at least 3 studies',
        { studyCount: session.study_data.length }
      );
    }

    const methods = options.methods || ['funnel_plot', 'egger_test', 'begg_test'];
    const sessionDir = this.sessionManager.getSessionDir(projectId);
    
    // Generate funnel plot if requested
    if (methods.includes('funnel_plot')) {
      await this.rExecutor.generateFunnelPlot(projectId, sessionDir);
      await this.sessionManager.addFile(projectId, 'funnel_plot.png', 'generated');
    }

    return {
      projectId,
      publicationBias: session.results.publication_bias,
      methods: methods,
      interpretation: this.interpretPublicationBias(session.results.publication_bias),
      links: {
        funnelPlot: methods.includes('funnel_plot') 
          ? `/api/v1/visualizations?projectId=${projectId}&type=funnel`
          : null,
        project: `/api/v1/meta-analysis/projects/${projectId}`
      }
    };
  }

  private interpretPublicationBias(bias: any): string {
    if (!bias) return 'No publication bias assessment available';
    
    const eggerP = bias.egger_test?.p_value;
    const beggP = bias.begg_test?.p_value;
    
    if (eggerP < 0.05 || beggP < 0.05) {
      return 'Evidence of publication bias detected. Results should be interpreted with caution.';
    }
    
    return 'No significant evidence of publication bias detected.';
  }
}