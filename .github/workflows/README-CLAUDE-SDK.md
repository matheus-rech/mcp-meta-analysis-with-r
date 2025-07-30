# Claude SDK Integration Workflows

This repository uses Claude Code SDK to provide intelligent CI/CD automation beyond traditional static analysis.

## 🤖 Available Claude-Powered Workflows

### 1. Enhanced Lint & Analysis (`claude-enhanced-lint.yml`)

**Triggers:** Pull requests, pushes to main/develop

**Features:**
- Analyzes ESLint errors with AI-powered insights
- Provides prioritized fixes with code examples
- Statistical code review for R scripts
- Pattern-based suggestions for codebase-wide improvements

**Example Output:**
```markdown
## 🤖 Claude Code Analysis

### ESLint Summary
- **Errors:** 3
- **Warnings:** 7

### AI-Powered Code Review

**Priority Fixes:**
1. Potential null reference in `session-manager.ts:45`
   ```typescript
   // Current:
   const session = this.sessions[id];
   session.data.push(item); // Could throw if session is undefined
   
   // Fixed:
   const session = this.sessions[id];
   if (!session) {
     throw new Error(`Session ${id} not found`);
   }
   session.data.push(item);
   ```

2. Missing error handling in async function...
```

### 2. Test Generation (`claude-test-generation.yml`)

**Triggers:** Weekly schedule, manual dispatch

**Features:**
- Automatically generates Jest tests for uncovered code
- Creates integration tests for R statistical functions
- Generates edge case and error handling tests
- Opens PR with improved coverage

**Generated Test Example:**
```typescript
describe('MetaAnalysisCalculator', () => {
  it('should calculate correct effect size for binary outcomes', () => {
    const data = {
      treatment: { events: 10, total: 100 },
      control: { events: 5, total: 100 }
    };
    
    const result = calculateOddsRatio(data);
    
    expect(result.or).toBeCloseTo(2.11, 2);
    expect(result.ci_lower).toBeCloseTo(0.70, 2);
    expect(result.ci_upper).toBeCloseTo(6.35, 2);
  });
  
  it('should handle edge case with zero events', () => {
    // Claude generates appropriate continuity correction tests
  });
});
```

### 3. Dependency Analysis (`claude-dependency-analysis.yml`)

**Triggers:** Weekly schedule, manual dispatch

**Features:**
- Intelligent dependency update recommendations
- Security vulnerability prioritization
- Breaking change analysis
- Compatibility checks with R integration

## 🔧 Setup Requirements

1. **Add GitHub Secret:**
   ```bash
   gh secret set ANTHROPIC_API_KEY --body "your-api-key"
   ```

2. **Install Claude CLI (for local testing):**
   ```bash
   npm install -g @claude-ai/cli
   ```

## 📚 Using Claude SDK in Custom Workflows

### Stream Processing Example

```yaml
- name: Multi-turn analysis with Claude
  run: |
    # Start a conversation stream
    (
      echo '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Analyze this codebase"}]}}'
      echo '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Focus on performance bottlenecks"}]}}'
      echo '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Suggest optimizations"}]}}'
    ) | claude -p --output-format=stream-json --input-format=stream-json
```

### Pattern-Based Code Review

```bash
# Find all TODO comments and get Claude to implement them
grep -n "TODO" src/**/*.ts | while read -r line; do
  file=$(echo "$line" | cut -d: -f1)
  lineno=$(echo "$line" | cut -d: -f2)
  todo=$(echo "$line" | cut -d: -f3-)
  
  echo "{\"type\":\"user\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"Implement this TODO in $file at line $lineno: $todo\n\nContext:\n$(sed -n "$((lineno-5)),$((lineno+5))p" "$file")\"}]}}" | \
  claude -p --output-format=json --input-format=stream-json
done
```

### Statistical Validation Pipeline

```bash
# Validate all R scripts for statistical correctness
find . -name "*.R" | while read -r script; do
  cat "$script" | claude -p "Review this R script for:
  1. Correct statistical test selection
  2. Proper p-value interpretation
  3. Valid confidence interval calculations
  4. Appropriate multiple comparison corrections
  5. Correct effect size reporting
  
  Flag any statistical errors or questionable practices." \
  --output-format=json | jq -r '.result'
done
```

## 🎯 Best Practices

1. **Use Streaming for Multi-Turn Conversations:**
   - Maintains context across multiple prompts
   - More efficient for complex analyses

2. **Implement Timeouts:**
   ```bash
   timeout 300 claude -p "$complex_prompt" || echo "Analysis timed out"
   ```

3. **Cache Results:**
   ```bash
   CACHE_KEY=$(echo "$prompt" | sha256sum | cut -d' ' -f1)
   if [ ! -f ".claude-cache/$CACHE_KEY" ]; then
     claude -p "$prompt" > ".claude-cache/$CACHE_KEY"
   fi
   cat ".claude-cache/$CACHE_KEY"
   ```

4. **Rate Limiting:**
   ```bash
   # Add delays between API calls
   sleep 2
   ```

## 🔍 Debugging

Enable verbose mode to debug Claude SDK issues:
```bash
claude -p "test" --verbose 2>claude-debug.log
```

Check logs for:
- API connection issues
- Token problems
- Rate limit errors
- Malformed JSON in streaming mode

## 📈 Metrics & Monitoring

Track Claude SDK usage in your workflows:
```yaml
- name: Log Claude usage
  if: always()
  run: |
    echo "Claude API calls made: $(grep -c "claude -p" $GITHUB_STEP_SUMMARY)"
    echo "Estimated cost: $$(calculate_cost)"
```

## 🚀 Future Enhancements

1. **Code Generation Pipeline:**
   - Generate boilerplate from specifications
   - Auto-implement interfaces
   - Create mock data generators

2. **Documentation Generation:**
   - API documentation from code
   - README updates from changes
   - Changelog generation

3. **Performance Optimization:**
   - Identify bottlenecks
   - Suggest algorithmic improvements
   - Database query optimization

---

For more information about Claude Code SDK, visit the [official documentation](https://docs.anthropic.com/claude/docs/claude-code-sdk).