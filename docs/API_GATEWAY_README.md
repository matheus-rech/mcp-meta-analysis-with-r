# Meta-Analysis API Gateway

## Overview

The Meta-Analysis API Gateway provides a RESTful interface to the MCP Meta-Analysis Server, offering versioned endpoints, comprehensive documentation, and enterprise-grade features.

## Getting Started

### Installation

```bash
npm install
npm run build
```

### Running the API Server

```bash
# API Gateway only (port 3000)
npm run start:api

# API Gateway + MCP Server
npm run start:all

# Development mode
npm run dev:api
```

### Environment Variables

```bash
API_PORT=3000                    # API server port
ENABLE_MCP=true                  # Enable MCP server alongside API
ALLOWED_ORIGINS=*                # CORS allowed origins (comma-separated)
NODE_ENV=production              # Environment (development/production)
LOG_LEVEL=info                   # Logging level
```

## API Documentation

Interactive API documentation is available at: `http://localhost:3000/api-docs`

## API Endpoints

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication

Include your API key in the `X-API-Key` header:
```
X-API-Key: your-api-key-here
```

### Core Endpoints

#### Projects

**Create Project**
```http
POST /meta-analysis/projects
Content-Type: application/json

{
  "projectName": "Cardiovascular Interventions Meta-Analysis",
  "studyType": "clinical_trial",
  "effectMeasure": "OR",
  "analysisModel": "random"
}
```

**Get Project**
```http
GET /meta-analysis/projects/{projectId}
```

**List Projects**
```http
GET /meta-analysis/projects?status=active&page=1&limit=20
```

#### Data Upload

**Upload Study Data**
```http
POST /data/projects/{projectId}/upload
Content-Type: multipart/form-data

file: studies.csv
dataFormat: csv
validationLevel: comprehensive
```

**Validate Data**
```http
POST /data/projects/{projectId}/validate
Content-Type: application/json

{
  "dataId": "uuid-of-uploaded-data"
}
```

#### Analysis

**Perform Meta-Analysis**
```http
POST /meta-analysis/projects/{projectId}/analyze
Content-Type: application/json

{
  "heterogeneityTest": true,
  "publicationBias": true,
  "sensitivityAnalysis": false
}
```

**Get Results**
```http
GET /meta-analysis/projects/{projectId}/results
```

**Assess Publication Bias**
```http
POST /meta-analysis/projects/{projectId}/publication-bias
Content-Type: application/json

{
  "methods": ["funnel_plot", "egger_test", "begg_test"]
}
```

#### Visualizations

**Generate Forest Plot**
```http
POST /visualizations/projects/{projectId}/forest-plot
Content-Type: application/json

{
  "plotStyle": "modern",
  "confidenceLevel": 0.95,
  "format": "png",
  "dpi": 300
}
```

**Generate Funnel Plot**
```http
POST /visualizations/projects/{projectId}/funnel-plot
Content-Type: application/json

{
  "showPseudoCI": true,
  "format": "png"
}
```

**Get Visualization**
```http
GET /visualizations/{visualizationId}?format=png
```

#### Reports

**Generate Report**
```http
POST /reports/projects/{projectId}/reports
Content-Type: application/json

{
  "format": "pdf",
  "includeCode": false,
  "sections": [
    "executive_summary",
    "methods",
    "results",
    "forest_plots",
    "heterogeneity",
    "discussion"
  ],
  "language": "en"
}
```

**Download Report**
```http
GET /reports/{reportId}/download?format=pdf
```

#### Sessions

**Create Session**
```http
POST /sessions
Content-Type: application/json

{
  "projectName": "My Meta-Analysis",
  "userId": "user123",
  "tags": ["cardiology", "rct"]
}
```

**List Sessions**
```http
GET /sessions?userId=user123&status=active
```

## Response Formats

### Success Response
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "projectName": "Cardiovascular Meta-Analysis",
  "status": "active",
  "createdAt": "2025-07-30T12:00:00Z",
  "links": {
    "self": "/api/v1/meta-analysis/projects/550e8400-e29b-41d4-a716-446655440000",
    "upload": "/api/v1/data/projects/550e8400-e29b-41d4-a716-446655440000/upload"
  }
}
```

### Error Response
```json
{
  "error": "Validation Error",
  "message": "Effect measure is required",
  "code": "VALIDATION_FAILED",
  "details": {
    "field": "effectMeasure",
    "reason": "Required field missing"
  },
  "requestId": "req_123456"
}
```

### Pagination Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

## Rate Limiting

- **Standard endpoints**: 100 requests per 15 minutes per IP
- **Analysis endpoints**: 10 requests per hour per IP

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1627890000
```

## Security Features

1. **Helmet.js** - Security headers
2. **CORS** - Cross-origin resource sharing
3. **Rate Limiting** - Prevent abuse
4. **Input Validation** - express-validator
5. **Request ID** - Tracking and debugging

## Monitoring

### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-07-30T12:00:00Z",
  "version": "1.0.0",
  "uptime": 3600
}
```

### Metrics
- Request/response times logged via Morgan
- Error rates tracked in Winston logs
- Resource usage monitored

## WebSocket Support (Future)

For real-time analysis updates:
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
ws.on('message', (data) => {
  const update = JSON.parse(data);
  console.log('Analysis progress:', update.progress);
});
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import { MetaAnalysisClient } from '@meta-analysis/sdk';

const client = new MetaAnalysisClient({
  apiKey: 'your-api-key',
  baseUrl: 'http://localhost:3000/api/v1'
});

// Create project
const project = await client.projects.create({
  projectName: 'My Analysis',
  studyType: 'clinical_trial',
  effectMeasure: 'OR'
});

// Upload data
await client.data.upload(project.id, {
  file: studiesFile,
  format: 'csv'
});

// Run analysis
const analysis = await client.analysis.run(project.id, {
  heterogeneityTest: true
});
```

### Python
```python
from meta_analysis_sdk import MetaAnalysisClient

client = MetaAnalysisClient(
    api_key='your-api-key',
    base_url='http://localhost:3000/api/v1'
)

# Create project
project = client.projects.create(
    project_name='My Analysis',
    study_type='clinical_trial',
    effect_measure='OR'
)

# Upload data
client.data.upload(
    project_id=project['id'],
    file_path='studies.csv',
    format='csv'
)

# Run analysis
analysis = client.analysis.run(
    project_id=project['id'],
    heterogeneity_test=True
)
```

## Migration from MCP

For users migrating from the MCP interface:

| MCP Tool | REST API Endpoint |
|----------|------------------|
| `initialize_meta_analysis` | `POST /meta-analysis/projects` |
| `upload_study_data` | `POST /data/projects/{id}/upload` |
| `perform_meta_analysis` | `POST /meta-analysis/projects/{id}/analyze` |
| `generate_forest_plot` | `POST /visualizations/projects/{id}/forest-plot` |
| `assess_publication_bias` | `POST /meta-analysis/projects/{id}/publication-bias` |
| `generate_report` | `POST /reports/projects/{id}/reports` |

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_FAILED` | Input validation error |
| `PROJECT_NOT_FOUND` | Project ID not found |
| `INSUFFICIENT_DATA` | Not enough studies for analysis |
| `ANALYSIS_FAILED` | R execution error |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `UNAUTHORIZED` | Invalid or missing API key |

## Support

For API support:
- GitHub Issues: https://github.com/matheus-rech/mcp-meta-analysis-with-r
- Email: support@meta-analysis-mcp.org
- Documentation: http://localhost:3000/api-docs