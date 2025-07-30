# Intelligent Code Linting with Claude SDK

The MCP Meta-Analysis Server includes an advanced AI-powered code linting system that combines traditional static analysis with Claude's deep understanding of code quality, best practices, and domain-specific requirements.

## Overview

The intelligent linting system supports:
- **R** with lintr and roxygen2
- **Python** with flake8 and mypy  
- **TypeScript** with ESLint and tsc

Claude SDK agents enhance traditional linting by:
- Providing deeper context and explanations
- Detecting logical errors and anti-patterns
- Suggesting performance optimizations
- Validating statistical methodology (for R)
- Scoring reproducibility and documentation

## Features

### 🔍 Traditional Linting Enhanced with AI

1. **Deeper Issue Understanding**
   - Traditional: "Line too long (125 > 120)"
   - AI-Enhanced: "Line too long. Consider extracting the complex calculation into a helper function for better readability"

2. **Logic Error Detection**
   - Detects issues static analyzers miss
   - Identifies potential statistical errors
   - Finds security vulnerabilities

3. **Context-Aware Suggestions**
   - Understands the purpose of your code
   - Provides domain-specific recommendations
   - Suggests appropriate design patterns

### 📊 R-Specific Features

Special support for statistical computing and meta-analysis:

```r
# Claude detects statistical issues:
- Incorrect effect size calculations
- Missing sensitivity analyses  
- Improper confidence interval methods
- Lack of reproducibility measures
```

Key R-specific checks:
- **lintr integration**: Style and correctness
- **roxygen2 validation**: Documentation completeness
- **Meta-analysis best practices**: Cochrane/PRISMA compliance
- **Reproducibility scoring**: seed setting, path handling, version control

### 🐍 Python Features

- **flake8**: PEP 8 style compliance
- **mypy**: Type checking
- **Security scanning**: Common vulnerabilities
- **Performance analysis**: Optimization opportunities

### 📘 TypeScript Features

- **ESLint**: Code quality and style
- **tsc**: Type safety validation
- **Modern patterns**: React hooks, async/await
- **Bundle size**: Import optimization

## API Usage

### Create Linting Pipeline

```bash
POST /api/v1/linting/pipelines
```

```json
{
  "languages": ["r", "python", "typescript"],
  "model": "claude-3-opus-20240229",
  "enableAIEnhancement": true,
  "outputFormat": "markdown"
}
```

### Lint Single File

```bash
POST /api/v1/linting/pipelines/{pipelineId}/lint-file
```

```json
{
  "filePath": "/path/to/meta_analysis.R"
}
```

### Lint Entire Project

```bash
POST /api/v1/linting/pipelines/{pipelineId}/lint-project
```

```json
{
  "projectPath": "/path/to/project"
}
```

## R Code Example

```r
# meta_analysis_example.R

# Claude will detect multiple issues here:
library(meta)
library(metafor)

# Issue: No set.seed() for reproducibility
perform_analysis <- function(data) {
  # Issue: Using T instead of TRUE
  if (nrow(data) > 0 & T) {
    # Issue: Hardcoded path
    results <- read.csv("/Users/john/Desktop/results.csv")
    
    # Issue: No parameter documentation
    m <- metabin(
      event.e = events_treatment,
      n.e = n_treatment,
      event.c = events_control,
      n.c = n_control,
      data = data
    )
    
    # Issue: Results not saved
    return(m)
  }
}

# Claude's AI-enhanced feedback:
# 1. Add set.seed(123) for reproducibility
# 2. Use TRUE instead of T (can be overwritten)
# 3. Use relative paths or here::here()
# 4. Add roxygen2 documentation
# 5. Save intermediate results
# 6. Add error handling
# 7. Consider sensitivity analysis
```

## Linting Results Format

