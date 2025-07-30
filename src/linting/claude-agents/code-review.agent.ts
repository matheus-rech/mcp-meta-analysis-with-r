import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';

const execAsync = promisify(exec);

export interface CodeReviewAgentConfig {
  apiKey: string;
  model?: string;
  language: 'r' | 'python' | 'typescript';
  strictness?: 'low' | 'medium' | 'high';
}

export interface LintResult {
  file: string;
  issues: Array<{
    line: number;
    column?: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    rule?: string;
    suggestion?: string;
  }>;
  aiSuggestions: Array<{
    type: 'improvement' | 'refactor' | 'security' | 'performance';
    description: string;
    code?: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  metrics?: {
    complexity?: number;
    maintainability?: number;
    testCoverage?: number;
  };
}

export class CodeReviewAgent {
  private claude: Anthropic;
  private model: string;
  private language: string;
  private strictness: string;

  constructor(config: CodeReviewAgentConfig) {
    this.claude = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-3-opus-20240229';
    this.language = config.language;
    this.strictness = config.strictness || 'medium';
  }

  /**
   * Perform intelligent code review combining traditional linting with AI analysis
   */
  async reviewCode(filePath: string): Promise<LintResult> {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    // Run traditional linter first
    const lintIssues = await this.runTraditionalLinter(filePath);
    
    // Then enhance with Claude's analysis
    const aiAnalysis = await this.performAIAnalysis(fileContent, lintIssues, filePath);
    
    return {
      file: filePath,
      issues: this.mergeLintResults(lintIssues, aiAnalysis.enhancedIssues),
      aiSuggestions: aiAnalysis.suggestions,
      metrics: aiAnalysis.metrics
    };
  }

  /**
   * Run language-specific linters
   */
  private async runTraditionalLinter(filePath: string): Promise<any[]> {
    try {
      switch (this.language) {
        case 'r':
          return await this.runRLinter(filePath);
        case 'python':
          return await this.runPythonLinter(filePath);
        case 'typescript':
          return await this.runTypeScriptLinter(filePath);
        default:
          throw new Error(`Unsupported language: ${this.language}`);
      }
    } catch (error) {
      logger.error('Traditional linter failed', { error, filePath });
      return [];
    }
  }

  /**
   * Run R linter (lintr + roxygen2)
   */
  private async runRLinter(filePath: string): Promise<any[]> {
    const lintScript = `
library(lintr)
library(roxygen2)

# Configure lintr for meta-analysis best practices
linters <- linters_with_defaults(
  line_length_linter(120),
  object_name_linter("snake_case"),
  commented_code_linter(),
  trailing_whitespace_linter(),
  T_and_F_symbol_linter(),
  undesirable_function_linter(c(
    "browser" = "Remove debugging code",
    "debug" = "Remove debugging code",
    "setwd" = "Use relative paths instead"
  ))
)

# Run linting
lint_results <- lint("${filePath}", linters = linters)

# Check roxygen documentation
doc_issues <- tryCatch({
  rd <- parse_file("${filePath}")
  # Check for missing documentation
  list()
}, error = function(e) list())

# Output as JSON
cat(jsonlite::toJSON(list(
  lint = lint_results,
  docs = doc_issues
), auto_unbox = TRUE))
`;

    const tempScript = path.join(process.cwd(), 'temp', `lint_${Date.now()}.R`);
    await fs.ensureDir(path.dirname(tempScript));
    await fs.writeFile(tempScript, lintScript);

    try {
      const { stdout } = await execAsync(`Rscript "${tempScript}"`);
      const results = JSON.parse(stdout);
      
      return results.lint.map((issue: any) => ({
        line: issue.line_number,
        column: issue.column_number,
        severity: issue.type === 'error' ? 'error' : 'warning',
        message: issue.message,
        rule: issue.linter
      }));
    } finally {
      await fs.remove(tempScript);
    }
  }

  /**
   * Run Python linter (flake8 + mypy)
   */
  private async runPythonLinter(filePath: string): Promise<any[]> {
    try {
      // Run flake8
      const { stdout: flake8Output } = await execAsync(
        `flake8 --format=json "${filePath}"`,
        { encoding: 'utf-8' }
      ).catch(err => ({ stdout: err.stdout || '[]' }));

      const flake8Results = JSON.parse(flake8Output || '[]');

      // Run mypy for type checking
      const { stdout: mypyOutput } = await execAsync(
        `mypy --json-report - "${filePath}"`,
        { encoding: 'utf-8' }
      ).catch(err => ({ stdout: err.stdout || '{}' }));

      const mypyResults = JSON.parse(mypyOutput || '{}');

      // Combine results
      const issues = [];

      // Process flake8 results
      for (const [file, fileIssues] of Object.entries(flake8Results)) {
        for (const issue of fileIssues as any[]) {
          issues.push({
            line: issue.line,
            column: issue.column,
            severity: issue.code.startsWith('E') ? 'error' : 'warning',
            message: issue.message,
            rule: issue.code
          });
        }
      }

      // Process mypy results
      if (mypyResults.errors) {
        for (const error of mypyResults.errors) {
          issues.push({
            line: error.line,
            column: error.column,
            severity: 'error',
            message: error.message,
            rule: 'mypy'
          });
        }
      }

      return issues;
    } catch (error) {
      logger.error('Python linting failed', { error });
      return [];
    }
  }

