#!/usr/bin/env Rscript
#
# Meta-Analysis Core Functions
# Part of MCP Meta-Analysis Server
#

# Load required libraries
suppressPackageStartupMessages({
  library(meta)
  library(metafor)
  library(dplyr)
  library(jsonlite)
  library(ggplot2)
})

# Global configuration
options(warn = 1)  # Show warnings as they occur

#' Execute Meta-Analysis Based on Effect Measure
#' 
#' @param data Data frame with study data
#' @param effect_measure Effect measure type ("OR", "RR", "MD", "SMD", "HR")
#' @param model_type Model type ("fixed", "random", "auto")
#' @param conf_level Confidence level (default 0.95)
#' @return Meta-analysis result object
perform_meta_analysis <- function(data, effect_measure, model_type = "auto", conf_level = 0.95) {
  cat("Starting meta-analysis...\n")
  cat(sprintf("Effect measure: %s, Model: %s, Studies: %d\n", 
              effect_measure, model_type, nrow(data)))
  
  # Auto-select model based on expected heterogeneity
  if (model_type == "auto") {
    model_type <- if (nrow(data) >= 5) "random" else "fixed"
    cat(sprintf("Auto-selected model: %s\n", model_type))
  }
  
  # Perform analysis based on effect measure
  result <- switch(effect_measure,
    "OR" = perform_binary_analysis(data, "OR", model_type, conf_level),
    "RR" = perform_binary_analysis(data, "RR", model_type, conf_level),
    "MD" = perform_continuous_analysis(data, "MD", model_type, conf_level),
    "SMD" = perform_continuous_analysis(data, "SMD", model_type, conf_level),
    "HR" = perform_survival_analysis(data, "HR", model_type, conf_level),
    stop(paste("Unsupported effect measure:", effect_measure))
  )
  
  cat("Meta-analysis completed successfully\n")
  return(result)
}

#' Perform Binary Outcome Meta-Analysis
perform_binary_analysis <- function(data, measure, model_type, conf_level) {
  cat(sprintf("Performing binary analysis (%s)\n", measure))
  
  # Check for required columns
  required_cols <- c("events_treatment", "n_treatment", "events_control", "n_control")
  missing_cols <- setdiff(required_cols, colnames(data))
  if (length(missing_cols) > 0) {
    stop(paste("Missing required columns:", paste(missing_cols, collapse = ", ")))
  }
  
  # Handle zero events with continuity correction
  data <- handle_zero_events(data)
  
  # Perform meta-analysis
  ma_result <- metabin(
    event.e = events_treatment,
    n.e = n_treatment,
    event.c = events_control,
    n.c = n_control,
    data = data,
    studlab = study_name,
    method = if (model_type == "fixed") "MH" else "Inverse",
    sm = measure,
    level = conf_level,
    method.random.ci = if (model_type == "random") "HK" else "classic",  # Hartung-Knapp adjustment for random effects
    prediction = (model_type == "random")
  )
  
  return(ma_result)
}

#' Perform Continuous Outcome Meta-Analysis
perform_continuous_analysis <- function(data, measure, model_type, conf_level) {
  cat(sprintf("Performing continuous analysis (%s)\n", measure))
  
  # Check for required columns
  required_cols <- c("n_treatment", "mean_treatment", "sd_treatment", 
                     "n_control", "mean_control", "sd_control")
  missing_cols <- setdiff(required_cols, colnames(data))
  if (length(missing_cols) > 0) {
    stop(paste("Missing required columns:", paste(missing_cols, collapse = ", ")))
  }
  
  # Perform meta-analysis
  ma_result <- metacont(
    n.e = n_treatment,
    mean.e = mean_treatment,
    sd.e = sd_treatment,
    n.c = n_control,
    mean.c = mean_control,
    sd.c = sd_control,
    data = data,
    studlab = study_name,
    method.tau = if (model_type == "fixed") "FE" else "REML",
    sm = measure,
    level = conf_level,
    method.random.ci = if (model_type == "random") "HK" else "classic",
    prediction = (model_type == "random")
  )
  
  return(ma_result)
}

#' Perform Survival Analysis Meta-Analysis (simplified)
perform_survival_analysis <- function(data, measure, model_type, conf_level) {
  cat("Performing survival analysis (HR)\n")
  
  # For HR, we typically need log HR and SE
  # This is a simplified implementation
  if (!"effect_size" %in% colnames(data) || !"ci_lower" %in% colnames(data) || !"ci_upper" %in% colnames(data)) {
    stop("Survival analysis requires effect_size, ci_lower, and ci_upper columns")
  }
  
  # Calculate standard errors from confidence intervals
  data$log_hr <- log(data$effect_size)
  data$se_log_hr <- (log(data$ci_upper) - log(data$ci_lower)) / (2 * qnorm((1 + conf_level) / 2))
  
  # Use generic inverse variance method
  ma_result <- metagen(
    TE = log_hr,
    seTE = se_log_hr,
    data = data,
    studlab = study_name,
    method.tau = if (model_type == "fixed") "FE" else "REML",
    sm = "HR",
    level = conf_level,
    method.random.ci = if (model_type == "random") "HK" else "classic"
  )
  
  return(ma_result)
}

