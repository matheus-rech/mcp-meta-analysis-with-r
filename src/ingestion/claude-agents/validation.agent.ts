import { BaseClaudeCodeAgent } from '../../linting/base-claude-code.agent.js';
import { logger } from '../../logger.js';
import { StudyData, AnalysisParameters } from '../../types.js';

export interface ValidationAgentConfig {
  apiKey: string;
  model?: string;
}

export class ValidationAgent extends BaseClaudeCodeAgent {
  constructor(config: ValidationAgentConfig) {
    super({
      apiKey: config.apiKey,
      model: config.model,
      maxTurns: 1 // Single-turn for validation
    });
  }

  /**
   * Comprehensive statistical validation using Claude Code SDK
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

Return JSON with:
- valid: boolean
- issues: array of validation issues with severity
- recommendations: array of statistical recommendations
`;

    const messages = await this.executeQuery(prompt);
    return this.parseJsonResponse(messages) || {
      valid: true,
      issues: [],
      recommendations: []
    };
  }

  /**
   * Validate individual study data quality
   */
  async validateStudyQuality(study: StudyData): Promise<{
    qualityScore: number;
    metrics: Record<string, number>;
    concerns: string[];
  }> {
    const prompt = `
Assess the quality of this individual study for meta-analysis:

${JSON.stringify(study, null, 2)}

Evaluate:
1. Completeness of data
2. Internal consistency
3. Statistical power
4. Risk of bias indicators
5. Generalizability

Return JSON with:
- qualityScore: 0-100
- metrics: individual quality metrics
- concerns: list of quality concerns
`;

    const messages = await this.executeQuery(prompt);
    return this.parseJsonResponse(messages) || {
      qualityScore: 50,
      metrics: {},
      concerns: []
    };
  }

  /**
   * Check for duplicate studies using intelligent matching
   */
  async detectDuplicates(studies: StudyData[]): Promise<{
    duplicateGroups: Array<{
      studies: string[];
      confidence: number;
      reason: string;
    }>;
  }> {
    const prompt = `
Detect potential duplicate studies in this dataset:

${JSON.stringify(studies.map(s => ({
  id: s.study_id,
  name: s.study_name,
  year: s.year,
  n_total: (s.n_treatment || 0) + (s.n_control || 0)
})), null, 2)}

Look for:
1. Similar study names
2. Identical sample sizes and years
3. Overlapping author lists
4. Substring matches in names

Return JSON with duplicateGroups array, each containing:
- studies: array of study IDs
- confidence: 0-100
- reason: explanation
`;

    const messages = await this.executeQuery(prompt);
    return this.parseJsonResponse(messages) || { duplicateGroups: [] };
  }

  /**
   * Validate analysis parameters and suggest improvements
   */
  async validateAnalysisApproach(
    studies: StudyData[],
    parameters: AnalysisParameters
  ): Promise<{
    appropriate: boolean;
    suggestions: Array<{
      parameter: string;
      current: any;
      suggested: any;
      rationale: string;
    }>;
  }> {
    const prompt = `
Validate if the analysis approach is appropriate for the data:

Studies summary:
- Count: ${studies.length}
- Outcome type: ${studies[0]?.events_treatment !== undefined ? 'binary' : 'continuous'}
- Total participants: ${studies.reduce((sum, s) => sum + (s.n_treatment || 0) + (s.n_control || 0), 0)}

Current parameters: ${JSON.stringify(parameters, null, 2)}

Evaluate:
1. Effect measure choice
2. Model selection (fixed vs random)
3. Heterogeneity methods
4. Subgroup analysis feasibility

Return JSON with:
- appropriate: boolean
- suggestions: array of parameter improvements
`;

    const messages = await this.executeQuery(prompt);
    return this.parseJsonResponse(messages) || { 
      appropriate: true, 
      suggestions: [] 
    };
  }

  protected getSystemPrompt(): string {
    return `You are a statistical expert specializing in meta-analysis validation. Your role is to:
1. Detect statistical errors and inconsistencies
2. Identify data quality issues
3. Suggest methodological improvements
4. Ensure analysis validity
5. Follow Cochrane and PRISMA guidelines

Always return valid JSON for parsing. Be thorough but practical in recommendations.`;
  }
}