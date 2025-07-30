import { z } from 'zod';

// Study data schema
export const StudyDataSchema = z.object({
  study_id: z.string(),
  study_name: z.string(),
  year: z.number().optional(),
  n_treatment: z.number().positive(),
  n_control: z.number().positive(),
  events_treatment: z.number().min(0).optional(),
  events_control: z.number().min(0).optional(),
  mean_treatment: z.number().optional(),
  sd_treatment: z.number().positive().optional(),
  mean_control: z.number().optional(),
  sd_control: z.number().positive().optional(),
  effect_size: z.number().optional(),
  ci_lower: z.number().optional(),
  ci_upper: z.number().optional(),
  weight: z.number().positive().optional(),
  quality_score: z.number().min(0).max(10).optional()
});

export type StudyData = z.infer<typeof StudyDataSchema>;

// Analysis parameters
export const AnalysisParametersSchema = z.object({
  effect_measure: z.enum(['OR', 'RR', 'MD', 'SMD', 'HR']),
  analysis_model: z.enum(['fixed', 'random', 'auto']),
  confidence_level: z.number().min(0.5).max(0.99).default(0.95),
  heterogeneity_test: z.boolean().default(true),
  publication_bias: z.boolean().default(true),
  sensitivity_analysis: z.boolean().default(false)
});

export type AnalysisParameters = z.infer<typeof AnalysisParametersSchema>;

// Session data
export interface MetaAnalysisSession {
  id: string;
  user_id?: string;
  project_name: string;
  created_at: Date;
  updated_at: Date;
  status: 'active' | 'completed' | 'error' | 'failed' | 'analysis';
  workflow_stage: 'initialization' | 'data_upload' | 'validation' | 'analysis' | 'reporting';
  parameters: AnalysisParameters;
  study_data: StudyData[];
  files: {
    uploaded: string[];
    generated: string[];
    r_workspace?: string;
  };
  results?: MetaAnalysisResults;
}

// Analysis results
export interface MetaAnalysisResults {
  overall_effect: {
    estimate: number;
    ci_lower: number;
    ci_upper: number;
    p_value: number;
    z_score: number;
  };
  heterogeneity: {
    i_squared: number;
    q_statistic: number;
    q_p_value: number;
    tau_squared: number;
  };
  model_info: {
    model_type: 'fixed' | 'random';
    method: string;
    studies_included: number;
  };
  publication_bias?: {
    egger_test: { p_value: number; bias: number };
    begg_test: { p_value: number };
    trim_fill?: { adjusted_estimate: number; imputed_studies: number };
  };
  individual_studies: Array<{
    study_id: string;
    effect: number;
    ci_lower: number;
    ci_upper: number;
    weight: number;
  }>;
}

// Tool input schemas
export const InitializeMetaAnalysisInputSchema = z.object({
  project_name: z.string().min(1),
  study_type: z.enum(['clinical_trial', 'observational', 'diagnostic']),
  effect_measure: z.enum(['OR', 'RR', 'MD', 'SMD', 'HR']),
  analysis_model: z.enum(['fixed', 'random', 'auto']).default('auto')
});

export const UploadStudyDataInputSchema = z.object({
  session_id: z.string(),
  data_format: z.enum(['csv', 'excel', 'revman']),
  data_content: z.string(),
  validation_level: z.enum(['basic', 'comprehensive']).default('comprehensive')
});

export const PerformMetaAnalysisInputSchema = z.object({
  session_id: z.string(),
  heterogeneity_test: z.boolean().default(true),
  publication_bias: z.boolean().default(true),
  sensitivity_analysis: z.boolean().default(false)
});

export const GenerateForestPlotInputSchema = z.object({
  session_id: z.string(),
  plot_style: z.enum(['classic', 'modern', 'journal_specific']).default('modern'),
  confidence_level: z.number().min(0.5).max(0.99).default(0.95),
  custom_labels: z.record(z.string()).optional()
});

export const AssessPublicationBiasInputSchema = z.object({
  session_id: z.string(),
  methods: z.array(z.enum(['funnel_plot', 'egger_test', 'begg_test', 'trim_fill'])).default(['funnel_plot', 'egger_test'])
});

export const GenerateReportInputSchema = z.object({
  session_id: z.string(),
  format: z.enum(['html', 'pdf', 'word']).default('html'),
  include_code: z.boolean().default(false),
  journal_template: z.string().optional()
});

// Error types
export class MetaAnalysisError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MetaAnalysisError';
  }
}

export class ValidationError extends MetaAnalysisError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class StatisticalError extends MetaAnalysisError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'STATISTICAL_ERROR', details);
    this.name = 'StatisticalError';
  }
}