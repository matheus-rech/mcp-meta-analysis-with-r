import { BaseClaudeCodeAgent } from '../base-claude-code.agent.js';
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

export class RSpecificReviewAgent extends BaseClaudeCodeAgent {
  private focusAreas: string[];

  constructor(config: RCodeReviewConfig) {
    super({
      apiKey: config.apiKey,
      model: config.model,
      maxTurns: 2 // Allow follow-up for complex statistical reviews
    });
    this.focusAreas = config.focusAreas || ['statistics', 'reproducibility', 'documentation'];
  }

  /**
   * Review R code for meta-analysis best practices using Claude Code SDK
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
    
    // Run roxygen2 checks
    const roxygenIssues = await this.checkRoxygen(filePath);
    
    // Perform Claude Code SDK analysis
    const analysis = await this.analyzeWithClaude(code, lintrResults, roxygenIssues, filePath);
    
    return analysis;
  }

  /**
   * Analyze R package structure and dependencies
   */
  async analyzePackageStructure(packagePath: string): Promise<{
    structure: {
      hasDescription: boolean;
      hasNamespace: boolean;
      hasTests: boolean;
      hasVignettes: boolean;
      hasCitation: boolean;
    };
    dependencies: {
      missing: string[];
      unused: string[];
      version_conflicts: string[];
    };
    suggestions: string[];
  }> {
    const prompt = `
Analyze this R package structure:

Path: ${packagePath}
Files: ${await this.listPackageFiles(packagePath)}

Check for:
1. Proper package structure (DESCRIPTION, NAMESPACE, R/, tests/, vignettes/)
2. Dependency management
3. Documentation completeness
4. Best practices compliance

Return JSON analysis.
`;

    const messages = await this.executeQuery(prompt);
    return this.parseJsonResponse(messages) || {
      structure: {
        hasDescription: false,
        hasNamespace: false,
        hasTests: false,
        hasVignettes: false,
        hasCitation: false
      },
      dependencies: {
        missing: [],
        unused: [],
        version_conflicts: []
      },
      suggestions: []
    };
  }

  /**
   * Review statistical methodology in R code
   */
  async reviewStatisticalMethods(code: string): Promise<{
    methods: Array<{
      method: string;
      line: number;
      appropriate: boolean;
      concerns: string[];
      alternatives?: string[];
    }>;
    assumptions: Array<{
      assumption: string;
      checked: boolean;
      howToCheck?: string;
    }>;
    powerAnalysis: {
      conducted: boolean;
      adequate: boolean;
      suggestions: string[];
    };
  }> {
    const prompt = `
Review the statistical methodology in this R code:

${code}

Focus on:
1. Appropriateness of statistical tests
2. Assumption checking
3. Power analysis
4. Multiple comparisons corrections
5. Effect size reporting

Return detailed JSON analysis.
`;

    const messages = await this.executeQuery(prompt);
    return this.parseJsonResponse(messages) || {
      methods: [],
      assumptions: [],
      powerAnalysis: {
        conducted: false,
        adequate: false,
        suggestions: []
      }
    };
  }

  private async runCustomLintr(filePath: string): Promise<any[]> {
    const lintConfig = `
library(lintr)

# Meta-analysis specific linters
meta_linters <- linters_with_defaults(
  line_length_linter(120),
  object_name_linter("snake_case"),
  commented_code_linter(),
  trailing_whitespace_linter(),
  T_and_F_symbol_linter(),
  undesirable_function_linter(c(
    "setwd" = "Use here::here() or relative paths",
    "rm(list=ls())" = "Don't clear workspace in scripts",
    "install.packages" = "Document dependencies in DESCRIPTION",
    "source" = "Use proper package structure instead"
  )),
  missing_package_linter(),
  namespace_linter()
)

# Run linting
results <- lint("${filePath}", linters = meta_linters)

# Convert to JSON
cat(jsonlite::toJSON(
  lapply(results, function(x) list(
    line = x$line_number,
    column = x$column_number,
    type = x$type,
    message = x$message,
    linter = x$linter
  )),
  auto_unbox = TRUE
))
`;

    const tempScript = path.join(process.cwd(), 'temp', `lintr_${Date.now()}.R`);
    await fs.ensureDir(path.dirname(tempScript));
    await fs.writeFile(tempScript, lintConfig);

    try {
      const { stdout } = await execAsync(`Rscript "${tempScript}"`);
      return JSON.parse(stdout || '[]');
    } catch (error) {
      logger.error('Custom lintr failed', { error });
      return [];
    } finally {
      await fs.remove(tempScript);
    }
  }

