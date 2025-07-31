import { BaseClaudeCodeAgent } from '../../linting/base-claude-code.agent.js';
import { logger } from '../../logger.js';
import { StudyData } from '../../types.js';

export interface QualityAssessmentAgentConfig {
  apiKey: string;
  model?: string;
  assessmentTool?: 'cochrane' | 'newcastle-ottawa' | 'jadad' | 'custom';
}

export class QualityAssessmentAgent extends BaseClaudeCodeAgent {
  private assessmentTool: string;

  constructor(config: QualityAssessmentAgentConfig) {
    super({
      apiKey: config.apiKey,
      model: config.model,
      maxTurns: 1
    });
    this.assessmentTool = config.assessmentTool || 'cochrane';
  }

  /**
   * Assess study quality based on available information using Claude Code SDK
   */
  async assessStudyQuality(studies: StudyData[]): Promise<{
    assessments: Array<{
      study_id: string;
      study_name: string;
      quality_score: number;
      risk_of_bias: {
        selection_bias: 'low' | 'unclear' | 'high';
        performance_bias: 'low' | 'unclear' | 'high';
        detection_bias: 'low' | 'unclear' | 'high';
        attrition_bias: 'low' | 'unclear' | 'high';
        reporting_bias: 'low' | 'unclear' | 'high';
        other_bias: 'low' | 'unclear' | 'high';
      };
      strengths: string[];
      limitations: string[];
      overall_quality: 'high' | 'moderate' | 'low' | 'very_low';
    }>;
    summary: {
      high_quality_count: number;
      moderate_quality_count: number;
      low_quality_count: number;
      main_concerns: string[];
      recommendations: string[];
    };
  }> {
    const prompt = this.buildQualityAssessmentPrompt(studies);
    const messages = await this.executeQuery(prompt);
    
    return this.parseJsonResponse(messages) || {
      assessments: [],
      summary: {
        high_quality_count: 0,
        moderate_quality_count: 0,
        low_quality_count: 0,
        main_concerns: [],
        recommendations: []
      }
    };
  }

  /**
   * Generate GRADE evidence profile
   */
  async generateGRADEProfile(
    studies: StudyData[],
    outcome: string
  ): Promise<{
    certainty: 'high' | 'moderate' | 'low' | 'very_low';
    reasons_for_downgrading: string[];
    reasons_for_upgrading: string[];
    summary_of_findings: string;
  }> {
    const prompt = `
Generate a GRADE evidence profile for this meta-analysis:

Outcome: ${outcome}
Number of studies: ${studies.length}
Total participants: ${studies.reduce((sum, s) => sum + (s.n_treatment || 0) + (s.n_control || 0), 0)}

Study data (first 5):
${JSON.stringify(studies.slice(0, 5), null, 2)}

Assess:
1. Risk of bias across studies
2. Inconsistency (heterogeneity)
3. Indirectness
4. Imprecision
5. Publication bias

Return JSON with certainty level and detailed reasons.
`;

    const messages = await this.executeQuery(prompt);
    return this.parseJsonResponse(messages) || {
      certainty: 'moderate',
      reasons_for_downgrading: [],
      reasons_for_upgrading: [],
      summary_of_findings: 'Unable to generate GRADE profile'
    };
  }

  /**
   * Detect potential publication bias indicators
   */
  async assessPublicationBias(studies: StudyData[]): Promise<{
    likelihood: 'low' | 'moderate' | 'high';
    indicators: string[];
    recommendations: string[];
    funnel_plot_asymmetry: boolean;
  }> {
    const prompt = `
Assess publication bias risk for this meta-analysis:

Number of studies: ${studies.length}
Study sizes: ${JSON.stringify(studies.map(s => ({
  name: s.study_name,
  total_n: (s.n_treatment || 0) + (s.n_control || 0),
  effect_size: s.effect_size
})), null, 2)}

Check for:
1. Small study effects
2. Missing negative studies
3. Industry funding patterns
4. Geographic bias
5. Language bias indicators

Return JSON assessment of publication bias risk.
`;

    const messages = await this.executeQuery(prompt);
    return this.parseJsonResponse(messages) || {
      likelihood: 'moderate',
      indicators: [],
      recommendations: ['Consider funnel plot analysis'],
      funnel_plot_asymmetry: false
    };
  }

  private buildQualityAssessmentPrompt(studies: StudyData[]): string {
    const toolInstructions = {
      'cochrane': `Use Cochrane Risk of Bias tool domains:
- Selection bias (random sequence, allocation concealment)
- Performance bias (blinding of participants/personnel)
- Detection bias (blinding of outcome assessment)
- Attrition bias (incomplete outcome data)
- Reporting bias (selective reporting)
- Other bias`,
      'newcastle-ottawa': `Use Newcastle-Ottawa Scale for observational studies:
- Selection (4 items)
- Comparability (2 items)
- Outcome/Exposure (3 items)`,
      'jadad': `Use Jadad scale focusing on:
- Randomization (0-2 points)
- Blinding (0-2 points)
- Withdrawals/dropouts (0-1 point)`,
      'custom': `Perform comprehensive quality assessment considering all relevant factors`
    };

    return `
Assess the quality of these studies using the ${this.assessmentTool} tool:

${JSON.stringify(studies, null, 2)}

${toolInstructions[this.assessmentTool as keyof typeof toolInstructions] || toolInstructions.custom}

For each study, provide:
1. Quality score (0-100)
2. Risk of bias assessment
3. Key strengths
4. Main limitations
5. Overall quality rating

Also provide a summary with counts and main recommendations.

Return as structured JSON.
`;
  }

  protected getSystemPrompt(): string {
    return `You are an expert in systematic review methodology and study quality assessment.
Your expertise includes:
1. Cochrane Risk of Bias tools
2. GRADE methodology
3. Newcastle-Ottawa Scale
4. PRISMA guidelines
5. Publication bias detection

Provide thorough, evidence-based quality assessments. Be critical but fair.
Consider both reported and unreported potential biases.
Always return structured JSON for easy parsing.`;
  }
}