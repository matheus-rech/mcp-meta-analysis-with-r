import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../logger.js';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface RCodeReviewConfig {
  apiKey: string;
  model?: string;
  focusAreas?: Array<'statistics' | 'performance' | 'reproducibility' | 'documentation' | 'style'>;
}

export class RSpecificReviewAgent {
  private claude: Anthropic;
  private model: string;
  private focusAreas: string[];

  constructor(config: RCodeReviewConfig) {
    this.claude = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-3-opus-20240229';
    this.focusAreas = config.focusAreas || ['statistics', 'reproducibility', 'documentation'];
  }

  /**
   * Review R code for meta-analysis best practices
   */
  async reviewMetaAnalysisCode(filePath: string): Promise<{
    statisticalIssues: Array<{
      line: number;
      issue: string;
      severity: 'critical' | 'major' | 'minor';
      suggestion: string;
      reference?: string;
    }>;
    reproducibilityScore: number;
    recommendations: string[];
    codeQuality: {
      vectorization: number;
      memoryEfficiency: number;
      readability: number;
      documentation: number;
    };
  }> {
    const code = await fs.readFile(filePath, 'utf-8');
    
    // Run lintr with custom configuration
    const lintrResults = await this.runCustomLintr(filePath);
    
    // Analyze with Claude for deeper insights
    const aiAnalysis = await this.analyzeWithClaude(code, lintrResults);
    
    return aiAnalysis;
  }

  /**
   * Custom lintr configuration for meta-analysis
   */
  private async runCustomLintr(filePath: string): Promise<any> {
    const lintrConfig = `
# Custom lintr configuration for meta-analysis code
linters <- list(
  # Standard linters
  assignment_linter = lintr::assignment_linter(),
  line_length_linter = lintr::line_length_linter(120),
  trailing_whitespace_linter = lintr::trailing_whitespace_linter(),
  
  # Statistical best practices
  T_and_F_symbol_linter = lintr::T_and_F_symbol_linter(),
  undesirable_function_linter = lintr::undesirable_function_linter(
    fun = c(
      "attach" = "Use with() or data argument instead",
      "setwd" = "Use here::here() or relative paths",
      "rm(list=ls())" = "Don't clear workspace in scripts",
      "install.packages" = "Document dependencies separately",
      "source" = "Use proper package structure"
    )
  ),
  
  # Meta-analysis specific
  custom_linters = list(
    # Check for set.seed() in analysis scripts
    seed_linter = function(source_file) {
      lapply(
        ids_with_token(source_file, "SYMBOL_FUNCTION_CALL"),
        function(id) {
          token <- with_id(source_file, id)
          if (token$text == "set.seed") {
            Lint(
              filename = source_file$filename,
              line_number = token$line1,
              column_number = token$col1,
              type = "style",
              message = "set.seed() found - good for reproducibility!",
              line = source_file$lines[token$line1]
            )
          }
        }
      )
    }
  )
)

# Run linting
results <- lintr::lint("${filePath}", linters = linters)
jsonlite::toJSON(results, auto_unbox = TRUE)
`;

    const tempScript = path.join(process.cwd(), 'temp', `r_lint_${Date.now()}.R`);
    await fs.ensureDir(path.dirname(tempScript));
    await fs.writeFile(tempScript, lintrConfig);

    try {
      const { stdout } = await execAsync(`Rscript "${tempScript}"`);
      return JSON.parse(stdout || '[]');
    } catch (error) {
      logger.error('R lintr failed', { error });
      return [];
    } finally {
      await fs.remove(tempScript);
    }
  }

