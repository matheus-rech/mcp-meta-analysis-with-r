/**
 * Intelligent Linting Demo
 * 
 * This example demonstrates how to use Claude SDK agents to provide
 * AI-enhanced code review for R, Python, and TypeScript files.
 */

import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';

const API_BASE_URL = 'http://localhost:3000/api/v1';

// Example R code with various issues
const SAMPLE_R_CODE = `
# Meta-analysis of treatment effects
# Missing proper documentation and reproducibility measures

library(meta)
library(metafor)

# Bad practice: no seed for reproducibility
analyze_treatment_effects <- function(data_file) {
  # Issue: hardcoded path
  data <- read.csv("C:/Users/John/Desktop/meta_data.csv")
  
  # Issue: using T instead of TRUE
  if (nrow(data) > 10 & T) {
    # Issue: no input validation
    results <- metabin(
      event.e = data$events_treatment,
      n.e = data$n_treatment,
      event.c = data$events_control,
      n.c = data$n_control,
      studlab = data$study,
      sm = "OR"  # Issue: effect measure not parameterized
    )
    
    # Issue: no error handling
    forest(results)
    
    # Issue: results not saved
    return(results)
  }
  
  # Issue: no else clause
}

# Issue: function not documented with roxygen2
calculate_heterogeneity <- function(meta_result) {
  # Issue: accessing list elements without checking
  i2 <- meta_result$I2
  tau <- meta_result$tau
  
  # Issue: no validation of results
  list(i_squared = i2, tau_squared = tau^2)
}

# Issue: using attach (bad practice)
attach(mtcars)
plot(mpg, wt)

# Issue: rm(list=ls()) in script
rm(list = ls())
`;

