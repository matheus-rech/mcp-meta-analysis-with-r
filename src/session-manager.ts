import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { MetaAnalysisSession, AnalysisParameters, StudyData } from './types.js';
import { logger } from './logger.js';

export class SessionManager {
  private sessions: Map<string, MetaAnalysisSession> = new Map();
  private readonly sessionsDir: string;

  constructor(baseDir?: string) {
    // Use absolute path relative to project root
    const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    this.sessionsDir = baseDir || path.join(projectRoot, 'user_sessions');
    
    // Create directories synchronously to avoid async issues in constructor
    fs.ensureDirSync(this.sessionsDir);
    fs.ensureDirSync(path.join(this.sessionsDir, 'templates'));
    fs.ensureDirSync(path.join(this.sessionsDir, 'shared_resources'));
  }

  private async ensureDirectories(): Promise<void> {
    await fs.ensureDir(this.sessionsDir);
    await fs.ensureDir(path.join(this.sessionsDir, 'templates'));
    await fs.ensureDir(path.join(this.sessionsDir, 'shared_resources'));
  }

  async createSession(
    projectName: string,
    parameters: AnalysisParameters,
    userId?: string
  ): Promise<MetaAnalysisSession> {
    const sessionId = uuidv4();
    const now = new Date();
    
    const session: MetaAnalysisSession = {
      id: sessionId,
      user_id: userId,
      project_name: projectName,
      created_at: now,
      updated_at: now,
      status: 'active',
      workflow_stage: 'initialization',
      parameters,
      study_data: [],
      files: {
        uploaded: [],
        generated: []
      }
    };

    // Create session directory structure
    const sessionDir = this.getSessionDir(sessionId);
    await fs.ensureDir(path.join(sessionDir, 'input'));
    await fs.ensureDir(path.join(sessionDir, 'processing'));
    await fs.ensureDir(path.join(sessionDir, 'output'));
    await fs.ensureDir(path.join(sessionDir, 'logs'));

    // Save session metadata
    await this.saveSession(session);
    this.sessions.set(sessionId, session);

    logger.info(`Created new session: ${sessionId}`, { 
      projectName, 
      userId, 
      parameters 
    });

    return session;
  }

  async getSession(sessionId: string): Promise<MetaAnalysisSession | null> {
    // Try memory first
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!;
    }

    // Try loading from disk
    try {
      const sessionFile = path.join(this.getSessionDir(sessionId), 'session.json');
      if (await fs.pathExists(sessionFile)) {
        const data = await fs.readJson(sessionFile);
        const session: MetaAnalysisSession = {
          ...data,
          created_at: new Date(data.created_at),
          updated_at: new Date(data.updated_at)
        };
        this.sessions.set(sessionId, session);
        return session;
      }
    } catch (error) {
      logger.error(`Failed to load session ${sessionId}:`, error);
    }

    return null;
  }

  async updateSession(session: MetaAnalysisSession): Promise<void> {
    session.updated_at = new Date();
    this.sessions.set(session.id, session);
    await this.saveSession(session);
    
    logger.debug(`Updated session: ${session.id}`, { 
      stage: session.workflow_stage,
      status: session.status 
    });
  }

  async updateSessionStage(
    sessionId: string, 
    stage: MetaAnalysisSession['workflow_stage']
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.workflow_stage = stage;
    await this.updateSession(session);
  }

  async addStudyData(sessionId: string, studies: StudyData[]): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.study_data.push(...studies);
    await this.updateSession(session);
  }

  async addFile(
    sessionId: string, 
    filename: string, 
    type: 'uploaded' | 'generated'
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.files[type].push(filename);
    await this.updateSession(session);
  }

  getSessionDir(sessionId: string): string {
    return path.join(this.sessionsDir, sessionId);
  }

  getInputDir(sessionId: string): string {
    return path.join(this.getSessionDir(sessionId), 'input');
  }

  getOutputDir(sessionId: string): string {
    return path.join(this.getSessionDir(sessionId), 'output');
  }

  getProcessingDir(sessionId: string): string {
    return path.join(this.getSessionDir(sessionId), 'processing');
  }

  getLogsDir(sessionId: string): string {
    return path.join(this.getSessionDir(sessionId), 'logs');
  }

  async saveFile(
    sessionId: string,
    filename: string,
    content: Buffer | string,
    directory: 'input' | 'output' | 'processing' = 'input'
  ): Promise<string> {
    const dirPath = directory === 'input' ? this.getInputDir(sessionId) :
                   directory === 'output' ? this.getOutputDir(sessionId) :
                   this.getProcessingDir(sessionId);
    
    const filePath = path.join(dirPath, filename);
    await fs.writeFile(filePath, content);
    
    await this.addFile(sessionId, filename, 
      directory === 'input' ? 'uploaded' : 'generated');
    
    return filePath;
  }

  async listSessions(userId?: string): Promise<MetaAnalysisSession[]> {
    const sessions: MetaAnalysisSession[] = [];
    
    try {
      const sessionDirs = await fs.readdir(this.sessionsDir);
      
      for (const dir of sessionDirs) {
        if (dir === 'templates' || dir === 'shared_resources') continue;
        
        const session = await this.getSession(dir);
        if (session && (!userId || session.user_id === userId)) {
          sessions.push(session);
        }
      }
    } catch (error) {
      logger.error('Failed to list sessions:', error);
    }

    return sessions.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessionDir = this.getSessionDir(sessionId);
    
    if (await fs.pathExists(sessionDir)) {
      await fs.remove(sessionDir);
    }
    
    this.sessions.delete(sessionId);
    
    logger.info(`Deleted session: ${sessionId}`);
  }

  async cleanup(maxAgeHours = 24): Promise<number> {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    const sessions = await this.listSessions();
    let cleanedCount = 0;

    for (const session of sessions) {
      if (session.updated_at < cutoffTime && session.status !== 'active') {
        await this.deleteSession(session.id);
        cleanedCount++;
      }
    }

    logger.info(`Cleaned up ${cleanedCount} old sessions`);
    return cleanedCount;
  }

  private async saveSession(session: MetaAnalysisSession): Promise<void> {
    const sessionFile = path.join(this.getSessionDir(session.id), 'session.json');
    await fs.writeJson(sessionFile, session, { spaces: 2 });
  }
}