#' Handle Zero Events in Binary Data
handle_zero_events <- function(data) {
  # Check for zero events
  zero_both <- (data$events_treatment == 0) & (data$events_control == 0)
  zero_single <- ((data$events_treatment == 0) | (data$events_control == 0)) & !zero_both
  
  if (any(zero_both)) {
    cat(sprintf("Warning: %d studies with zero events in both arms will be excluded\n", sum(zero_both)))
    data <- data[!zero_both, ]
  }
  
  if (any(zero_single)) {
    cat(sprintf("Note: %d studies with zero events in one arm (continuity correction will be applied)\n", sum(zero_single)))
  }
  
  return(data)
}

#' Calculate Effect Sizes and Confidence Intervals
calculate_effect_sizes <- function(data, effect_measure) {
  cat("Calculating individual effect sizes...\n")
  
  if (effect_measure %in% c("OR", "RR")) {
    # Binary outcomes
    data$calculated_effect <- switch(effect_measure,
      "OR" = (data$events_treatment / (data$n_treatment - data$events_treatment)) / 
             (data$events_control / (data$n_control - data$events_control)),
      "RR" = (data$events_treatment / data$n_treatment) / 
             (data$events_control / data$n_control)
    )
  } else if (effect_measure == "MD") {
    # Mean difference
    data$calculated_effect <- data$mean_treatment - data$mean_control
  } else if (effect_measure == "SMD") {
    # Standardized mean difference (Cohen's d)
    pooled_sd <- sqrt(((data$n_treatment - 1) * data$sd_treatment^2 + 
                      (data$n_control - 1) * data$sd_control^2) /
                     (data$n_treatment + data$n_control - 2))
    data$calculated_effect <- (data$mean_treatment - data$mean_control) / pooled_sd
  }
  
  return(data)
}

#' Assess Publication Bias
assess_publication_bias <- function(ma_result, methods = c("egger", "begg", "funnel")) {
  cat("Assessing publication bias...\n")
  
  bias_results <- list()
  
  # Egger's test
  if ("egger" %in% methods && ma_result$k >= 3) {
    tryCatch({
      egger_test <- metabias(ma_result, method.bias = "Egger")
      bias_results$egger_test <- list(
        p_value = egger_test$pval,
        bias = egger_test$estimate,
        interpretation = ifelse(egger_test$pval < 0.05, 
                               "Significant asymmetry detected", 
                               "No significant asymmetry")
      )
      cat(sprintf("Egger's test: p = %.4f\n", egger_test$pval))
    }, error = function(e) {
      cat("Egger's test failed:", e$message, "\n")
      bias_results$egger_test <- list(error = e$message)
    })
  }
  
  # Begg's test  
  if ("begg" %in% methods && ma_result$k >= 3) {
    tryCatch({
      begg_test <- metabias(ma_result, method.bias = "Begg")
      bias_results$begg_test <- list(
        p_value = begg_test$pval,
        interpretation = ifelse(begg_test$pval < 0.05,
                               "Significant publication bias detected",
                               "No significant publication bias")
      )
      cat(sprintf("Begg's test: p = %.4f\n", begg_test$pval))
    }, error = function(e) {
      cat("Begg's test failed:", e$message, "\n")
      bias_results$begg_test <- list(error = e$message)
    })
  }
  
  # Trim and fill
  if ("trimfill" %in% methods && ma_result$k >= 5) {
    tryCatch({
      tf_result <- trimfill(ma_result)
      bias_results$trim_fill <- list(
        imputed_studies = tf_result$k0,
        adjusted_estimate = if (ma_result$comb.random) tf_result$TE.random else tf_result$TE.fixed,
        original_estimate = if (ma_result$comb.random) ma_result$TE.random else ma_result$TE.fixed
      )
      cat(sprintf("Trim & Fill: %d studies imputed\n", tf_result$k0))
    }, error = function(e) {
      cat("Trim & Fill failed:", e$message, "\n")
      bias_results$trim_fill <- list(error = e$message)
    })
  }
  
  return(bias_results)
}

#' Generate Forest Plot
generate_forest_plot <- function(ma_result, filename = "forest_plot.png", 
                                 width = 12, height = 8, dpi = 300) {
  cat("Generating forest plot...\n")
  
  png(filename, width = width, height = height, units = "in", res = dpi)
  
  tryCatch({
    forest(ma_result,
           leftcols = c("studlab", "n.e", "n.c"),
           leftlabs = c("Study", "Treatment N", "Control N"),
           rightcols = c("effect", "ci", "w.random"),
           rightlabs = c("Effect", "95% CI", "Weight"),
           xlab = paste("Favours Control  <-  ->  Favours Treatment"),
           smlab = paste(ma_result$sm, "with 95% CI"),
           print.tau2 = TRUE,
           print.Q = TRUE,
           print.pval.Q = TRUE,
           print.I2 = TRUE,
           col.diamond = "red",
           col.by = "black",
           addrows.below.overall = 2)
  }, error = function(e) {
    cat("Forest plot generation failed:", e$message, "\n")
  })
  
  dev.off()
  cat(sprintf("Forest plot saved: %s\n", filename))
}