async function demonstrateIntelligentLinting() {
  try {
    console.log('🚀 Starting Intelligent Linting Demo\n');

    // Step 1: Create linting pipeline
    console.log('1️⃣ Creating intelligent linting pipeline...');
    const pipelineResponse = await axios.post(`${API_BASE_URL}/linting/pipelines`, {
      languages: ['r', 'python', 'typescript'],
      model: 'claude-3-opus-20240229',
      enableAIEnhancement: true,
      outputFormat: 'markdown'
    });

    const pipelineId = pipelineResponse.data.pipelineId;
    console.log(`✅ Pipeline created: ${pipelineId}`);
    console.log('   Capabilities:');
    console.log('   - Traditional linting (lintr, flake8, ESLint)');
    console.log('   - AI-enhanced code review');
    console.log('   - Statistical validation for R');
    console.log('   - Auto-fix suggestions\n');

    // Step 2: Save sample R code to file
    const tempDir = path.join(process.cwd(), 'temp', 'linting-demo');
    await fs.ensureDir(tempDir);
    const rFilePath = path.join(tempDir, 'meta_analysis_demo.R');
    await fs.writeFile(rFilePath, SAMPLE_R_CODE);

    // Step 3: Lint the R file
    console.log('2️⃣ Linting R meta-analysis code...');
    const lintResponse = await axios.post(
      `${API_BASE_URL}/linting/pipelines/${pipelineId}/lint-file`,
      { filePath: rFilePath }
    );

    const jobId = lintResponse.data.jobId;
    console.log(`✅ Linting job started: ${jobId}\n`);

    // Step 4: Wait for completion and get results
    console.log('3️⃣ Waiting for intelligent analysis...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const resultsResponse = await axios.get(`${API_BASE_URL}/linting/jobs/${jobId}/result`);
    const results = resultsResponse.data;

    // Step 5: Display traditional linting issues
    console.log('📋 Traditional Linting Issues Found:');
    console.log('=' .repeat(50));
    
    results.issues.forEach((issue, index) => {
      const icon = issue.severity === 'error' ? '❌' : '⚠️';
      console.log(`\n${icon} Issue #${index + 1} (Line ${issue.line})`);
      console.log(`   Rule: ${issue.rule}`);
      console.log(`   Message: ${issue.message}`);
      if (issue.suggestion) {
        console.log(`   💡 Fix: ${issue.suggestion}`);
      }
    });

    // Step 6: Display AI-enhanced suggestions
    console.log('\n\n🤖 Claude AI-Enhanced Suggestions:');
    console.log('=' .repeat(50));
    
    results.aiSuggestions.forEach((suggestion, index) => {
      const priorityIcon = suggestion.priority === 'high' ? '🔴' : 
                          suggestion.priority === 'medium' ? '🟡' : '🟢';
      console.log(`\n${priorityIcon} Suggestion #${index + 1} (${suggestion.type})`);
      console.log(`   ${suggestion.description}`);
      if (suggestion.code) {
        console.log(`   Example:\n   ${suggestion.code}`);
      }
    });

    // Step 7: Show code quality metrics
    console.log('\n\n📊 Code Quality Metrics:');
    console.log('=' .repeat(50));
    if (results.metrics) {
      console.log(`   Complexity Score: ${results.metrics.complexity || 'N/A'}`);
      console.log(`   Maintainability: ${results.metrics.maintainability || 'N/A'}/100`);
      console.log(`   Documentation: ${results.metrics.documentation || 'N/A'}/100`);
      console.log(`   Reproducibility: ${results.metrics.reproducibility || 'N/A'}/100`);
    }

    // Step 8: R-specific analysis
    console.log('\n\n🔬 R Meta-Analysis Specific Issues:');
    console.log('=' .repeat(50));
    console.log('   ❌ No set.seed() for reproducibility');
    console.log('   ❌ Hardcoded file paths (not portable)');
    console.log('   ❌ Missing roxygen2 documentation');
    console.log('   ❌ No sensitivity analysis included');
    console.log('   ❌ Results not saved for reproducibility');
    console.log('   ⚠️  Using attach() (namespace pollution)');
    console.log('   ⚠️  Effect measure should be parameterized');

    // Step 9: Apply auto-fixes demonstration
    console.log('\n\n🔧 Auto-Fix Capabilities:');
    console.log('=' .repeat(50));
    console.log('   The following issues can be automatically fixed:');
    console.log('   ✅ Replace T with TRUE');
    console.log('   ✅ Remove rm(list=ls())');
    console.log('   ✅ Add spacing around operators');
    console.log('   ✅ Fix line length issues');
    
    // Step 10: Project-wide linting demo
    console.log('\n\n📁 Project-Wide Linting:');
    console.log('=' .repeat(50));
    console.log('   You can also lint entire projects:');
    console.log(`   POST /linting/pipelines/${pipelineId}/lint-project`);
    console.log('   This will:');
    console.log('   - Analyze all R, Python, and TypeScript files');
    console.log('   - Identify project-wide patterns');
    console.log('   - Generate comprehensive reports');
    console.log('   - Suggest architectural improvements');

    // Step 11: Show improved code
    console.log('\n\n✨ Suggested Improved Code:');
    console.log('=' .repeat(50));
    console.log(`
#' Analyze Treatment Effects in Meta-Analysis
#' 
#' @param data_file Path to the CSV file containing meta-analysis data
#' @param effect_measure Effect measure to use ("OR", "RR", "RD")
#' @param seed Random seed for reproducibility
#' @return A meta-analysis object with results
#' @export
#' @examples
#' results <- analyze_treatment_effects("data/meta_data.csv", "OR", 42)
analyze_treatment_effects <- function(data_file, 
                                    effect_measure = "OR",
                                    seed = 42) {
  # Set seed for reproducibility
  set.seed(seed)
  
  # Validate inputs
  if (!file.exists(data_file)) {
    stop("Data file not found: ", data_file)
  }
  
  # Use relative paths or here::here()
  data <- read.csv(data_file, stringsAsFactors = FALSE)
  
  # Validate data
  required_cols <- c("events_treatment", "n_treatment", 
                    "events_control", "n_control", "study")
  if (!all(required_cols %in% names(data))) {
    stop("Missing required columns")
  }
  
  # Proper boolean usage
  if (nrow(data) > 10 && TRUE) {
    # Perform meta-analysis with error handling
    results <- tryCatch({
      metabin(
        event.e = data$events_treatment,
        n.e = data$n_treatment,
        event.c = data$events_control,
        n.c = data$n_control,
        studlab = data$study,
        sm = effect_measure,
        method = "MH"
      )
    }, error = function(e) {
      stop("Meta-analysis failed: ", e$message)
    })
    
    # Save results for reproducibility
    saveRDS(results, file.path(dirname(data_file), "meta_results.rds"))
    
    # Generate and save forest plot
    pdf(file.path(dirname(data_file), "forest_plot.pdf"))
    forest(results)
    dev.off()
    
    return(results)
  } else {
    warning("Insufficient studies for meta-analysis (n < 10)")
    return(NULL)
  }
}
`);

    console.log('\n🎉 Demo Complete!\n');
    console.log('Key Takeaways:');
    console.log('- Claude enhances traditional linting with deep code understanding');
    console.log('- Detects statistical and methodological issues in R code');
    console.log('- Provides actionable, context-aware suggestions');
    console.log('- Scores reproducibility and documentation quality');
    console.log('- Helps maintain high-quality, reproducible research code\n');

    // Cleanup
    await fs.remove(tempDir);

  } catch (error) {
    console.error('❌ Error in demo:', error.response?.data || error.message);
  }
}

// Additional demo: Linting Python code
async function demonstratePythonLinting() {
  const SAMPLE_PYTHON = `
# meta_analysis.py
import pandas as pd
import numpy as np

def calculate_effect_size(data):
    # No type hints
    treatment = data['treatment']
    control = data['control']
    
    # Issue: using == for None comparison
    if treatment == None:
        return None
    
    # Issue: bare except
    try:
        effect = np.mean(treatment) - np.mean(control)
    except:
        print("Error occurred")
    
    # Issue: no return in all paths
`;

  console.log('Python linting would detect:');
  console.log('- Missing type hints');
  console.log('- Use is None instead of == None');
  console.log('- Bare except clause');
  console.log('- Missing return statement');
}

// Run the demo
if (require.main === module) {
  demonstrateIntelligentLinting()
    .then(() => console.log('\n✨ Intelligent linting demo completed!'))
    .catch(err => console.error('Demo failed:', err));
}

export { demonstrateIntelligentLinting, demonstratePythonLinting };