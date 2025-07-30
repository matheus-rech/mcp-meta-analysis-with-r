# Use official R base image with specific version
FROM rocker/r-ver:4.3.2

# Set maintainer
LABEL maintainer="Matheus Rech <matheusrech@example.com>"
LABEL description="R environment for MCP Meta-Analysis Server"

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Core utilities
    curl \
    wget \
    git \
    # Document generation
    pandoc \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-fonts-recommended \
    # Graphics and plotting
    imagemagick \
    libcairo2-dev \
    libxt-dev \
    # R package compilation dependencies
    libssl-dev \
    libcurl4-openssl-dev \
    libxml2-dev \
    libfontconfig1-dev \
    libharfbuzz-dev \
    libfribidi-dev \
    libfreetype6-dev \
    libpng-dev \
    libtiff5-dev \
    libjpeg-dev \
    # Clean up
    && rm -rf /var/lib/apt/lists/*

# Configure ImageMagick policy for PDF generation
RUN sed -i '/<policy domain="coder" rights="none" pattern="PDF" \/>/d' /etc/ImageMagick-6/policy.xml

# Set CRAN mirror
RUN echo 'options(repos = c(CRAN = "https://cran.rstudio.com/"))' >> /usr/local/lib/R/etc/Rprofile.site

# Install essential R packages for meta-analysis
RUN R -e "install.packages(c( \
    # Core meta-analysis packages \
    'meta', \
    'metafor', \
    'metaSEM', \
    # Data manipulation and I/O \
    'dplyr', \
    'readr', \
    'readxl', \
    'openxlsx', \
    'jsonlite', \
    # Visualization \
    'ggplot2', \
    'forestplot', \
    'grid', \
    'gridExtra', \
    # Document generation \
    'knitr', \
    'rmarkdown', \
    'tinytex', \
    # Additional utilities \
    'devtools', \
    'here', \
    'magrittr' \
    ), dependencies = TRUE, Ncpus = parallel::detectCores())"

# Install additional meta-analysis specific packages
RUN R -e "install.packages(c( \
    'metadat', \
    'weightr', \
    'puniform', \
    'RoBMA', \
    'BayesFactor' \
    ), dependencies = TRUE, Ncpus = parallel::detectCores())"

# Install TinyTeX for PDF generation
RUN R -e "tinytex::install_tinytex()"

# Set environment variables
ENV R_LIBS_USER=/usr/local/lib/R/site-library
ENV PATH="/root/.TinyTeX/bin/x86_64-linux:${PATH}"

# Create working directory
WORKDIR /workspace

# Create directory structure
RUN mkdir -p /workspace/input && \
    mkdir -p /workspace/processing && \
    mkdir -p /workspace/output && \
    mkdir -p /workspace/logs && \
    mkdir -p /workspace/templates

# Copy R utility scripts
COPY r_scripts/ /workspace/r_scripts/
COPY templates/ /workspace/templates/

# Make sure R scripts are executable
RUN chmod +x /workspace/r_scripts/*.R

# Test R installation
RUN R -e "library(meta); library(metafor); library(ggplot2); sessionInfo()"

# Default command
CMD ["R", "--version"]