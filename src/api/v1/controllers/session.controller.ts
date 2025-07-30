import { SessionManager } from '../../../session-manager.js';
import { logger } from '../../../logger.js';
import { ValidationError } from '../../../types.js';

export class SessionController {
  private sessionManager: SessionManager;

  constructor() {
    this.sessionManager = new SessionManager();
  }

  async createSession(data: any) {
    const session = await this.sessionManager.createSession(
      data.projectName,
      {
        effect_measure: data.effectMeasure,
        analysis_model: data.analysisModel || 'auto',
        confidence_level: data.confidenceLevel || 0.95,
        heterogeneity_test: data.heterogeneityTest ?? true,
        publication_bias: data.publicationBias ?? true,
        sensitivity_analysis: data.sensitivityAnalysis ?? false
      }
    );

    logger.info('Session created via API', { sessionId: session.id });

    return {
      sessionId: session.id,
      projectName: session.project_name,
      status: session.status,
      stage: session.workflow_stage,
      createdAt: session.created_at,
      parameters: session.parameters
    };
  }

  async listSessions(filters: any) {
    const sessions = await this.sessionManager.listSessions(filters.userId);
    
    return {
      sessions: sessions.map(session => ({
        id: session.id,
        projectName: session.project_name,
        status: session.status,
        stage: session.workflow_stage,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        studyCount: session.study_data.length,
        hasResults: !!session.results,
        effectMeasure: session.parameters.effect_measure,
        modelType: session.parameters.analysis_model
      })),
      total: sessions.length
    };
  }

  async getSession(sessionId: string) {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new ValidationError('Session not found', { sessionId });
    }

    return {
      id: session.id,
      projectName: session.project_name,
      status: session.status,
      stage: session.workflow_stage,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      parameters: session.parameters,
      studyData: {
        count: session.study_data.length,
        studies: session.study_data
      },
      files: {
        uploaded: session.files.uploaded,
        generated: session.files.generated
      },
      results: session.results || null
    };
  }

  async updateSession(sessionId: string, updates: any) {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new ValidationError('Session not found', { sessionId });
    }

    // Update allowed fields
    if (updates.projectName) {
      session.project_name = updates.projectName;
    }
    
    if (updates.parameters) {
      session.parameters = { ...session.parameters, ...updates.parameters };
    }

    await this.sessionManager.updateSession(session);
    logger.info('Session updated', { sessionId, updates });

    return {
      success: true,
      sessionId,
      updatedFields: Object.keys(updates)
    };
  }

  async deleteSession(sessionId: string) {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new ValidationError('Session not found', { sessionId });
    }

    // In a real implementation, would delete session data
    logger.info('Session deletion requested', { sessionId });

    return {
      success: true,
      message: 'Session marked for deletion'
    };
  }

  async getSessionFiles(sessionId: string, fileType?: 'uploaded' | 'generated' | 'all') {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new ValidationError('Session not found', { sessionId });
    }

    const files = {
      uploaded: fileType === 'uploaded' || fileType === 'all' || !fileType ? session.files.uploaded : [],
      generated: fileType === 'generated' || fileType === 'all' || !fileType ? session.files.generated : []
    };

    return {
      sessionId,
      files,
      sessionDir: this.sessionManager.getSessionDir(sessionId)
    };
  }

  async exportSession(sessionId: string, format: 'json' | 'rdata' | 'zip') {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new ValidationError('Session not found', { sessionId });
    }

    logger.info('Session export requested', { sessionId, format });

    // In a real implementation, would create export file
    return {
      sessionId,
      format,
      exportId: `export_${sessionId}_${Date.now()}`,
      status: 'preparing',
      estimatedSize: 1024 * 1024 // 1MB placeholder
    };
  }

  async cloneSession(sessionId: string, data: any) {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new ValidationError('Session not found', { sessionId });
    }

    const newProjectName = data.projectName || `${session.project_name} (Copy)`;

    // Create new session with same parameters
    const newSession = await this.sessionManager.createSession(
      newProjectName,
      session.parameters
    );

    // Copy study data
    if (session.study_data.length > 0) {
      await this.sessionManager.addStudyData(newSession.id, session.study_data);
    }

    logger.info('Session cloned', { originalId: sessionId, newId: newSession.id });

    return {
      originalSessionId: sessionId,
      newSessionId: newSession.id,
      projectName: newProjectName
    };
  }

  async getSessionActivity(sessionId: string) {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new ValidationError('Session not found', { sessionId });
    }

    // Return activity log (placeholder implementation)
    return {
      sessionId,
      activities: [
        {
          timestamp: session.created_at,
          action: 'session_created',
          details: { projectName: session.project_name }
        },
        {
          timestamp: session.updated_at,
          action: 'session_updated',
          details: { stage: session.workflow_stage }
        }
      ]
    };
  }
}