#' Generate Funnel Plot
generate_funnel_plot <- function(ma_result, filename = "funnel_plot.png",
                                width = 10, height = 8, dpi = 300) {
  cat("Generating funnel plot...\n")
  
  png(filename, width = width, height = height, units = "in", res = dpi)
  
  tryCatch({
    # Create funnel plot with appropriate axis limits
    if (ma_result$sm %in% c("OR", "RR", "HR")) {
      # For ratio measures, use log scale and convert back
      funnel(ma_result,
             pch = 16,
             col = "black",
             bg = "lightgray",
             xlab = paste("Log", ma_result$sm),
             ylab = "Standard Error",
             contour = c(0.9, 0.95, 0.99))
      
      # Add vertical line at null effect (log scale = 0)
      abline(v = 0, lty = 2, col = "red", lwd = 2)
    } else {
      # For mean differences
      funnel(ma_result,
             pch = 16,
             col = "black", 
             bg = "lightgray",
             xlab = paste("Effect size (", ma_result$sm, ")"),
             ylab = "Standard Error",
             contour = c(0.9, 0.95, 0.99))
      
      # Add vertical line at null effect
      abline(v = 0, lty = 2, col = "red", lwd = 2)
    }
    
    # Add title
    title(main = "Funnel Plot for Publication Bias Assessment",
          sub = paste("Studies =", ma_result$k))
          
  }, error = function(e) {
    cat("Funnel plot generation failed:", e$message, "\n")
    # Create a simple plot with message if main plot fails
    plot(1, 1, type = "n", xlim = c(0, 2), ylim = c(0, 2),
         xlab = "Effect Size", ylab = "Standard Error",
         main = "Funnel Plot Generation Error")
    text(1, 1, paste("Error:", e$message), col = "red")
  })
  
  dev.off()
  cat(sprintf("Funnel plot saved: %s\n", filename))
}

#' Format Results for JSON Output
format_results <- function(ma_result, bias_results = NULL) {
  cat("Formatting results...\n")
  
  # Determine if using fixed or random effects - default to fixed, use random if available
  use_random <- !is.null(ma_result$TE.random) && !is.na(ma_result$TE.random)
  
  # Extract main results
  overall_effect <- list(
    estimate = if (use_random) ma_result$TE.random else ma_result$TE.fixed,
    ci_lower = if (use_random) ma_result$lower.random else ma_result$lower.fixed,
    ci_upper = if (use_random) ma_result$upper.random else ma_result$upper.fixed,
    p_value = if (use_random) ma_result$pval.random else ma_result$pval.fixed,
    z_score = if (use_random) ma_result$zval.random else ma_result$zval.fixed
  )
  
  # Transform back from log scale for ratio measures
  if (ma_result$sm %in% c("OR", "RR", "HR")) {
    overall_effect$estimate <- exp(overall_effect$estimate)
    overall_effect$ci_lower <- exp(overall_effect$ci_lower)
    overall_effect$ci_upper <- exp(overall_effect$ci_upper)
  }
  
  # Heterogeneity statistics
  heterogeneity <- list(
    i_squared = ma_result$I2,
    q_statistic = ma_result$Q,
    q_p_value = ma_result$pval.Q,
    tau_squared = if (!is.null(ma_result$tau2)) ma_result$tau2 else 0
  )
  
  # Model information
  model_info <- list(
    model_type = if (use_random) "random" else "fixed",
    method = ma_result$method,
    studies_included = ma_result$k,
    effect_measure = ma_result$sm
  )
  
  # Individual study results
  individual_studies <- list()
  for (i in 1:ma_result$k) {
    effect_val <- ma_result$TE[i]
    ci_lower_val <- ma_result$lower[i]
    ci_upper_val <- ma_result$upper[i]
    
    # Transform back from log scale for ratio measures
    if (ma_result$sm %in% c("OR", "RR", "HR")) {
      effect_val <- exp(effect_val)
      ci_lower_val <- exp(ci_lower_val)
      ci_upper_val <- exp(ci_upper_val)
    }
    
    individual_studies[[i]] <- list(
      study_id = as.character(ma_result$studlab[i]),
      effect = effect_val,
      ci_lower = ci_lower_val,
      ci_upper = ci_upper_val,
      weight = if (use_random) ma_result$w.random[i] else ma_result$w.fixed[i]
    )
  }
  
  # Compile final results
  results <- list(
    overall_effect = overall_effect,
    heterogeneity = heterogeneity,
    model_info = model_info,
    individual_studies = individual_studies
  )
  
  # Add publication bias results if available
  if (!is.null(bias_results)) {
    results$publication_bias <- bias_results
  }
  
  return(results)
}

cat("Meta-analysis core functions loaded successfully\n")