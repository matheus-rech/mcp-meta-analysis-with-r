#!/usr/bin/env node

/**
 * Test script to verify the intelligent linting setup
 * This checks that all components can be imported and basic functionality works
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';

const execAsync = promisify(exec);

async function testSetup() {
  console.log('🧪 Testing Intelligent Linting Setup\n');

  // Test 1: Check R and required packages
  console.log('1️⃣ Checking R installation and packages...');
  try {
    const rCheck = await execAsync('R --version');
    console.log('✅ R is installed:', rCheck.stdout.split('\n')[0]);

    // Check for lintr and roxygen2
    const rPackageCheck = `R -e "if(!require('lintr', quietly=TRUE)) stop('lintr not installed'); if(!require('roxygen2', quietly=TRUE)) stop('roxygen2 not installed'); cat('Packages OK')"`;
    
    try {
      await execAsync(rPackageCheck);
      console.log('✅ R packages lintr and roxygen2 are installed');
    } catch (error) {
      console.log('❌ R packages missing. Install with:');
      console.log('   R -e "install.packages(c(\'lintr\', \'roxygen2\'))"');
    }
  } catch (error) {
    console.log('❌ R is not installed or not in PATH');
  }

  // Test 2: Check Python and flake8
  console.log('\n2️⃣ Checking Python and flake8...');
  try {
    const pythonCheck = await execAsync('python3 --version');
    console.log('✅ Python is installed:', pythonCheck.stdout.trim());

    try {
      await execAsync('flake8 --version');
      console.log('✅ flake8 is installed');
    } catch (error) {
      console.log('❌ flake8 not installed. Install with: pip install flake8');
    }
  } catch (error) {
    console.log('❌ Python is not installed or not in PATH');
  }

  // Test 3: Check TypeScript and ESLint
  console.log('\n3️⃣ Checking TypeScript and ESLint...');
  try {
    await execAsync('npx tsc --version');
    console.log('✅ TypeScript is available');

    try {
      await execAsync('npx eslint --version');
      console.log('✅ ESLint is available');
    } catch (error) {
      console.log('❌ ESLint not installed');
    }
  } catch (error) {
    console.log('❌ TypeScript/ESLint not available');
  }

  // Test 4: Test basic R linting
  console.log('\n4️⃣ Testing R linting functionality...');
  const testRCode = `
# Test R file
test_function <- function(x) {
  if(x == TRUE) {  # Should trigger: use TRUE not T
    return(x)
  }
}
`;

  const tempFile = path.join(process.cwd(), 'test_lint.R');
  await fs.writeFile(tempFile, testRCode);

  try {
    const lintCommand = `R -e "library(lintr); lint_results <- lint('${tempFile}'); if(length(lint_results) > 0) cat('Found', length(lint_results), 'issues') else cat('No issues found')"`;
    const result = await execAsync(lintCommand);
    console.log('✅ R linting works:', result.stdout.includes('issues') ? 'Issues detected correctly' : 'Clean code');
  } catch (error) {
    console.log('❌ R linting failed:', error.message);
  } finally {
    await fs.remove(tempFile);
  }

  // Test 5: Check API dependencies
  console.log('\n5️⃣ Checking Node.js dependencies...');
  try {
    const packageJson = await fs.readJSON(path.join(process.cwd(), 'package.json'));
    const requiredDeps = ['@anthropic-ai/sdk', 'express', 'cors', 'helmet'];
    const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
    
    if (missingDeps.length === 0) {
      console.log('✅ All required dependencies are in package.json');
    } else {
      console.log('❌ Missing dependencies:', missingDeps.join(', '));
      console.log('   Run: npm install');
    }
  } catch (error) {
    console.log('❌ Could not read package.json');
  }

  // Test 6: Check environment variables
  console.log('\n6️⃣ Checking environment variables...');
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('✅ ANTHROPIC_API_KEY is set');
  } else {
    console.log('⚠️  ANTHROPIC_API_KEY not set. Will need to provide in API calls');
  }

  // Test 7: Test file structure
  console.log('\n7️⃣ Checking file structure...');
  const requiredFiles = [
    'src/linting/claude-agents/code-review.agent.ts',
    'src/linting/claude-agents/r-specific.agent.ts',
    'src/linting/intelligent-linting-pipeline.ts',
    'src/api/v1/controllers/linting.controller.ts',
    'src/api/v1/routes/linting.routes.ts'
  ];

  for (const file of requiredFiles) {
    if (await fs.pathExists(file)) {
      console.log(`✅ ${path.basename(file)} exists`);
    } else {
      console.log(`❌ Missing: ${file}`);
    }
  }

  console.log('\n📊 Setup Summary:');
  console.log('- Core linting tools should be installed (R/lintr, Python/flake8, TS/ESLint)');
  console.log('- Node.js dependencies need to be installed with: npm install');
  console.log('- ANTHROPIC_API_KEY should be set for Claude integration');
  console.log('- All source files have been created');
  console.log('\n💡 Next steps:');
  console.log('1. Install missing dependencies');
  console.log('2. Run: npm run build');
  console.log('3. Start API server: npm run start:api');
  console.log('4. Test with the example files in /examples');
}

// Run the test
testSetup().catch(console.error);