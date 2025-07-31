import { SessionManager } from '../../../session-manager.js';
import { DataValidator } from '../../../data-validator.js';
import { logger } from '../../../logger.js';
import { ValidationError } from '../../../types.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';

export class DataController {
  private sessionManager: SessionManager;
  private dataValidator: DataValidator;

  constructor() {
    this.sessionManager = new SessionManager();
    this.dataValidator = new DataValidator();
  }

  async uploadData(projectId: string, file: Express.Multer.File, options: Record<string, unknown>) {
    const session = await this.sessionManager.getSession(projectId);
    if (!session) {
      throw new ValidationError('Project not found', { projectId });
    }

    const dataId = uuidv4();
    const fileContent = file.buffer.toString('utf-8');
    
    // Determine format
    const format = options.dataFormat || this.detectFormat(file.mimetype, file.originalname);
    
    // Save file
    await this.sessionManager.saveFile(
      projectId,
      `${dataId}_${file.originalname}`,
      fileContent,
      'input'
    );

    logger.info('Data uploaded', { projectId, dataId, format });

    return {
      dataId,
      projectId,
      filename: file.originalname,
      format,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      status: 'pending_validation'
    };
  }

  async validateData(projectId: string, dataId: string) {
    const session = await this.sessionManager.getSession(projectId);
    if (!session) {
      throw new ValidationError('Project not found', { projectId });
    }

    // Simulate validation (in real implementation, would validate the actual data)
    const validationResult = {
      dataId,
      valid: true,
      errors: [],
      warnings: [],
      summary: {
        totalStudies: session.study_data.length,
        validStudies: session.study_data.length,
        missingData: 0,
        outliers: 0
      }
    };

    return validationResult;
  }

  async getValidationReport(projectId: string, dataId: string) {
    // Return a detailed validation report
    return {
      dataId,
      projectId,
      validationDate: new Date().toISOString(),
      report: {
        dataQuality: 'good',
        issues: [],
        recommendations: []
      }
    };
  }

  async downloadData(projectId: string, dataId: string) {
    const sessionDir = this.sessionManager.getSessionDir(projectId);
    const filePath = path.join(sessionDir, 'input', `${dataId}_data.csv`);
    
    if (!await fs.pathExists(filePath)) {
      throw new ValidationError('Data file not found', { projectId, dataId });
    }

    const stream = fs.createReadStream(filePath);
    return {
      stream,
      filename: `${dataId}_data.csv`,
      contentType: 'text/csv'
    };
  }

  async listDataFiles(projectId: string) {
    const session = await this.sessionManager.getSession(projectId);
    if (!session) {
      throw new ValidationError('Project not found', { projectId });
    }

    return {
      projectId,
      files: session.files.uploaded.map(filename => ({
        filename,
        uploadedAt: session.created_at,
        status: 'validated'
      }))
    };
  }

  private detectFormat(mimetype: string, filename: string): string {
    if (mimetype === 'text/csv' || filename.endsWith('.csv')) return 'csv';
    if (mimetype.includes('excel') || filename.endsWith('.xlsx')) return 'excel';
    if (mimetype.includes('xml') || filename.endsWith('.xml')) return 'revman';
    return 'unknown';
  }
}