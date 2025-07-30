import { spawn, ChildProcess } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { logger } from './logger.js';
import { MetaAnalysisResults, StudyData, AnalysisParameters } from './types.js';

export class RExecutorLocal {
  private readonly rScriptsDir: string;

  constructor(rScriptsDir = './r_scripts') {
    this.rScriptsDir = rScriptsDir;
  }

  async executeMetaAnalysis(
    sessionId: string,
    studies: StudyData[],
    parameters: AnalysisParameters,
    sessionDir: string
  ): Promise<MetaAnalysisResults> {
    // Prepare input data
    const inputFile = path.join(sessionDir, 'processing', 'studies_data.json');
    await fs.writeJson(inputFile, { studies, parameters });

    // Create R script
    const rScript = this.generateMetaAnalysisScript(parameters);
    const scriptFile = path.join(sessionDir, 'processing', 'analysis.R');
    await fs.writeFile(scriptFile, rScript);

    // Execute locally with R
    const results = await this.runRScriptLocally(
      sessionId,
      scriptFile,
      sessionDir
    );

    return results;
  }

  async generateForestPlot(
    sessionId: string,
    plotOptions: any,
    sessionDir: string
  ): Promise<string> {
    const rScript = this.generateForestPlotScript(plotOptions);
    const scriptFile = path.join(sessionDir, 'processing', 'forest_plot.R');
    await fs.writeFile(scriptFile, rScript);

    await this.runRScriptLocally(sessionId, scriptFile, sessionDir);
    
    return path.join(sessionDir, 'output', 'forest_plot.png');
  }

  async generateFunnelPlot(
    sessionId: string,
    sessionDir: string
  ): Promise<string> {
    const rScript = this.generateFunnelPlotScript();
    const scriptFile = path.join(sessionDir, 'processing', 'funnel_plot.R');
    await fs.writeFile(scriptFile, rScript);

    await this.runRScriptLocally(sessionId, scriptFile, sessionDir);
    
    return path.join(sessionDir, 'output', 'funnel_plot.png');
  }

  private async runRScriptLocally(
    sessionId: string,
    scriptPath: string,
    sessionDir: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // Use relative path from working directory
      const relativeScript = path.relative(sessionDir, scriptPath);
      const rArgs = ['--vanilla', relativeScript];

      logger.info(`Executing R script locally for session ${sessionId}`, { 
        script: scriptPath,
        relativeScript,
        args: rArgs,
        workingDir: sessionDir
      });

      const r = spawn('Rscript', rArgs, {
        cwd: sessionDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      r.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      r.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      r.on('close', async (code) => {
        if (code === 0) {
          try {
            // Try to read results from output file
            const resultsFile = path.join(sessionDir, 'processing', 'results.json');
            if (await fs.pathExists(resultsFile)) {
              const results = await fs.readJson(resultsFile);
              resolve(results);
            } else {
              resolve({ stdout, stderr });
            }
          } catch (error) {
            logger.error(`Failed to read results for session ${sessionId}:`, error);
            resolve({ stdout, stderr });
          }
        } else {
          logger.error(`R script failed for session ${sessionId}:`, { 
            code, 
            stderr,
            stdout 
          });
          reject(new Error(`R script execution failed: ${stderr}`));
        }
      });

      r.on('error', (error) => {
        logger.error(`R execution error for session ${sessionId}:`, error);
        reject(error);
      });
    });
  }

  private generateMetaAnalysisScript(parameters: AnalysisParameters): string {
    return `
# Meta-Analysis Script using Core Functions
source("${path.resolve(this.rScriptsDir, 'meta_analysis_core.R')}")

# Read input data
input_data <- fromJSON("processing/studies_data.json")
studies <- input_data$studies
params <- input_data$parameters

# Convert JSON studies list to proper data frame
df <- jsonlite::fromJSON(toJSON(studies), flatten = TRUE)

# Debug: Check columns
cat("Available columns:", paste(colnames(df), collapse = ", "), "\\n")
cat("Data dimensions:", nrow(df), "x", ncol(df), "\\n")
cat("First few rows:\\n")
print(head(df, 3))

# Perform meta-analysis using core functions
ma_result <- perform_meta_analysis(df, params$effect_measure, params$analysis_model, params$confidence_level)

# Assess publication bias if requested
bias_results <- NULL
if (params$publication_bias && ma_result$k >= 3) {
  bias_results <- assess_publication_bias(ma_result, c("egger", "begg", "trimfill"))
}

# Format results for JSON output
results <- format_results(ma_result, bias_results)

# Save results
writeLines(toJSON(results, pretty = TRUE), "processing/results.json")

# Save R workspace for later use
save(ma_result, file = "processing/meta_analysis.RData")

# Generate forest plot
generate_forest_plot(ma_result, "output/forest_plot.png")

# Generate funnel plot (with error handling)
tryCatch({
  generate_funnel_plot(ma_result, "output/funnel_plot.png")
}, error = function(e) {
  cat("Funnel plot generation failed:", e$message, "\\n")
})

cat("Analysis completed successfully\\n")
`;
  }

  private generateForestPlotScript(options: any): string {
    return `
# Forest Plot Generation
source("${path.resolve(this.rScriptsDir, 'meta_analysis_core.R')}")

# Load the meta-analysis object
load("processing/meta_analysis.RData")

# Generate custom forest plot
generate_forest_plot(ma_result, "output/forest_plot.png")

cat("Forest plot generated successfully\\n")
`;
  }

  private generateFunnelPlotScript(): string {
    return `
# Funnel Plot Generation  
source("${path.resolve(this.rScriptsDir, 'meta_analysis_core.R')}")

# Load the meta-analysis object
load("processing/meta_analysis.RData")

# Generate funnel plot with error handling
tryCatch({
  generate_funnel_plot(ma_result, "output/funnel_plot.png")
  cat("Funnel plot generated successfully\\n")
}, error = function(e) {
  cat("Funnel plot generation failed:", e$message, "\\n")
})
`;
  }
}