  /**
   * Analyze R code with Claude for meta-analysis best practices
   */
  private async analyzeWithClaude(code: string, lintrResults: any): Promise<any> {
    const prompt = `
Analyze this R code for meta-analysis best practices:

\`\`\`r
${code}
\`\`\`

Lintr results: ${JSON.stringify(lintrResults, null, 2)}

Focus areas: ${this.focusAreas.join(', ')}

Please analyze:

1. **Statistical Issues**:
   - Correct use of effect sizes and confidence intervals
   - Appropriate heterogeneity assessment (I², Q-test, τ²)
   - Proper model selection (fixed vs random effects)
   - Publication bias assessment methods
   - Multiple testing corrections if applicable

2. **Reproducibility** (score 0-100):
   - Random seed setting
   - Package versions documented
   - Data paths relative/portable
   - Results saved systematically
   - Clear workflow structure

3. **Code Quality**:
   - Vectorization opportunities
   - Memory efficiency
   - Readability
   - Documentation completeness

4. **Meta-analysis specific checks**:
   - Using appropriate packages (meta, metafor, etc.)
   - Correct function parameters
   - Sensitivity analyses included
   - Forest plot customization
   - PRISMA compliance

Return a JSON with statisticalIssues, reproducibilityScore, recommendations, and codeQuality scores.
`;

    const response = await this.claude.messages.create({
      model: this.model,
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }],
      system: this.getRSystemPrompt()
    });

    return this.parseClaudeResponse(response);
  }

  /**
   * Check roxygen2 documentation completeness
   */
  async checkDocumentation(filePath: string): Promise<{
    coverage: number;
    missingDocs: string[];
    docQuality: {
      examples: boolean;
      parameters: boolean;
      returns: boolean;
      details: boolean;
    };
    suggestions: string[];
  }> {
    const code = await fs.readFile(filePath, 'utf-8');
    
    const prompt = `
Analyze the roxygen2 documentation in this R file:

\`\`\`r
${code}
\`\`\`

Check for:
1. All functions have roxygen2 documentation
2. @param tags for all parameters
3. @return tags where applicable
4. @examples that actually run
5. @export for public functions
6. @importFrom for external functions

For meta-analysis functions, also check:
- @details explaining statistical methodology
- @references to papers/methods
- @seealso linking related functions

Return JSON with coverage percentage, missing docs, quality metrics, and suggestions.
`;

    const response = await this.claude.messages.create({
      model: this.model,
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    return this.parseClaudeResponse(response);
  }

  /**
   * Suggest performance improvements for R code
   */
  async suggestPerformanceImprovements(code: string): Promise<{
    bottlenecks: Array<{
      line: number;
      issue: string;
      impact: 'high' | 'medium' | 'low';
      solution: string;
      example?: string;
    }>;
    vectorizationOpportunities: string[];
    memoryOptimizations: string[];
    parallelizationSuggestions: string[];
  }> {
    const prompt = `
Analyze this R code for performance optimization opportunities:

\`\`\`r
${code}
\`\`\`

Identify:
1. Loop operations that could be vectorized
2. Repeated calculations that could be cached
3. Memory-intensive operations
4. Opportunities for parallel processing
5. Inefficient data structures

For meta-analysis code specifically:
- Large matrix operations
- Bootstrap/permutation tests
- Sensitivity analyses
- Multiple subgroup analyses

Provide specific, actionable improvements with examples.
`;

    const response = await this.claude.messages.create({
      model: this.model,
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: prompt
      }],
      system: 'You are an R performance optimization expert. Focus on practical improvements for statistical computing.'
    });

    return this.parseClaudeResponse(response);
  }

  /**
   * Validate statistical methodology in R code
   */
  async validateStatisticalMethods(code: string): Promise<{
    methodologyIssues: Array<{
      method: string;
      issue: string;
      severity: 'error' | 'warning' | 'info';
      correction: string;
      reference?: string;
    }>;
    assumptions: Array<{
      assumption: string;
      checked: boolean;
      howToCheck?: string;
    }>;
    bestPractices: {
      followed: string[];
      missing: string[];
    };
  }> {
    const prompt = `
Validate the statistical methodology in this R meta-analysis code:

\`\`\`r
${code}
\`\`\`

Check for:
1. Correct effect size calculations
2. Appropriate confidence interval methods
3. Valid heterogeneity assessments
4. Correct model assumptions
5. Proper sensitivity analyses
6. Publication bias methods

Validate against:
- Cochrane Handbook guidelines
- PRISMA standards
- Current best practices in meta-analysis

Return JSON with methodology issues, assumption checks, and best practices assessment.
`;

    const response = await this.claude.messages.create({
      model: this.model,
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: prompt
      }],
      system: this.getRSystemPrompt()
    });

    return this.parseClaudeResponse(response);
  }

  private getRSystemPrompt(): string {
    return `You are an expert R programmer and statistician specializing in meta-analysis.
You have deep knowledge of:
- R best practices and style guides
- Statistical methodology for meta-analysis
- Reproducible research principles
- R packages: meta, metafor, tidyverse, rmarkdown
- Cochrane and PRISMA guidelines

Provide specific, actionable feedback with code examples where helpful.
Always return valid JSON for parsing.`;
  }

  private parseClaudeResponse(response: any): any {
    try {
      const content = response.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Failed to parse Claude response', { error });
      return {
        error: 'Failed to parse AI response',
        suggestions: ['Manual review recommended']
      };
    }
  }
}