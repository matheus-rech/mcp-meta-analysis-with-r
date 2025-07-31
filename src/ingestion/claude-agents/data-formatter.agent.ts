import { BaseClaudeCodeAgent } from '../../linting/base-claude-code.agent.js';
import { logger } from '../../logger.js';
import { StudyData, ValidationError } from '../../types.js';

export interface DataFormatterAgentConfig {
  apiKey: string;
  model?: string;
  maxRetries?: number;
}

export class DataFormatterAgent extends BaseClaudeCodeAgent {
  private maxRetries: number;

  constructor(config: DataFormatterAgentConfig) {
    super({
      apiKey: config.apiKey,
      model: config.model,
      maxTurns: 1 // Single-turn for data formatting
    });
    this.maxRetries = config.maxRetries || 3;
  }

  /**
   * Intelligently parse and format raw data using Claude Code SDK
   */
  async formatStudyData(rawData: string, format: string): Promise<StudyData[]> {
    const prompt = this.buildFormattingPrompt(rawData, format);
    
    try {
      const messages = await this.executeQuery(prompt);
      const formattedData = this.parseFormattedData(messages);
      
      logger.info('Claude Code agent formatted data successfully', { 
        studyCount: formattedData.length 
      });

      return formattedData;
    } catch (error) {
      logger.error('Claude Code agent formatting failed', { error });
      throw new ValidationError('Failed to format data with Claude Code agent', { error });
    }
  }

  /**
   * Detect and fix common data issues
   */
  async detectAndFixIssues(data: StudyData[]): Promise<{
    fixed: StudyData[];
    issues: Array<{ study: string; issue: string; fix: string }>;
  }> {
    const prompt = `
Analyze this meta-analysis data and fix any issues:

${JSON.stringify(data, null, 2)}

Common issues to check:
1. Missing effect sizes that can be calculated
2. Incorrect confidence intervals
3. Sample size inconsistencies
4. Data type mismatches
5. Outliers or impossible values

Return a JSON with:
- fixed: array of corrected study data
- issues: array of detected issues with explanations
`;

    const messages = await this.executeQuery(prompt);
    return this.parseJsonResponse(messages) || { fixed: data, issues: [] };
  }

  /**
   * Intelligently map columns to required schema
   */
  async mapColumnsToSchema(headers: string[], sampleData: any[]): Promise<Record<string, string>> {
    const prompt = `
Map these CSV/Excel columns to meta-analysis schema fields:

Headers: ${headers.join(', ')}
Sample data (first 3 rows):
${JSON.stringify(sampleData.slice(0, 3), null, 2)}

Required schema fields:
- study_name: Name/ID of the study
- n_treatment: Sample size in treatment group
- n_control: Sample size in control group
- events_treatment: Number of events in treatment (for binary outcomes)
- events_control: Number of events in control (for binary outcomes)
- mean_treatment: Mean value in treatment (for continuous outcomes)
- sd_treatment: Standard deviation in treatment
- mean_control: Mean value in control
- sd_control: Standard deviation in control
- year: Publication year
- quality_score: Study quality rating

Return a JSON mapping of column names to schema fields.
`;

    const messages = await this.executeQuery(prompt);
    return this.parseJsonResponse(messages) || {};
  }

  private buildFormattingPrompt(rawData: string, format: string): string {
    return `
Parse and format this ${format} data for meta-analysis:

${rawData}

Requirements:
1. Extract all studies with their statistical data
2. Calculate missing effect sizes if possible
3. Standardize study names
4. Handle missing data appropriately
5. Detect the type of outcome (binary/continuous)

Return a JSON array of study objects following this schema:
{
  study_id: string,
  study_name: string,
  year?: number,
  n_treatment: number,
  n_control: number,
  // For binary outcomes:
  events_treatment?: number,
  events_control?: number,
  // For continuous outcomes:
  mean_treatment?: number,
  sd_treatment?: number,
  mean_control?: number,
  sd_control?: number,
  // Calculated or provided:
  effect_size?: number,
  ci_lower?: number,
  ci_upper?: number,
  quality_score?: number
}
`;
  }

  protected getSystemPrompt(): string {
    return `You are an expert in meta-analysis data processing. Your role is to:
1. Parse various data formats (CSV, Excel, RevMan) accurately
2. Calculate missing statistical values when possible
3. Ensure data quality and consistency
4. Follow meta-analysis best practices
5. Preserve study integrity while fixing obvious errors

Always return valid JSON that can be parsed directly.`;
  }

  private parseFormattedData(messages: any[]): StudyData[] {
    for (const message of messages) {
      if (message.type === 'text' && message.content) {
        try {
          const jsonMatch = message.content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
        } catch (error) {
          logger.error('Failed to parse formatted data', { error });
        }
      }
    }
    throw new ValidationError('Invalid response format from Claude Code');
  }
}