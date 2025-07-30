import { SessionManager } from '../../../session-manager.js';
import { logger } from '../../../logger.js';
import { ValidationError } from '../../../types.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';

interface ReportOptions {
  format: 'html' | 'pdf' | 'word' | 'latex';
  includeCode?: boolean;
  journalTemplate?: string;
  sections?: string[];
  language?: string;
}

export class ReportController {
  private sessionManager: SessionManager;

  constructor() {
    this.sessionManager = new SessionManager();
  }

  async generateReport(projectId: string, options: ReportOptions) {
    const session = await this.sessionManager.getSession(projectId);
    if (!session || !session.results) {
      throw new ValidationError('No results available for report generation', { projectId });
    }

    const reportId = uuidv4();
    
    // Start report generation (async)
    setImmediate(async () => {
      try {
        // In a real implementation, would generate the actual report
        const reportContent = this.generateReportContent(session, options);
        const filename = `report_${reportId}.${options.format}`;
        
        await this.sessionManager.saveFile(projectId, filename, reportContent, 'output');
        logger.info('Report generated', { projectId, reportId, format: options.format });
      } catch (error) {
        logger.error('Report generation failed', { projectId, reportId, error });
      }
    });

    return {
      reportId,
      projectId,
      status: 'generating',
      format: options.format,
      estimatedTime: '1-2 minutes',
      links: {
        status: `/api/v1/reports/${reportId}/status`,
        download: `/api/v1/reports/${reportId}/download`
      }
    };
  }

  async getReportStatus(reportId: string) {
    // In a real implementation, would check actual status
    return {
      reportId,
      status: 'completed',
      progress: 100,
      message: 'Report generated successfully',
      completedAt: new Date().toISOString()
    };
  }

  async downloadReport(reportId: string, format?: string) {
    // In a real implementation, would find the actual report file
    const reportFormat = format || 'pdf';
    const filename = `report_${reportId}.${reportFormat}`;
    
    const contentTypes: Record<string, string> = {
      html: 'text/html',
      pdf: 'application/pdf',
      word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      latex: 'text/x-latex'
    };

    // Return placeholder content for now
    const placeholderContent = this.getPlaceholderReport(reportFormat);
    const stream = fs.createReadStream(placeholderContent);

    return {
      stream,
      contentType: contentTypes[reportFormat] || 'application/octet-stream',
      filename
    };
  }

  async getReportMetadata(reportId: string) {
    return {
      reportId,
      format: 'pdf',
      generatedAt: new Date().toISOString(),
      size: 1024 * 1024, // 1MB placeholder
      sections: [
        'executive_summary',
        'methods',
        'results',
        'forest_plots',
        'heterogeneity',
        'discussion'
      ],
      language: 'en'
    };
  }

  async listReports(projectId: string, filters: any) {
    const session = await this.sessionManager.getSession(projectId);
    if (!session) {
      throw new ValidationError('Project not found', { projectId });
    }

    const reports = session.files.generated
      .filter(file => file.includes('report'))
      .map(file => ({
        filename: file,
        format: this.detectFormat(file),
        generatedAt: session.updated_at,
        status: 'completed'
      }));

    return {
      projectId,
      reports: filters.format && filters.format !== 'all'
        ? reports.filter(r => r.format === filters.format)
        : reports
    };
  }

  async generatePRISMADiagram(projectId: string, data: any) {
    const diagramId = uuidv4();
    
    logger.info('PRISMA diagram requested', { projectId, diagramId });

    return {
      diagramId,
      projectId,
      type: 'prisma_flow',
      data,
      generatedAt: new Date().toISOString()
    };
  }

  async deleteReport(reportId: string) {
    logger.info('Report deleted', { reportId });
    // In a real implementation, would delete the file
  }

  private generateReportContent(session: any, options: ReportOptions): string {
    // Basic HTML template
    if (options.format === 'html') {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Meta-Analysis Report - ${session.project_name}</title>
        </head>
        <body>
          <h1>Meta-Analysis Report</h1>
          <h2>${session.project_name}</h2>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <h3>Results</h3>
          <pre>${JSON.stringify(session.results, null, 2)}</pre>
        </body>
        </html>
      `;
    }
    
    // For other formats, return placeholder
    return `Meta-Analysis Report\n${session.project_name}\n\nPlaceholder content`;
  }

  private getPlaceholderReport(format: string): string {
    const placeholderDir = path.join(process.cwd(), 'assets', 'placeholders');
    fs.ensureDirSync(placeholderDir);
    
    const placeholderPath = path.join(placeholderDir, `report.${format}`);
    
    // Create placeholder if it doesn't exist
    if (!fs.existsSync(placeholderPath)) {
      fs.writeFileSync(placeholderPath, 'Placeholder report content');
    }
    
    return placeholderPath;
  }

  private detectFormat(filename: string): string {
    if (filename.endsWith('.html')) return 'html';
    if (filename.endsWith('.pdf')) return 'pdf';
    if (filename.endsWith('.docx')) return 'word';
    if (filename.endsWith('.tex')) return 'latex';
    return 'unknown';
  }
}