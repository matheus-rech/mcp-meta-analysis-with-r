#!/usr/bin/env Rscript

# Install required R packages for MCP Meta-Analysis Server

cat("Installing R packages for MCP Meta-Analysis Server...\n")
cat("====================================================\n\n")

# Define required packages
required_packages <- c(
  "meta",      # Core meta-analysis package
  "metafor",   # Advanced meta-analysis methods
  "dplyr",     # Data manipulation
  "jsonlite",  # JSON parsing
  "ggplot2",   # Plotting
  "rmarkdown", # RMarkdown support
  "knitr"      # R documentation generation
)

# Check which packages are already installed
installed <- required_packages %in% rownames(installed.packages())
to_install <- required_packages[!installed]

if (length(to_install) == 0) {
  cat("✅ All required packages are already installed!\n")
} else {
  cat("📦 Installing", length(to_install), "missing package(s):", paste(to_install, collapse=", "), "\n\n")
  
  # Install missing packages
  install.packages(
    to_install,
    repos = "https://cloud.r-project.org/",
    dependencies = TRUE,
    Ncpus = parallel::detectCores()
  )
  
  # Verify installation
  cat("\n\nVerifying installation...\n")
  still_missing <- to_install[!(to_install %in% rownames(installed.packages()))]
  
  if (length(still_missing) == 0) {
    cat("✅ All packages installed successfully!\n")
  } else {
    cat("❌ Failed to install:", paste(still_missing, collapse=", "), "\n")
    quit(status = 1)
  }
}

# Test loading all packages
cat("\nTesting package loading...\n")
for (pkg in required_packages) {
  tryCatch({
    suppressPackageStartupMessages(library(pkg, character.only = TRUE))
    cat("✅", pkg, "loaded successfully\n")
  }, error = function(e) {
    cat("❌", pkg, "failed to load:", e$message, "\n")
  })
}

cat("\n✅ R environment is ready for MCP Meta-Analysis Server!\n")