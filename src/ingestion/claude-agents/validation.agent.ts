import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../logger.js';
import { StudyData, AnalysisParameters } from '../../types.js';

export interface ValidationAgentConfig {
  apiKey: string;
  model?: string;
}

export class ValidationAgent {
  private claude: Anthropic;
  private model: string;

  constructor(config: ValidationAgentConfig) {
    this.claude = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-3-opus-20240229';
  }

  /**
   * Comprehensive statistical validation using Claude's expertise
   */
  async validateStatisticalIntegrity(
    studies: StudyData[],
    parameters: AnalysisParameters
  ): Promise<{
    valid: boolean;
    issues: Array<{
      severity: 'error' | 'warning' | 'info';
      study?: string;
      field?: string;
      message: string;
      suggestion?: string;
    }>;
    recommendations: string[];
  }> {
    const prompt = `
Validate this meta-analysis data for statistical integrity:

Studies: ${JSON.stringify(studies, null, 2)}
Analysis Parameters: ${JSON.stringify(parameters, null, 2)}

Check for:
1. Statistical impossibilities (e.g., SD = 0, n < events)
2. Confidence interval consistency
3. Effect size calculation accuracy
4. Heterogeneity concerns
5. Publication bias indicators
6. Sample size adequacy
7. Data distribution issues

Return a comprehensive validation report with:
- valid: boolean
- issues: array of specific problems found
- recommendations: array of actionable suggestions
`;

    const response = await this.claude.messages.create({
      model: this.model,
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: prompt
      }],
      system: this.getValidationSystemPrompt()
    });

    return this.parseValidationResponse(response);
  }

  /**
   * Detect optimal analysis approach based on data characteristics
   */
  async recommendAnalysisApproach(studies: StudyData[]): Promise<{
    recommendedModel: 'fixed' | 'random';
    effectMeasure: string;
    reasoning: string;
    additionalAnalyses: string[];
  }> {
    const prompt = `
Analyze these studies and recommend the best meta-analysis approach:

${JSON.stringify(studies, null, 2)}

Consider:
1. Study heterogeneity
2. Sample sizes
3. Effect measure appropriateness
4. Clinical diversity
5. Methodological quality variation

Recommend:
- Statistical model (fixed vs random effects)
- Most appropriate effect measure
- Additional analyses that would be valuable
- Clear reasoning for recommendations
`;

    const response = await this.claude.messages.create({
      model: this.model,
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }],
      system: 'You are a meta-analysis methodology expert. Provide evidence-based recommendations.'
    });

    return this.parseRecommendations(response);
  }

  /**
   * Check for duplicate studies or overlapping data
   */
  async detectDuplicates(studies: StudyData[]): Promise<{
    duplicates: Array<{
      studies: string[];
      confidence: number;
      reason: string;
    }>;
    suggestions: string[];
  }> {
    const prompt = `
Check for duplicate or overlapping studies in this dataset:

${JSON.stringify(studies, null, 2)}

Look for:
1. Same study reported multiple times
2. Overlapping patient populations
3. Multiple publications from same trial
4. Subgroup data reported as separate studies

Return duplicates with confidence scores and reasoning.
`;

    const response = await this.claude.messages.create({
      model: this.model,
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    return this.parseDuplicateCheck(response);
  }

  private getValidationSystemPrompt(): string {
    return `You are a statistical validation expert specializing in meta-analysis. 
Your role is to:
1. Identify statistical errors and inconsistencies
2. Check for methodological issues
3. Ensure data quality standards
4. Provide actionable recommendations
5. Follow Cochrane and PRISMA guidelines

Be thorough but practical. Focus on issues that materially affect results.`;
  }

  private parseValidationResponse(response: any): any {
    try {
      const content = response.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON validation result found');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Failed to parse validation response', { error });
      return {
        valid: false,
        issues: [{
          severity: 'error',
          message: 'Failed to parse validation results',
          suggestion: 'Manual review required'
        }],
        recommendations: ['Perform manual data validation']
      };
    }
  }

  private parseRecommendations(response: any): any {
    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback to defaults
      return {
        recommendedModel: 'random',
        effectMeasure: 'SMD',
        reasoning: 'Default recommendation due to parsing error',
        additionalAnalyses: ['sensitivity analysis', 'publication bias assessment']
      };
    }
    return JSON.parse(jsonMatch[0]);
  }

  private parseDuplicateCheck(response: any): any {
    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        duplicates: [],
        suggestions: ['Manual duplicate check recommended']
      };
    }
    return JSON.parse(jsonMatch[0]);
  }
}