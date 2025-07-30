# 🤖 Claude Code Actions & Review Integration Guide

## 📋 Quick Reference Schema

### Core Components
```yaml
Components:
  - Claude Code Actions (General): @claude mentions
  - Claude Code Review (Auto): Automatic PR reviews  
  - Claude Code Review (On-Demand): @claude-review mentions
  
Required Secrets:
  - ANTHROPIC_API_KEY: Your Anthropic API key
  
Repository Permissions:
  - contents: write (for code changes)
  - issues: write (for issue responses)  
  - pull-requests: write (for PR interactions)
```

## 🚀 Installation Schema

### Method 1: CLI Installation (Recommended)
```bash
# In Claude Code CLI
/install-github-app

# If fails, manual setup required
```

### Method 2: Manual Installation
```bash
# 1. Create workflows directory
mkdir -p .github/workflows

# 2. Add API key to secrets
gh secret set ANTHROPIC_API_KEY --body "your-api-key"

# 3. Create workflow files (see templates below)
# 4. Commit and push
git add .github/workflows/
git commit -m "Add Claude Code Actions"
git push origin main
```

## 📁 Workflow Templates

### 1. General Claude Code Actions
**File:** `.github/workflows/claude.yml`
```yaml
name: Claude Code

on:
  issue_comment:
    types: [created]
  issues:
    types: [opened]

jobs:
  claude:
    if: |
      (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'issues' && github.event.action == 'opened')
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
    steps:
      - name: Claude Code Action
        uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### 2. Automatic Code Review
**File:** `.github/workflows/claude-review.yml`
```yaml
name: Claude Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  claude-review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      issues: write
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Claude Code Review
        uses: anthropics/claude-code-action@beta
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          direct_prompt: |
            Comprehensive code review focusing on:
            1. Code quality and maintainability
            2. Security vulnerabilities
            3. Performance optimization
            4. Testing coverage
            5. Documentation needs
            
            Provide specific, actionable feedback with severity levels.
```

### 3. On-Demand Review
**File:** `.github/workflows/claude-review-on-demand.yml`
```yaml
name: Claude On-Demand Review

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]

jobs:
  claude-on-demand-review:
    if: |
      (github.event_name == 'issue_comment' && github.event.issue.pull_request && contains(github.event.comment.body, '@claude-review')) ||
      (github.event_name == 'pull_request_review_comment' && contains(github.event.comment.body, '@claude-review'))
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      issues: write
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Claude On-Demand Review
        uses: anthropics/claude-code-action@beta
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          direct_prompt: |
            Targeted code review based on specific request.
            Address mentioned concerns while providing holistic analysis.
```

## 🎯 Usage Examples & Capabilities

### General Code Actions (@claude)

#### 1. **Feature Implementation**
```markdown
@claude implement a function to calculate effect sizes for meta-analysis

Requirements:
- Support Cohen's d, Hedges' g, and Glass's delta
- Include confidence intervals
- Handle missing data appropriately
- Add comprehensive documentation
```

#### 2. **Bug Fixing**
```markdown
@claude there's an issue in the forest plot generation where confidence intervals are overlapping. Please investigate and fix.
```

#### 3. **Code Refactoring**
```markdown
@claude refactor the meta_analysis_workflow.R file to:
- Improve modularity
- Add better error handling
- Follow R style guidelines
- Add unit tests
```

#### 4. **Documentation Generation**
```markdown
@claude create comprehensive documentation for all functions in the meta-analysis toolkit, including:
- Function descriptions
- Parameter explanations
- Usage examples
- Return value descriptions
```

### Code Review Examples

#### 1. **Automatic Review Triggers**
- **New PR opened:** Automatic comprehensive review
- **PR updated:** Re-review changed files
- **Focus areas:** Security, performance, best practices

#### 2. **On-Demand Review (@claude-review)**
```markdown
@claude-review please focus on the statistical methodology in the new meta-analysis functions. Are the effect size calculations correct?
```

```markdown
@claude-review I'm concerned about performance with large datasets. Can you review the data processing functions?
```

```markdown
@claude-review this is my first R package contribution. Please provide detailed feedback on code style and structure.
```

## 🛠️ Advanced Custom Instructions

### Specialized Prompts for Different Use Cases

#### 1. **R/Statistics Specific Review**
```yaml
direct_prompt: |
  Statistical Code Review for R:
  
  1. **Statistical Methodology:**
     - Verify statistical methods are appropriate
     - Check effect size calculations
     - Validate confidence interval computations
     - Review heterogeneity assessments
  
  2. **R Best Practices:**
     - Function documentation (roxygen2)
     - Error handling and input validation
     - Vectorization opportunities
     - Memory efficiency for large datasets
  
  3. **Meta-Analysis Specific:**
     - Forest plot accuracy
     - Funnel plot interpretation
     - Publication bias tests
     - Sensitivity analysis approaches
```

#### 2. **Security-Focused Review**
```yaml
direct_prompt: |
  Security-focused code review:
  
  - Input validation and sanitization
  - SQL injection prevention
  - XSS vulnerabilities
  - Authentication/authorization issues
  - Secrets management
  - Data exposure risks
  
  Provide security severity ratings and remediation steps.
