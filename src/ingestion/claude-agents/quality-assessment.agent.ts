import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../logger.js';
import { StudyData } from '../../types.js';

export interface QualityAssessmentAgentConfig {
  apiKey: string;
  model?: string;
  assessmentTool?: 'cochrane' | 'newcastle-ottawa' | 'jadad' | 'custom';
}

export class QualityAssessmentAgent {
  private claude: Anthropic;
  private model: string;
  private assessmentTool: string;

  constructor(config: QualityAssessmentAgentConfig) {
    this.claude = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-3-opus-20240229';
    this.assessmentTool = config.assessmentTool || 'cochrane';
  }

  /**
   * Assess study quality based on available information
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

    const response = await this.claude.messages.create({
      model: this.model,
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }],
      system: this.getQualitySystemPrompt()
    });

    return this.parseQualityAssessment(response);
  }

  /**
   * Generate GRADE assessment for evidence quality
   */
  async performGRADEAssessment(
    studies: StudyData[],
    metaAnalysisResults: any
  ): Promise<{
    certainty: 'high' | 'moderate' | 'low' | 'very_low';
    factors: {
      risk_of_bias: { rating: string; explanation: string };
      inconsistency: { rating: string; explanation: string };
      indirectness: { rating: string; explanation: string };
      imprecision: { rating: string; explanation: string };
      publication_bias: { rating: string; explanation: string };
    };
    upgrading_factors: Array<{
      factor: string;
      present: boolean;
      explanation: string;
    }>;
    summary_of_findings: string;
    clinical_implications: string;
  }> {
    const prompt = `
Perform a GRADE assessment for this meta-analysis:

Studies: ${JSON.stringify(studies, null, 2)}
Results: ${JSON.stringify(metaAnalysisResults, null, 2)}

Assess:
1. Risk of bias across studies
2. Inconsistency (heterogeneity)
3. Indirectness of evidence
4. Imprecision of results
5. Publication bias

Consider upgrading factors:
- Large effect size
- Dose-response gradient
- Plausible confounding

Provide overall certainty rating with detailed explanations.
`;

    const response = await this.claude.messages.create({
      model: this.model,
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: prompt
      }],
      system: 'You are a GRADE methodology expert. Provide systematic, evidence-based assessments.'
    });

    return this.parseGRADEAssessment(response);
  }

  /**
   * Identify potential sources of bias
   */
  async identifyBiasSources(studies: StudyData[]): Promise<{
    bias_analysis: Array<{
      type: string;
      severity: 'low' | 'moderate' | 'high';
      affected_studies: string[];
      impact_on_results: string;
      mitigation_strategies: string[];
    }>;
    overall_bias_risk: 'low' | 'moderate' | 'high';
    key_recommendations: string[];
  }> {
    const prompt = `
Analyze potential sources of bias in these studies:

${JSON.stringify(studies, null, 2)}

Identify:
1. Selection bias indicators
2. Performance/detection bias risks
3. Attrition bias patterns
4. Reporting bias signals
5. Other sources of bias

For each bias type, assess severity and impact on meta-analysis results.
`;

    const response = await this.claude.messages.create({
      model: this.model,
      max_tokens: 2500,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    return this.parseBiasAnalysis(response);
  }

  private buildQualityAssessmentPrompt(studies: StudyData[]): string {
    const toolSpecificInstructions = {
      'cochrane': `Use Cochrane Risk of Bias tool criteria:
- Random sequence generation
- Allocation concealment
- Blinding of participants and personnel
- Blinding of outcome assessment
- Incomplete outcome data
- Selective reporting
- Other sources of bias`,
      'newcastle-ottawa': `Use Newcastle-Ottawa Scale for observational studies:
- Selection (4 items)
- Comparability (2 items)
- Outcome/Exposure (3 items)`,
      'jadad': `Use Jadad scale focusing on:
- Randomization (0-2 points)
- Blinding (0-2 points)
- Withdrawals and dropouts (0-1 point)`,
      'custom': `Assess based on general quality indicators:
- Study design appropriateness
- Sample size adequacy
- Statistical methods
- Outcome measurement
- Follow-up completeness`
    };

    return `
Assess the quality of these studies using ${this.assessmentTool} criteria:

${JSON.stringify(studies, null, 2)}

${toolSpecificInstructions[this.assessmentTool as keyof typeof toolSpecificInstructions] || toolSpecificInstructions['custom']}

For each study provide:
- Quality score (0-10 scale)
- Risk of bias assessment for each domain
- Key strengths and limitations
- Overall quality rating

Also provide a summary of quality across all studies.
`;
  }

  private getQualitySystemPrompt(): string {
    return `You are an expert in systematic review methodology and study quality assessment.
Your role is to:
1. Apply established quality assessment tools consistently
2. Identify methodological strengths and weaknesses
3. Assess risk of bias systematically
4. Consider the impact of quality on meta-analysis results
5. Provide actionable recommendations

Be objective and evidence-based in your assessments.`;
  }

  private parseQualityAssessment(response: any): any {
    try {
      const content = response.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON quality assessment found');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Failed to parse quality assessment', { error });
      throw error;
    }
  }

  private parseGRADEAssessment(response: any): any {
    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No GRADE assessment found');
    }
    return JSON.parse(jsonMatch[0]);
  }

  private parseBiasAnalysis(response: any): any {
    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No bias analysis found');
    }
    return JSON.parse(jsonMatch[0]);
  }
}