  private async checkRoxygen(filePath: string): Promise<any[]> {
    // Check for roxygen2 documentation
    const roxygenScript = `
library(roxygen2)

# Parse file for roxygen comments
parsed <- parse_file("${filePath}")

# Check for missing documentation
functions <- Filter(function(x) inherits(x, "function"), parsed)
documented <- sapply(functions, function(f) {
  comments <- getSrcref(f)
  !is.null(comments) && grepl("#'", comments)
})

# Report undocumented functions
undocumented <- names(functions)[!documented]

cat(jsonlite::toJSON(list(
  undocumented_functions = undocumented,
  total_functions = length(functions),
  documented_count = sum(documented)
), auto_unbox = TRUE))
`;

    try {
      const tempScript = path.join(process.cwd(), 'temp', `roxygen_${Date.now()}.R`);
      await fs.ensureDir(path.dirname(tempScript));
      await fs.writeFile(tempScript, roxygenScript);
      
      const { stdout } = await execAsync(`Rscript "${tempScript}"`);
      await fs.remove(tempScript);
      
      return JSON.parse(stdout || '[]');
    } catch (error) {
      logger.error('Roxygen check failed', { error });
      return [];
    }
  }

  private async analyzeWithClaude(
    code: string,
    lintrResults: any[],
    roxygenIssues: any,
    filePath: string
  ): Promise<any> {
    const prompt = `
Analyze this R code for meta-analysis best practices:

File: ${path.basename(filePath)}
Focus areas: ${this.focusAreas.join(', ')}

Code:
\`\`\`r
${code}
\`\`\`

Lintr issues: ${JSON.stringify(lintrResults, null, 2)}
Roxygen issues: ${JSON.stringify(roxygenIssues, null, 2)}

Provide a comprehensive review focusing on:
1. Statistical methodology correctness
2. Reproducibility (set.seed, sessionInfo, etc.)
3. Code efficiency and vectorization
4. Memory management
5. Documentation quality
6. Meta-analysis specific concerns

Return JSON with:
- statisticalIssues: array of issues with line numbers
- reproducibilityScore: 0-100
- recommendations: improvement suggestions
- codeQuality: scores for different aspects
`;

    const messages = await this.executeQuery(prompt);
    return this.parseJsonResponse(messages) || {
      statisticalIssues: [],
      reproducibilityScore: 50,
      recommendations: [],
      codeQuality: {
        vectorization: 50,
        memoryEfficiency: 50,
        readability: 50,
        documentation: 50
      }
    };
  }

  private async listPackageFiles(packagePath: string): Promise<string> {
    try {
      const files = await fs.readdir(packagePath);
      return files.join(', ');
    } catch {
      return 'Unable to list files';
    }
  }

  protected getSystemPrompt(): string {
    return `You are an expert R programmer and statistician specializing in meta-analysis and systematic reviews.

Your expertise includes:
1. Advanced R programming and package development
2. Meta-analysis methodology (fixed/random effects, heterogeneity, publication bias)
3. Statistical best practices and assumption checking
4. Reproducible research principles
5. R performance optimization
6. Tidyverse and data.table ecosystems

Focus on:
- Statistical correctness and appropriate methodology
- Reproducibility (set.seed, sessionInfo, relative paths)
- Efficient vectorization and memory management
- Comprehensive documentation with roxygen2
- Following meta-analysis reporting guidelines (PRISMA, Cochrane)

Always provide specific, actionable feedback with code examples where appropriate.
Return structured JSON for easy parsing.`;
  }
}