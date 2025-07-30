# Intelligent Data Ingestion with Claude SDK

The MCP Meta-Analysis Server features an advanced intelligent ingestion pipeline powered by Claude SDK agents. This system automatically processes, validates, and corrects meta-analysis data using AI-driven intelligence.

## Overview

The intelligent ingestion pipeline uses three specialized Claude agents:

1. **Data Formatter Agent** - Intelligently parses and standardizes data
2. **Validation Agent** - Performs comprehensive statistical validation
3. **Quality Assessment Agent** - Evaluates study quality and bias

## Key Features

### 🤖 AI-Powered Data Processing

- **Automatic Format Detection**: Claude identifies data structure and format
- **Intelligent Field Mapping**: Maps columns to required schema automatically
- **Missing Value Calculation**: Calculates missing effect sizes and confidence intervals
- **Error Correction**: Fixes common data entry errors and inconsistencies

### 🔍 Advanced Validation

- **Statistical Integrity Checks**: Validates all statistical calculations
- **Duplicate Detection**: Identifies potential duplicate studies with confidence scores
- **Outlier Analysis**: Flags statistical outliers for review
- **Consistency Validation**: Ensures data consistency across studies

### 📊 Quality Assessment

- **Automated Scoring**: Assigns quality scores based on established criteria
- **Bias Detection**: Identifies potential sources of bias
- **GRADE Assessment**: Provides evidence quality ratings
- **Recommendations**: Offers actionable improvement suggestions

## API Endpoints

### Create Ingestion Pipeline

```http
POST /api/v1/ingestion/pipelines
```

```json
{
  "projectId": "uuid",
  "enableQualityAssessment": true,
  "enableDuplicateDetection": true,
  "enableAutoFix": true,
  "model": "claude-3-opus-20240229"
}
```

### Process Data

```http
POST /api/v1/ingestion/pipelines/{pipelineId}/process
```

```json
{
  "projectId": "uuid",
  "data": "csv_or_excel_content",
  "format": "csv|excel|revman"
}
```

### Stream Processing Updates

```http
GET /api/v1/ingestion/processing/{processingId}/stream
```

Returns Server-Sent Events (SSE) with real-time processing updates.

## Usage Examples

### Basic Ingestion

```typescript
// Create pipeline
const pipeline = await createIngestionPipeline({
  projectId: 'my-project',
  enableAutoFix: true
});

// Process data
const result = await processData(pipeline.pipelineId, {
  data: csvContent,
  format: 'csv'
});

// Get results
const status = await getProcessingStatus(result.processingId);
```

### Streaming Updates

```typescript
const eventSource = new EventSource(
  `/api/v1/ingestion/processing/${processingId}/stream`
);

eventSource.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log(`${update.step}: ${update.progress}%`);
};
```

## Data Issues Handled

### 1. Missing Values
- **Problem**: Studies with "missing" or empty values
- **Solution**: Claude calculates from available data or flags for manual review

### 2. Format Inconsistencies
- **Problem**: "Smith et al." vs "Smith 2020" vs "Smith and colleagues"
- **Solution**: Standardizes to consistent format

### 3. Statistical Errors
- **Problem**: Proportions instead of counts, impossible values
- **Solution**: Converts proportions, validates ranges

### 4. Duplicate Studies
- **Problem**: Same study published multiple times
- **Solution**: Detects with similarity scoring

## Claude Models

### claude-3-opus-20240229 (Recommended)
- Best statistical understanding
- Complex pattern recognition
- Comprehensive quality assessment
- Advanced bias detection

### claude-3-sonnet-20240229
- Good statistical validation
- Efficient processing
- Standard quality checks

### claude-3-haiku-20240307
- Fast data formatting
- Basic validation
- Simple error detection

## Processing Pipeline Flow

```
1. Data Upload
   ↓
2. Format Detection (Claude)
   ↓
3. Intelligent Parsing (Claude)
   ↓
4. Auto-Fix Issues (Claude)
   ↓
5. Statistical Validation (Claude)
   ↓
6. Duplicate Detection (Claude)
   ↓
7. Quality Assessment (Claude)
   ↓
8. Save to Session
   ↓
9. Ready for Analysis
```

## Best Practices

1. **Use Opus Model for Complex Data**: For datasets with many issues
2. **Enable All Features Initially**: Can disable after understanding data quality
3. **Review AI Corrections**: Claude flags all changes for transparency
4. **Stream Updates for Large Datasets**: Better user experience
5. **Save Processing Reports**: For audit trails

## Error Handling

The pipeline handles errors gracefully:

```json
{
  "processingId": "uuid",
  "status": "partial_success",
  "studiesProcessed": 18,
  "studiesFailed": 2,
  "errors": [
    {
      "study": "Smith 2020",
      "error": "Unable to calculate effect size",
      "suggestion": "Manual review required"
    }
  ]
}
```

## Security & Privacy

- API keys are never logged or stored
- Data is processed in memory only
- No data is sent to external services
- All processing is done within your infrastructure

## Performance

- Small datasets (<100 studies): 5-10 seconds
- Medium datasets (100-500 studies): 20-30 seconds  
- Large datasets (500+ studies): 1-2 minutes

Processing time depends on:
- Number of issues to fix
- Enabled features
- Selected Claude model

## Integration with Meta-Analysis Workflow

After intelligent ingestion:

1. **Validated Data**: Ready for statistical analysis
2. **Quality Scores**: Incorporated into sensitivity analyses
3. **Duplicate Flags**: Used in data selection
4. **Recommendations**: Guide analysis decisions

## Troubleshooting

### Pipeline Timeout
- Solution: Process in smaller batches
- Use streaming for progress updates

### Incorrect Mapping
- Solution: Provide sample with clear headers
- Use custom mapping configuration

### API Key Issues
- Ensure ANTHROPIC_API_KEY is set
- Check key permissions and quotas