```

#### 3. **Performance Review**
```yaml
direct_prompt: |
  Performance optimization review:
  
  - Algorithm complexity analysis
  - Memory usage patterns
  - Database query optimization
  - Caching opportunities
  - Parallel processing potential
  - Bottleneck identification
  
  Include before/after performance estimates where possible.
```

### Conditional Workflows

#### 1. **Author-Specific Reviews**
```yaml
jobs:
  review-external:
    if: |
      github.event.pull_request.user.login == 'external-contributor' ||
      github.event.pull_request.author_association == 'FIRST_TIME_CONTRIBUTOR'
    steps:
      - uses: anthropics/claude-code-action@beta
        with:
          direct_prompt: |
            Extra thorough review for external contributor:
            - Detailed security analysis
            - Code style compliance
            - Documentation completeness
            - Test coverage requirements
```

#### 2. **File-Specific Triggers**
```yaml
on:
  pull_request:
    paths:
      - "src/statistical/**/*.R"
      - "R/**/*.R"
      
# Only triggers for R statistical files
```

#### 3. **Size-Based Reviews**
```yaml
jobs:
  large-pr-review:
    if: github.event.pull_request.changed_files > 20
    steps:
      - uses: anthropics/claude-code-action@beta
        with:
          direct_prompt: |
            Large PR Review (20+ files changed):
            - Focus on architectural changes
            - Verify backward compatibility
            - Check for breaking changes
            - Validate migration paths
```

## 🔧 Troubleshooting Guide

### Common Issues & Solutions

#### 1. **404 Error on Installation**
```bash
# Problem: gh: Not Found (HTTP 404)
# Solution: Refresh GitHub CLI permissions
gh auth refresh -h github.com -s repo,workflow

# If still failing, use manual setup
```

#### 2. **Missing Workflow Scope**
```bash
# Check current scopes
gh auth status

# Required scopes: repo, workflow
# Refresh if missing workflow scope
```

#### 3. **API Key Issues**
```bash
# Verify secret exists
gh secret list

# Update if needed
gh secret set ANTHROPIC_API_KEY --body "new-key"
```

#### 4. **Workflow Not Triggering**
- Check workflow syntax: `.github/workflows/*.yml`
- Verify triggers match your use case
- Check repository permissions
- Review GitHub Actions logs

## 📊 Advanced Features

### 1. **Multi-Model Support**
```yaml
# Use different Claude models
with:
  model: "claude-3-5-sonnet-20241022"  # Latest model
  anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### 2. **Custom Tool Integration**
```yaml
# Enable additional tools
with:
  anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
  enable_tools: "bash,python,r_script"
```

### 3. **Environment-Specific Workflows**
```yaml
# Different prompts for different environments
- name: Development Review
  if: github.base_ref == 'develop'
  uses: anthropics/claude-code-action@beta
  with:
    direct_prompt: "Focus on experimental features and rapid iteration"

- name: Production Review  
  if: github.base_ref == 'main'
  uses: anthropics/claude-code-action@beta
  with:
    direct_prompt: "Strict production-ready code review with security focus"
```

## 🎨 Integration Examples

### 1. **Research Workflow Integration**
```markdown
# Issue Template
@claude help me design a meta-analysis for studying the effectiveness of meditation on anxiety reduction.

Include:
- Study selection criteria
- Data extraction template  
- Statistical analysis plan
- R code for analysis
- Visualization requirements
```

### 2. **Code Quality Gates**
```yaml
# Require Claude approval before merge
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  claude-gate:
    steps:
      - uses: anthropics/claude-code-action@beta
        with:
          direct_prompt: |
            Code quality gate review. Only approve if:
            - No security vulnerabilities
            - All tests pass
            - Documentation is complete
            - Follows project standards
            
            Provide APPROVE/REJECT decision with reasoning.
```

### 3. **Automated Documentation**
```yaml
# Auto-update docs when code changes
on:
  push:
    paths: ['src/**/*.R', 'R/**/*.R']
    
jobs:
  update-docs:
    steps:
      - uses: anthropics/claude-code-action@beta
        with:
          direct_prompt: |
            Update README.md and documentation to reflect the latest code changes.
            Ensure all new functions are documented with examples.
```

## 🔄 Maintenance & Updates

### Regular Tasks
- **Monthly:** Review and update custom prompts
- **Quarterly:** Check for new Claude Code Action features
- **As needed:** Adjust triggers based on team workflow

### Best Practices
- Keep prompts specific and actionable
- Use conditional workflows to reduce noise
- Regularly review Claude's suggestions for accuracy
- Update API keys before expiration
- Monitor GitHub Actions usage and costs

## 💡 Pro Tips

1. **Combine triggers** for comprehensive coverage
2. **Use specific prompts** for better results
3. **Test workflows** in feature branches first
4. **Monitor costs** with usage tracking
5. **Create templates** for common review types
6. **Document customizations** for team knowledge sharing

---

*This guide provides a complete framework for implementing and maintaining Claude Code Actions in any repository. Save this schema for consistent implementations across projects.*