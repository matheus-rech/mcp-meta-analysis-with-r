import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { logger } from './logger.js';
import { MetaAnalysisResults, StudyData, AnalysisParameters } from './types.js';

export class RExecutor {
  private readonly rScriptsDir: string;
  private readonly dockerImage: string;

  constructor(
    rScriptsDir = './r_scripts',
    dockerImage = 'mcp-meta-analysis-r:latest'
  ) {
    this.rScriptsDir = rScriptsDir;
    this.dockerImage = dockerImage;
  }

  private async checkDockerAvailable(): Promise<boolean> {
    try {
      const docker = spawn('docker', ['images', '-q', this.dockerImage]);
      const output = await new Promise<string>((resolve) => {
        let data = '';
        docker.stdout.on('data', (chunk) => data += chunk);
        docker.on('close', () => resolve(data));
      });
      return output.trim().length > 0;
    } catch {
      return false;
    }
  }

  private async checkRAvailable(): Promise<boolean> {
    try {
      const rscript = spawn('Rscript', ['--version']);
      return new Promise<boolean>((resolve) => {
        rscript.on('error', () => resolve(false));
        rscript.on('close', (code) => resolve(code === 0));
      });
    } catch {
      return false;
    }
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

    // Check execution method
    const useDocker = await this.checkDockerAvailable();
    const hasR = await this.checkRAvailable();
    
    if (!useDocker && !hasR) {
      throw new Error(
        'Meta-analysis requires either Docker or R to be installed.\n\n' +
        'Option 1: Install R from https://www.r-project.org/\n' +
        'Option 2: Build the Docker image with: docker build -f Dockerfile.production -t mcp-meta-analysis-r:latest .\n\n' +
        'For production use, Docker is recommended for consistent results.'
      );
    }

    logger.info(`Running R script with ${useDocker ? 'Docker' : 'direct R'} for session ${sessionId}`);

    // Execute R script
    const results = useDocker 
      ? await this.runRScriptInDocker(sessionId, scriptFile, sessionDir)
      : await this.runRScriptDirect(sessionId, scriptFile, sessionDir);

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

    const useDocker = await this.checkDockerAvailable();
    const hasR = await this.checkRAvailable();
    
    if (!useDocker && !hasR) {
      throw new Error('Plot generation requires either Docker or R to be installed.');
    }
    
    if (useDocker) {
      await this.runRScriptInDocker(sessionId, scriptFile, sessionDir);
    } else {
      await this.runRScriptDirect(sessionId, scriptFile, sessionDir);
    }
    
    return path.join(sessionDir, 'output', 'forest_plot.png');
  }

  async generateFunnelPlot(
    sessionId: string,
    sessionDir: string
  ): Promise<string> {
    const rScript = this.generateFunnelPlotScript();
    const scriptFile = path.join(sessionDir, 'processing', 'funnel_plot.R');
    await fs.writeFile(scriptFile, rScript);

    const useDocker = await this.checkDockerAvailable();
    const hasR = await this.checkRAvailable();
    
    if (!useDocker && !hasR) {
      throw new Error('Plot generation requires either Docker or R to be installed.');
    }
    
    if (useDocker) {
      await this.runRScriptInDocker(sessionId, scriptFile, sessionDir);
    } else {
      await this.runRScriptDirect(sessionId, scriptFile, sessionDir);
    }
    
    return path.join(sessionDir, 'output', 'funnel_plot.png');
  }

  private async runRScriptDirect(
    sessionId: string,
    scriptPath: string,
    sessionDir: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // Change working directory to session directory for R
      const rscript = spawn('Rscript', [scriptPath], {
        cwd: sessionDir,
        env: { ...process.env, R_LIBS_USER: '/usr/local/lib/R/site-library' }
      });

      let stdout = '';
      let stderr = '';

      rscript.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      rscript.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      rscript.on('error', (error) => {
        logger.error(`R script spawn error for session ${sessionId}:`, error);
        reject(new Error(`Failed to start R: ${error.message}. Please ensure R is installed.`));
      });

      rscript.on('close', (code) => {
        if (code !== 0) {
          logger.error(`R script failed for session ${sessionId}:`, { 
            code, 
            stderr,
            stdout 
          });
          reject(new Error(`R script execution failed: ${stderr || 'Unknown error'}`));
        } else {
          // Parse results from output file
          const resultsFile = path.join(sessionDir, 'output', 'results.json');
          if (fs.existsSync(resultsFile)) {
            const results = fs.readJsonSync(resultsFile);
            resolve(results);
          } else {
            resolve({ stdout, stderr });
          }
        }
      });
    });
  }

  private async runRScriptInDocker(
    sessionId: string,
    scriptPath: string,
    sessionDir: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const dockerArgs = [
        'run',
        '--rm',
        '-v', `${sessionDir}:/workspace`,
        '-w', '/workspace',
        this.dockerImage,
        'Rscript',
        path.relative(sessionDir, scriptPath)
      ];

      logger.info(`Executing R script for session ${sessionId}`, { 
        script: scriptPath,
        dockerArgs 
      });

      const docker = spawn('docker', dockerArgs);
      let stdout = '';
      let stderr = '';

      docker.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      docker.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      docker.on('close', async (code) => {
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

      docker.on('error', (error) => {
        logger.error(`Docker execution error for session ${sessionId}:`, error);
        reject(error);
      });
    });
  }

  private generateMetaAnalysisScript(parameters: AnalysisParameters): string {
    return `
# Meta-Analysis Script using Core Functions
source("/workspace/r_scripts/meta_analysis_core.R")

# Read input data
input_data <- fromJSON("processing/studies_data.json")
studies <- input_data$studies
params <- input_data$parameters

# Convert to data frame
df <- do.call(rbind, lapply(studies, data.frame, stringsAsFactors = FALSE))

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

# Generate funnel plot
generate_funnel_plot(ma_result, "output/funnel_plot.png")

cat("Analysis completed successfully\\n")
`;
  }

  private generateForestPlotScript(options: any): string {
    return `
# Forest Plot Generation
library(meta)
library(forestplot)
library(jsonlite)

# Load previous results
results_file <- "processing/results.json"
if (file.exists(results_file)) {
  results <- fromJSON(results_file)
  
  # Load the meta-analysis object (assuming it was saved)
  load("processing/meta_analysis.RData")
  
  # Generate custom forest plot
  png("output/forest_plot.png", width = 1200, height = 800, res = 300)
  forest(ma_result, 
         xlim = c(-3, 3),
         col.diamond = "red",
         col.by = "black",
         print.tau2 = TRUE,
         print.Q = TRUE,
         print.pval.Q = TRUE,
         print.I2 = TRUE)
  dev.off()
  
  cat("Forest plot generated successfully\\n")
} else {
  cat("Error: No results file found\\n")
}
`;
  }

  private generateFunnelPlotScript(): string {
    return `
# Funnel Plot Generation  
library(meta)
library(jsonlite)

# Load previous results
results_file <- "processing/results.json"
if (file.exists(results_file)) {
  load("processing/meta_analysis.RData")
  
  # Generate funnel plot
  png("output/funnel_plot.png", width = 1200, height = 800, res = 300)
  funnel(ma_result, 
         pch = 16,
         col = "black",
         bg = "lightgray")
  dev.off()
  
  cat("Funnel plot generated successfully\\n")
} else {
  cat("Error: No results file found\\n")
}
`;
  }

}