  /**
   * Run TypeScript linter (ESLint + tsc)
   */
  private async runTypeScriptLinter(filePath: string): Promise<any[]> {
    try {
      // Run ESLint
      const { stdout } = await execAsync(
        `npx eslint --format=json "${filePath}"`,
        { encoding: 'utf-8' }
      ).catch(err => ({ stdout: err.stdout || '[{"messages":[]}]' }));

      const eslintResults = JSON.parse(stdout);
      const issues = [];

      for (const fileResult of eslintResults) {
        for (const message of fileResult.messages) {
          issues.push({
            line: message.line,
            column: message.column,
            severity: message.severity === 2 ? 'error' : 'warning',
            message: message.message,
            rule: message.ruleId
          });
        }
      }

      // Run TypeScript compiler check
      const { stdout: tscOutput } = await execAsync(
        `npx tsc --noEmit --pretty false --skipLibCheck "${filePath}"`,
        { encoding: 'utf-8' }
      ).catch(err => ({ stdout: err.stdout || '' }));

      // Parse tsc output
      const tscErrors = tscOutput.split('\n').filter((line: string) => line.includes('error TS'));
      for (const error of tscErrors) {
        const match = error.match(/(.+)\((\d+),(\d+)\):\s+error\s+TS\d+:\s+(.+)/);
        if (match) {
          issues.push({
            line: parseInt(match[2]),
            column: parseInt(match[3]),
            severity: 'error',
            message: match[4],
            rule: 'tsc'
          });
        }
      }

      return issues;
    } catch (error) {
      logger.error('TypeScript linting failed', { error });
      return [];
    }
  }

  /**
   * Enhance linting results with Claude AI analysis
   */
  private async performAIAnalysis(
    code: string,
    lintIssues: any[],
    filePath: string
  ): Promise<{
    enhancedIssues: any[];
    suggestions: any[];
    metrics: any;
  }> {
    const prompt = this.buildAnalysisPrompt(code, lintIssues, filePath);
    
    const response = await this.claude.messages.create({
      model: this.model,
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }],
      system: this.getSystemPrompt()
    });

    return this.parseAIResponse(response);
  }

  private buildAnalysisPrompt(code: string, lintIssues: any[], filePath: string): string {
    const fileName = path.basename(filePath);
    const fileType = this.language === 'r' ? 'R statistical analysis' :
                     this.language === 'python' ? 'Python' : 'TypeScript';

    return `
Analyze this ${fileType} code for quality, maintainability, and best practices:

File: ${fileName}
Traditional Lint Issues Found: ${lintIssues.length}

Code:
\`\`\`${this.language}
${code}
\`\`\`

Lint Issues:
${JSON.stringify(lintIssues, null, 2)}

Please provide:
1. Enhanced explanations for existing lint issues with fix suggestions
2. Additional issues not caught by traditional linters:
   - Logic errors
   - Performance problems
   - Security vulnerabilities
   - Best practice violations
   - ${this.language === 'r' ? 'Statistical methodology issues' : 'Design pattern issues'}
3. Refactoring suggestions
4. Code quality metrics (complexity, maintainability)

Focus on ${this.strictness} strictness level.
${this.language === 'r' ? 'Pay special attention to statistical correctness and reproducibility.' : ''}

Return a JSON response with enhancedIssues, suggestions, and metrics.
`;
  }

  private getSystemPrompt(): string {
    const languageSpecific: Record<string, string> = {
      r: `You are an expert R programmer and statistician specializing in meta-analysis.
Focus on:
- Statistical correctness and methodology
- Reproducibility and documentation
- Efficient vectorization
- Proper use of tidyverse vs base R
- roxygen2 documentation standards`,
      python: `You are an expert Python developer focused on clean, maintainable code.
Focus on:
- PEP 8 compliance
- Type hints and documentation
- Performance optimization
- Security best practices
- Design patterns`,
      typescript: `You are an expert TypeScript developer focused on type safety and clean architecture.
Focus on:
- Type safety and proper typing
- Clean code principles
- Performance optimization
- Security best practices
- Modern JavaScript/TypeScript patterns`
    };

    return `${languageSpecific[this.language]}

Provide actionable, specific feedback that goes beyond traditional linting.
Focus on code quality, maintainability, and domain-specific best practices.
Always return valid JSON.`;
  }

  private mergeLintResults(traditional: any[], enhanced: any[]): any[] {
    const merged = [...traditional];
    
    // Add AI-enhanced information to existing issues
    for (const issue of merged) {
      const enhancement = enhanced.find(e => 
        e.line === issue.line && e.originalRule === issue.rule
      );
      if (enhancement) {
        issue.suggestion = enhancement.suggestion;
        issue.aiEnhanced = true;
      }
    }

    // Add new AI-detected issues
    const newIssues = enhanced.filter(e => !e.originalRule);
    merged.push(...newIssues);

    return merged.sort((a, b) => a.line - b.line);
  }

  private parseAIResponse(response: any): any {
    try {
      const content = response.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Failed to parse AI response', { error });
      return {
        enhancedIssues: [],
        suggestions: [],
        metrics: {}
      };
    }
  }

  /**
   * Batch review multiple files
   */
  async reviewDirectory(dirPath: string, pattern?: string): Promise<Map<string, LintResult>> {
    const results = new Map<string, LintResult>();
    const extension = this.language === 'r' ? '.R' :
                     this.language === 'python' ? '.py' : '.ts';
    
    const files = await this.findFiles(dirPath, pattern || `*${extension}`);
    
    for (const file of files) {
      try {
        const result = await this.reviewCode(file);
        results.set(file, result);
      } catch (error) {
        logger.error('Failed to review file', { file, error });
      }
    }

    return results;
  }

  private async findFiles(dirPath: string, pattern: string): Promise<string[]> {
    // Implementation would use glob or similar
    // For now, simplified version
    const files: string[] = [];
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isFile() && this.matchesPattern(item, pattern)) {
        files.push(fullPath);
      } else if (stat.isDirectory() && !item.startsWith('.')) {
        files.push(...await this.findFiles(fullPath, pattern));
      }
    }

    return files;
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return regex.test(filename);
  }
}