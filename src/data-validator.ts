import csvParser from 'csv-parser';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import { StudyData, StudyDataSchema, ValidationError } from './types.js';
import { logger } from './logger.js';

export class DataValidator {
  async validateAndParse(
    dataContent: string,
    format: 'csv' | 'excel' | 'revman',
    effectMeasure: string,
    validationLevel: 'basic' | 'comprehensive'
  ): Promise<StudyData[]> {
    let rawData: any[];

    // Parse data based on format
    switch (format) {
      case 'csv':
        rawData = await this.parseCSV(dataContent);
        break;
      case 'excel':
        rawData = await this.parseExcel(dataContent);
        break;
      case 'revman':
        rawData = await this.parseRevMan(dataContent);
        break;
      default:
        throw new ValidationError(`Unsupported format: ${format}`);
    }

    // Validate and transform data
    const studies = await this.validateStudies(rawData, effectMeasure, validationLevel);
    
    logger.info(`Validated ${studies.length} studies`, { 
      format, 
      effectMeasure, 
      validationLevel 
    });

    return studies;
  }

  private async parseCSV(csvContent: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = Readable.from([csvContent]);

      stream
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(new ValidationError(`CSV parsing failed: ${error.message}`)));
    });
  }

  private async parseExcel(base64Content: string): Promise<any[]> {
    try {
      // Decode base64 content
      const buffer = Buffer.from(base64Content, 'base64');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      // Use first worksheet
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];
      
      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet);
      return data;
    } catch (error) {
      throw new ValidationError(`Excel parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async parseRevMan(revmanContent: string): Promise<any[]> {
    // RevMan parsing would be more complex - simplified for now
    throw new ValidationError('RevMan format parsing not yet implemented');
  }

  private async validateStudies(
    rawData: any[],
    effectMeasure: string,
    validationLevel: 'basic' | 'comprehensive'
  ): Promise<StudyData[]> {
    if (!rawData || rawData.length === 0) {
      throw new ValidationError('No data provided or empty dataset');
    }

    const studies: StudyData[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      
      try {
        // Normalize column names (handle variations)
        const normalizedRow = this.normalizeColumnNames(row);
        
        // Basic structure validation
        const studyData = this.validateStudyStructure(normalizedRow, effectMeasure, i + 1);
        
        // Comprehensive validation if requested
        if (validationLevel === 'comprehensive') {
          const validationResults = this.performComprehensiveValidation(studyData, effectMeasure);
          warnings.push(...validationResults.warnings);
          
          if (validationResults.errors.length > 0) {
            errors.push(`Study ${i + 1}: ${validationResults.errors.join(', ')}`);
            continue;
          }
        }

        studies.push(studyData);
      } catch (error) {
        errors.push(`Study ${i + 1}: ${error instanceof Error ? error.message : 'Unknown validation error'}`);
      }
    }

    // Report validation results
    if (errors.length > 0) {
      logger.warn(`Validation completed with ${errors.length} errors and ${warnings.length} warnings`, {
        errors: errors.slice(0, 10), // Limit to first 10 errors
        warnings: warnings.slice(0, 10)
      });
      
      if (errors.length > studies.length / 2) {
        throw new ValidationError(
          `Too many validation errors (${errors.length}/${rawData.length} studies failed):\n${errors.slice(0, 5).join('\n')}`
        );
      }
    }

    if (studies.length === 0) {
      throw new ValidationError('No valid studies found after validation');
    }

    return studies;
  }

  private normalizeColumnNames(row: any): any {
    const normalized: any = {};
    const columnMappings: Record<string, string[]> = {
      'study_id': ['study_id', 'id', 'study'],
      'study_name': ['study_name', 'name', 'study', 'author', 'first_author'],
      'year': ['year', 'publication_year', 'pub_year'],
      'n_treatment': ['n_treatment', 'n_exp', 'n_experimental', 'n_e', 'treatment_n'],
      'n_control': ['n_control', 'n_ctrl', 'n_c', 'control_n'],
      'events_treatment': ['events_treatment', 'events_exp', 'events_e', 'treatment_events'],
      'events_control': ['events_control', 'events_ctrl', 'events_c', 'control_events'],
      'mean_treatment': ['mean_treatment', 'mean_exp', 'mean_e', 'treatment_mean'],
      'mean_control': ['mean_control', 'mean_ctrl', 'mean_c', 'control_mean'],
      'sd_treatment': ['sd_treatment', 'sd_exp', 'sd_e', 'treatment_sd'],
      'sd_control': ['sd_control', 'sd_ctrl', 'sd_c', 'control_sd'],
      'effect_size': ['effect_size', 'effect', 'estimate'],
      'ci_lower': ['ci_lower', 'lower_ci', 'ci_low', 'lower'],
      'ci_upper': ['ci_upper', 'upper_ci', 'ci_high', 'upper'],
      'weight': ['weight', 'wt'],
      'quality_score': ['quality_score', 'quality', 'jadad_score', 'risk_of_bias']
    };

    // Convert all keys to lowercase for matching
    const lowerCaseRow: any = {};
    for (const [key, value] of Object.entries(row)) {
      lowerCaseRow[key.toLowerCase().replace(/\s+/g, '_')] = value;
    }

    // Map columns based on possible variations
    for (const [targetCol, possibleNames] of Object.entries(columnMappings)) {
      for (const possibleName of possibleNames) {
        if (lowerCaseRow[possibleName] !== undefined) {
          normalized[targetCol] = lowerCaseRow[possibleName];
          break;
        }
      }
    }

    return normalized;
  }

  private validateStudyStructure(row: any, effectMeasure: string, rowNumber: number): StudyData {
    // Generate study_id if not provided
    if (!row.study_id && !row.study_name) {
      throw new ValidationError(`Missing study identifier (study_id or study_name)`);
    }

    const studyData: any = {
      study_id: row.study_id || `study_${rowNumber}`,
      study_name: row.study_name || row.study_id || `Study ${rowNumber}`,
      year: row.year ? parseInt(row.year) : undefined
    };

    // Validate required fields based on effect measure
    if (['OR', 'RR'].includes(effectMeasure)) {
      // Binary outcomes
      const requiredFields = ['n_treatment', 'n_control', 'events_treatment', 'events_control'];
      for (const field of requiredFields) {
        if (row[field] === undefined || row[field] === null || row[field] === '') {
          throw new ValidationError(`Missing required field for binary data: ${field}`);
        }
        studyData[field] = parseFloat(row[field]);
        if (isNaN(studyData[field]) || studyData[field] < 0) {
          throw new ValidationError(`Invalid value for ${field}: ${row[field]}`);
        }
      }

      // Validate logical constraints
      if (studyData.events_treatment > studyData.n_treatment) {
        throw new ValidationError(`Treatment events (${studyData.events_treatment}) cannot exceed treatment sample size (${studyData.n_treatment})`);
      }
      if (studyData.events_control > studyData.n_control) {
        throw new ValidationError(`Control events (${studyData.events_control}) cannot exceed control sample size (${studyData.n_control})`);
      }

    } else if (['MD', 'SMD'].includes(effectMeasure)) {
      // Continuous outcomes
      const requiredFields = ['n_treatment', 'n_control', 'mean_treatment', 'mean_control', 'sd_treatment', 'sd_control'];
      for (const field of requiredFields) {
        if (row[field] === undefined || row[field] === null || row[field] === '') {
          throw new ValidationError(`Missing required field for continuous data: ${field}`);
        }
        studyData[field] = parseFloat(row[field]);
        if (isNaN(studyData[field])) {
          throw new ValidationError(`Invalid value for ${field}: ${row[field]}`);
        }
      }

      // Validate positive values where required
      if (studyData.sd_treatment <= 0 || studyData.sd_control <= 0) {
        throw new ValidationError('Standard deviations must be positive');
      }
      if (studyData.n_treatment <= 0 || studyData.n_control <= 0) {
        throw new ValidationError('Sample sizes must be positive');
      }
    }

    // Optional fields
    if (row.effect_size !== undefined) {
      studyData.effect_size = parseFloat(row.effect_size);
    }
    if (row.ci_lower !== undefined) {
      studyData.ci_lower = parseFloat(row.ci_lower);
    }
    if (row.ci_upper !== undefined) {
      studyData.ci_upper = parseFloat(row.ci_upper);
    }
    if (row.weight !== undefined) {
      studyData.weight = parseFloat(row.weight);
    }
    if (row.quality_score !== undefined) {
      studyData.quality_score = parseFloat(row.quality_score);
    }

    // Final validation with Zod schema
    return StudyDataSchema.parse(studyData);
  }

  private performComprehensiveValidation(
    study: StudyData,
    effectMeasure: string
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Sample size checks
    if (study.n_treatment < 10 || study.n_control < 10) {
      warnings.push('Small sample size (n < 10) may affect reliability');
    }

    // Effect size plausibility checks
    if (effectMeasure === 'OR' && study.effect_size) {
      if (study.effect_size < 0.01 || study.effect_size > 100) {
        warnings.push('Extreme odds ratio value - please verify');
      }
    }

    if (effectMeasure === 'RR' && study.effect_size) {
      if (study.effect_size < 0.1 || study.effect_size > 10) {
        warnings.push('Extreme risk ratio value - please verify');
      }
    }

    // Zero events handling
    if (['OR', 'RR'].includes(effectMeasure)) {
      if (study.events_treatment === 0 && study.events_control === 0) {
        warnings.push('Both arms have zero events - may be excluded from analysis');
      }
      if (study.events_treatment === 0 || study.events_control === 0) {
        warnings.push('One arm has zero events - continuity correction may be applied');
      }
    }

    // Confidence interval consistency
    if (study.ci_lower !== undefined && study.ci_upper !== undefined) {
      if (study.ci_lower >= study.ci_upper) {
        errors.push('Lower confidence interval must be less than upper confidence interval');
      }
      
      if (study.effect_size !== undefined) {
        if (study.effect_size < study.ci_lower || study.effect_size > study.ci_upper) {
          warnings.push('Effect size falls outside its confidence interval');
        }
      }
    }

    // Year validation
    if (study.year !== undefined) {
      const currentYear = new Date().getFullYear();
      if (study.year < 1900 || study.year > currentYear) {
        warnings.push(`Unusual publication year: ${study.year}`);
      }
    }

    return { errors, warnings };
  }

  getValidationSummary(studies: StudyData[]): string {
    if (studies.length === 0) return 'No studies validated';

    const summary = {
      total: studies.length,
      withYear: studies.filter(s => s.year !== undefined).length,
      withEffect: studies.filter(s => s.effect_size !== undefined).length,
      withCI: studies.filter(s => s.ci_lower !== undefined && s.ci_upper !== undefined).length,
      withQuality: studies.filter(s => s.quality_score !== undefined).length,
      yearRange: this.getYearRange(studies),
      sampleSizeRange: this.getSampleSizeRange(studies)
    };

    return `
- Total studies: ${summary.total}
- Studies with publication year: ${summary.withYear} (${(summary.withYear/summary.total*100).toFixed(1)}%)
- Studies with effect size: ${summary.withEffect} (${(summary.withEffect/summary.total*100).toFixed(1)}%)
- Studies with confidence intervals: ${summary.withCI} (${(summary.withCI/summary.total*100).toFixed(1)}%)
- Studies with quality scores: ${summary.withQuality} (${(summary.withQuality/summary.total*100).toFixed(1)}%)
- Publication year range: ${summary.yearRange}
- Sample size range: ${summary.sampleSizeRange}`;
  }

  private getYearRange(studies: StudyData[]): string {
    const years = studies.filter(s => s.year !== undefined).map(s => s.year!);
    if (years.length === 0) return 'Not specified';
    return `${Math.min(...years)} - ${Math.max(...years)}`;
  }

  private getSampleSizeRange(studies: StudyData[]): string {
    const totalSizes = studies.map(s => s.n_treatment + s.n_control);
    return `${Math.min(...totalSizes)} - ${Math.max(...totalSizes)} participants`;
  }
}