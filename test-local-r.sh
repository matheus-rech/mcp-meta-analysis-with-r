#!/bin/bash

echo "Testing MCP Meta-Analysis Server with local R installation"
echo "=========================================================="

# Check R installation
echo "1. Checking R installation..."
if command -v R &> /dev/null; then
    R --version | head -n 1
else
    echo "❌ R is not installed"
    exit 1
fi

# Check required R packages
echo -e "\n2. Checking required R packages..."
Rscript -e "
packages <- c('meta', 'metafor', 'dplyr', 'jsonlite', 'ggplot2')
installed <- packages %in% rownames(installed.packages())
if (all(installed)) {
    cat('✅ All required R packages are installed\n')
} else {
    cat('❌ Missing packages:', packages[!installed], '\n')
    cat('Install with: install.packages(c(', paste0('\"', packages[!installed], '\"', collapse=', '), '))\n')
}
"

# Test the MCP server
echo -e "\n3. Testing MCP server..."
export USE_DOCKER=false
timeout 10s npm start 2>&1 | head -n 20

echo -e "\n✅ Test complete!"
echo "If all checks passed, the server is ready to use with local R."