```json
{
  "file": "meta_analysis.R",
  "issues": [
    {
      "line": 8,
      "column": 15,
      "severity": "error",
      "message": "Use TRUE instead of T",
      "rule": "T_and_F_symbol_linter",
      "suggestion": "Replace 'T' with 'TRUE' for clarity and safety",
      "aiEnhanced": true
    }
  ],
  "aiSuggestions": [
    {
      "type": "improvement",
      "description": "Add set.seed() at the beginning for reproducible results",
      "code": "set.seed(42) # Or any consistent seed value",
      "priority": "high"
    },
    {
      "type": "refactor",
      "description": "Extract effect size calculation into separate function",
      "priority": "medium"
    }
  ],
  "metrics": {
    "complexity": 15,
    "maintainability": 72,
    "documentation": 40
  }
}
```

## Auto-Fix Capabilities

The system can automatically fix certain issues:

```bash
POST /api/v1/linting/pipelines/{pipelineId}/auto-fix
```

```json
{
  "filePath": "/path/to/file.R",
  "issueIds": ["issue-0", "issue-2", "issue-5"]
}
```

Fixable issues include:
- Whitespace and formatting
- Simple replacements (T → TRUE)
- Import sorting
- Some type annotations

## Project-Wide Analysis

When linting an entire project, you get:

1. **Summary Statistics**
   - Total files analyzed
   - Issues by severity
   - Overall code quality score

2. **Common Patterns**
   - Most frequent issues
   - Project-wide anti-patterns
   - Consistency problems

3. **Recommendations**
   - Architecture improvements
   - Testing strategies
   - Documentation needs

## R-Specific Linting Rules

### Style Rules
- `line_length_linter`: Max 120 characters
- `object_name_linter`: Use snake_case
- `assignment_linter`: Use <- not =
- `spaces_left_parentheses_linter`: Proper spacing

### Correctness Rules
- `T_and_F_symbol_linter`: Use TRUE/FALSE
- `equals_na_linter`: Use is.na()
- `implicit_integer_linter`: Use 1L for integers
- `undesirable_function_linter`: Avoid attach(), setwd()

### Meta-Analysis Rules
- Require set.seed() for reproducibility
- Document all statistical choices
- Include sensitivity analyses
- Save intermediate results
- Use established packages

## Integration with CI/CD

### GitHub Actions

```yaml
- name: Intelligent R Linting
  run: |
    curl -X POST $API_URL/linting/pipelines \
      -H "X-API-Key: ${{ secrets.API_KEY }}" \
      -d '{"languages": ["r"], "model": "claude-3-opus-20240229"}'
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Run intelligent linting on staged R files
for file in $(git diff --cached --name-only --diff-filter=ACM | grep '\.R$'); do
  result=$(curl -s -X POST $API_URL/linting/pipelines/$PIPELINE_ID/lint-file \
    -d "{\"filePath\": \"$file\"}")
  
  if [ $(echo $result | jq '.issues | length') -gt 0 ]; then
    echo "Linting issues found in $file"
    exit 1
  fi
done
```

## Best Practices

1. **Start with High-Value Files**
   - Core analysis scripts
   - Shared utility functions
   - Package documentation

2. **Configure for Your Needs**
   - Adjust strictness levels
   - Focus on relevant rules
   - Custom rule additions

3. **Review AI Suggestions**
   - Not all suggestions apply
   - Consider context
   - Learn from patterns

4. **Integrate Gradually**
   - Start with warnings
   - Fix critical issues first
   - Improve over time

## Performance Considerations

- Small files (<500 lines): 2-5 seconds
- Medium files (500-2000 lines): 5-10 seconds
- Large files (2000+ lines): 10-20 seconds

Factors affecting speed:
- AI model selection
- Number of issues found
- Code complexity
- Network latency

## Troubleshooting

### Common Issues

1. **"Pipeline not found"**
   - Create a new pipeline first
   - Check pipeline ID

2. **"File not accessible"**
   - Verify file path
   - Check permissions

3. **Timeout errors**
   - Break large files
   - Use simpler model

### R-Specific Issues

1. **lintr not found**
   ```r
   install.packages("lintr")
   install.packages("roxygen2")
   ```

2. **Custom linters failing**
   - Check R version (>= 4.0)
   - Update packages

## Future Enhancements

- Support for more languages (Julia, SAS)
- Custom rule creation UI
- IDE integrations
- Real-time linting
- Team-wide rule sharing