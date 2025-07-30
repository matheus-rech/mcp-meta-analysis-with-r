import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../logger.js';
import { StudyData, ValidationError } from '../../types.js';

export interface DataFormatterAgentConfig {
  apiKey: string;
  model?: string;
  maxRetries?: number;
}

export class DataFormatterAgent {
  private claude: Anthropic;
  private model: string;
  private maxRetries: number;

  constructor(config: DataFormatterAgentConfig) {
    this.claude = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-3-opus-20240229';
    this.maxRetries = config.maxRetries || 3;
  }

  /**
   * Intelligently parse and format raw data using Claude
   */
  async formatStudyData(rawData: string, format: string): Promise<StudyData[]> {
    const prompt = this.buildFormattingPrompt(rawData, format);
    
    try {
      const response = await this.claude.messages.create({
        model: this.model,
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt
        }],
        system: this.getSystemPrompt()
      });

      const formattedData = this.parseClaudeResponse(response);
      logger.info('Claude agent formatted data successfully', { 
        studyCount: formattedData.length 
      });

      return formattedData;
    } catch (error) {
      logger.error('Claude agent formatting failed', { error });
      throw new ValidationError('Failed to format data with Claude agent', { error });
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

    const response = await this.claude.messages.create({
      model: this.model,
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }],
      system: 'You are a statistical expert. Fix data issues while preserving study integrity.'
    });

    return this.parseFixedData(response);
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

    const response = await this.claude.messages.create({
      model: this.model,
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    return this.parseColumnMapping(response);
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

  private getSystemPrompt(): string {
    return `You are an expert in meta-analysis data processing. Your role is to:
1. Parse various data formats (CSV, Excel, RevMan) accurately
2. Calculate missing statistical values when possible
3. Ensure data quality and consistency
4. Follow meta-analysis best practices
5. Preserve study integrity while fixing obvious errors

Always return valid JSON that can be parsed directly.`;
  }

  private parseClaudeResponse(response: any): StudyData[] {
    try {
      const content = response.content[0].text;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Failed to parse Claude response', { error });
      throw new ValidationError('Invalid response format from Claude');
    }
  }

  private parseFixedData(response: any): any {
    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }
    return JSON.parse(jsonMatch[0]);
  }

  private parseColumnMapping(response: any): Record<string, string> {
    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[^}]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON mapping found in response');
    }
    return JSON.parse(jsonMatch[0]);
  }
}