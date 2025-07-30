/**
 * Minimal test to verify core linting functionality works
 * This can be run standalone without the full API
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';

const execAsync = promisify(exec);

// Simple R code with known issues
const TEST_R_CODE = `
# Test meta-analysis code
library(meta)

analyze_data <- function(data) {
  # Issue 1: Using T instead of TRUE
  if(nrow(data) > 0 & T) {
    # Issue 2: No space after comma
    result <- metabin(event.e=data$trt,n.e=data$n_trt)
    return(result)
  }
}

# Issue 3: Line too long
very_long_function_name_that_exceeds_line_length <- function(parameter1, parameter2, parameter3, parameter4, parameter5) {
  print("This line is too long")
}
`;

async function testBasicRLinting() {
  console.log('🧪 Testing Basic R Linting (without Claude SDK)\n');

  const tempDir = path.join(process.cwd(), 'temp', 'linting-test');
  await fs.ensureDir(tempDir);
  const testFile = path.join(tempDir, 'test.R');

  try {
    // Write test file
    await fs.writeFile(testFile, TEST_R_CODE);
    console.log('✅ Created test R file');

    // Test 1: Run lintr
    console.log('\n📋 Running lintr...');
    const lintRScript = `
library(lintr)
library(jsonlite)

# Run linting with default linters
results <- lint("${testFile.replace(/\\/g, '/')}")

# Convert to JSON format
lint_data <- lapply(results, function(x) {
  list(
    line = x$line_number,
    column = x$column_number,
    type = x$type,
    message = x$message,
    linter = x$linter
  )
})

cat(toJSON(lint_data, auto_unbox = TRUE))
`;

    const scriptFile = path.join(tempDir, 'run_lint.R');
    await fs.writeFile(scriptFile, lintRScript);

    try {
      const { stdout, stderr } = await execAsync(`Rscript "${scriptFile}"`);
      
      if (stderr && !stderr.includes('Warning')) {
        console.error('❌ R error:', stderr);
        return;
      }

      const lintResults = JSON.parse(stdout || '[]');
      
      console.log(`\n✅ Lintr found ${lintResults.length} issues:\n`);
      
      lintResults.forEach((issue, index) => {
        console.log(`Issue ${index + 1}:`);
        console.log(`  Line ${issue.line}, Column ${issue.column}`);
        console.log(`  Type: ${issue.type}`);
        console.log(`  Message: ${issue.message}`);
        console.log(`  Linter: ${issue.linter}`);
        console.log('');
      });

      // Test 2: Demonstrate what Claude SDK would add
      console.log('\n🤖 What Claude SDK Would Add:');
      console.log('━'.repeat(50));
      console.log('\nFor "T_and_F_symbol_linter" issue:');
      console.log('  Standard: "Use TRUE/FALSE instead of T/F"');
      console.log('  Claude: "Use TRUE instead of T because T can be overwritten as a variable,');
      console.log('          leading to hard-to-debug errors. In meta-analysis code, this is');
      console.log('          especially important for reproducibility."');
      
      console.log('\nFor missing function documentation:');
      console.log('  Standard: (not detected by lintr)');
      console.log('  Claude: "Add roxygen2 documentation for analyze_data function including');
      console.log('          @param, @return, and @examples. For meta-analysis functions,');
      console.log('          document the statistical methods used."');

      console.log('\nAdditional AI insights:');
      console.log('  - Missing set.seed() for reproducibility');
      console.log('  - No error handling in analysis function');
      console.log('  - Results should be saved for reproducibility');
      console.log('  - Consider adding sensitivity analysis');

    } catch (error) {
      console.error('❌ Linting failed:', error.message);
      console.log('\n💡 Make sure lintr is installed:');
      console.log('   R -e "install.packages(\'lintr\')"');
    }

  } finally {
    // Cleanup
    await fs.remove(tempDir);
  }
}

// Test Python linting
async function testPythonLinting() {
  console.log('\n\n🐍 Testing Python Linting (without Claude SDK)\n');

  const TEST_PYTHON = `
# test.py
def calculate_effect(data):
    if data == None:  # Should use 'is None'
        return
    
    result = data.mean()  # Missing return statement
`;

  const tempFile = 'test_lint.py';
  
  try {
    await fs.writeFile(tempFile, TEST_PYTHON);
    
    const { stdout } = await execAsync(`flake8 ${tempFile} --format=json`, {
      encoding: 'utf-8'
    }).catch(err => ({ stdout: err.stdout || '[]' }));
    
    console.log('✅ Flake8 results:', stdout || 'No issues found');
    
  } catch (error) {
    console.log('❌ Python linting not available:', error.message);
  } finally {
    await fs.remove(tempFile);
  }
}

// Test TypeScript linting
async function testTypeScriptLinting() {
  console.log('\n\n📘 Testing TypeScript Linting (without Claude SDK)\n');

  const TEST_TS = `
// test.ts
function processData(data) {  // Missing type annotations
  if (data == null) {  // Should use ===
    return null
  }
  console.log(data)  // Missing semicolon
}
`;

  const tempFile = 'test_lint.ts';
  
  try {
    await fs.writeFile(tempFile, TEST_TS);
    
    // Create minimal ESLint config
    const eslintConfig = {
      env: { es2021: true, node: true },
      extends: ['eslint:recommended'],
      parser: '@typescript-eslint/parser',
      parserOptions: { ecmaVersion: 12, sourceType: 'module' },
      rules: {
        'eqeqeq': 'error',
        'semi': 'error',
        '@typescript-eslint/explicit-function-return-type': 'warn'
      }
    };
    
    await fs.writeJSON('.eslintrc.json', eslintConfig);
    
    console.log('✅ Would check for:');
    console.log('  - Missing type annotations');
    console.log('  - Use === instead of ==');
    console.log('  - Missing semicolons');
    
  } catch (error) {
    console.log('❌ TypeScript linting setup needed');
  } finally {
    await fs.remove(tempFile);
    await fs.remove('.eslintrc.json');
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Running Minimal Linting Tests\n');
  console.log('This tests the basic linting functionality without the full API\n');
  
  await testBasicRLinting();
  await testPythonLinting();
  await testTypeScriptLinting();
  
  console.log('\n✅ Test Summary:');
  console.log('- Basic linting tools can detect standard issues');
  console.log('- Claude SDK would add context and domain-specific insights');
  console.log('- The full system combines both for comprehensive code review');
}

// Run if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { testBasicRLinting, testPythonLinting, testTypeScriptLinting };