import { SessionManager } from '../../../session-manager.js';
import { RExecutor } from '../../../r-executor.js';
import { logger } from '../../../logger.js';
import { ValidationError } from '../../../types.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';

interface PlotOptions {
  plotStyle?: string;
  confidenceLevel?: number;
  customLabels?: any;
  format?: string;
  dpi?: number;
}

export class VisualizationController {
  private sessionManager: SessionManager;
  private rExecutor: RExecutor;

  constructor() {
    this.sessionManager = new SessionManager();
    this.rExecutor = new RExecutor();
  }

  async generateForestPlot(projectId: string, options: PlotOptions) {
    const session = await this.sessionManager.getSession(projectId);
    if (!session || !session.results) {
      throw new ValidationError('No results available for visualization', { projectId });
    }

    const visualizationId = uuidv4();
    const sessionDir = this.sessionManager.getSessionDir(projectId);
    
    await this.rExecutor.generateForestPlot(projectId, {
      plot_style: options.plotStyle || 'modern',
      confidence_level: options.confidenceLevel || 0.95,
      custom_labels: options.customLabels
    }, sessionDir);

    await this.sessionManager.addFile(projectId, 'forest_plot.png', 'generated');

    logger.info('Forest plot generated', { projectId, visualizationId });

    return {
      visualizationId,
      projectId,
      type: 'forest_plot',
      format: options.format || 'png',
      generatedAt: new Date().toISOString(),
      links: {
        view: `/api/v1/visualizations/${visualizationId}`,
        download: `/api/v1/visualizations/${visualizationId}?format=${options.format || 'png'}`
      }
    };
  }

  async generateFunnelPlot(projectId: string, options: any) {
    const session = await this.sessionManager.getSession(projectId);
    if (!session || !session.results) {
      throw new ValidationError('No results available for visualization', { projectId });
    }

    const visualizationId = uuidv4();
    const sessionDir = this.sessionManager.getSessionDir(projectId);
    
    await this.rExecutor.generateFunnelPlot(projectId, sessionDir);
    await this.sessionManager.addFile(projectId, 'funnel_plot.png', 'generated');

    logger.info('Funnel plot generated', { projectId, visualizationId });

    return {
      visualizationId,
      projectId,
      type: 'funnel_plot',
      format: options.format || 'png',
      generatedAt: new Date().toISOString()
    };
  }

  async generateSensitivityPlot(projectId: string, options: any) {
    const visualizationId = uuidv4();
    
    // Placeholder for sensitivity plot generation
    logger.info('Sensitivity plot requested', { projectId, visualizationId });

    return {
      visualizationId,
      projectId,
      type: 'sensitivity_plot',
      format: options.format || 'png',
      method: options.method || 'leave_one_out',
      generatedAt: new Date().toISOString()
    };
  }

  async getVisualization(visualizationId: string, format: string) {
    // In a real implementation, would look up visualization metadata
    const filePath = path.join(process.cwd(), 'temp', `${visualizationId}.${format}`);
    
    if (!await fs.pathExists(filePath)) {
      // Return a placeholder image for now
      const placeholderPath = path.join(process.cwd(), 'assets', 'placeholder.png');
      return {
        stream: fs.createReadStream(placeholderPath),
        contentType: 'image/png',
        filename: `visualization_${visualizationId}.png`
      };
    }

    const contentTypes: Record<string, string> = {
      png: 'image/png',
      svg: 'image/svg+xml',
      pdf: 'application/pdf'
    };

    return {
      stream: fs.createReadStream(filePath),
      contentType: contentTypes[format] || 'application/octet-stream',
      filename: `visualization_${visualizationId}.${format}`
    };
  }

  async getVisualizationMetadata(visualizationId: string) {
    // Return metadata about the visualization
    return {
      visualizationId,
      type: 'forest_plot',
      format: 'png',
      dimensions: { width: 800, height: 600 },
      dpi: 300,
      generatedAt: new Date().toISOString(),
      parameters: {
        plotStyle: 'modern',
        confidenceLevel: 0.95
      }
    };
  }

  async listVisualizations(projectId: string, type?: string) {
    const session = await this.sessionManager.getSession(projectId);
    if (!session) {
      throw new ValidationError('Project not found', { projectId });
    }

    const visualizations = session.files.generated
      .filter(file => file.includes('plot'))
      .map(file => ({
        filename: file,
        type: file.includes('forest') ? 'forest_plot' : 
              file.includes('funnel') ? 'funnel_plot' : 'other',
        generatedAt: session.updated_at
      }));

    return {
      projectId,
      visualizations: type && type !== 'all' 
        ? visualizations.filter(v => v.type === type)
        : visualizations
    };
  }

  async deleteVisualization(visualizationId: string) {
    logger.info('Visualization deleted', { visualizationId });
    // In a real implementation, would delete the file and metadata
  }
}