import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Meta-Analysis MCP Server API',
      version,
      description: `
        A comprehensive RESTful API for conducting meta-analyses with automated statistical validation and R integration.
        
        ## Features
        - Guided workflow for meta-analysis projects
        - Multiple effect measures (OR, RR, MD, SMD, HR)
        - Automated statistical validation
        - Publication-ready visualizations
        - FHIR-compatible data structures
        - Comprehensive reporting
        
        ## Authentication
        Currently using API key authentication. Pass your API key in the \`X-API-Key\` header.
        
        ## Rate Limiting
        - Standard endpoints: 100 requests per 15 minutes
        - Analysis endpoints: 10 requests per hour
      `,
      contact: {
        name: 'API Support',
        email: 'support@meta-analysis-mcp.org',
        url: 'https://github.com/matheus-rech/mcp-meta-analysis-with-r'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server'
      },
      {
        url: 'https://api.meta-analysis-mcp.org/v1',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type'
            },
            message: {
              type: 'string',
              description: 'Human-readable error message'
            },
            code: {
              type: 'string',
              description: 'Error code for programmatic handling'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            },
            requestId: {
              type: 'string',
              description: 'Unique request identifier for tracking'
            }
          }
        },
        Project: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique project identifier'
            },
            projectName: {
              type: 'string',
              description: 'Project name'
            },
            studyType: {
              type: 'string',
              enum: ['clinical_trial', 'observational', 'diagnostic'],
              description: 'Type of studies included'
            },
            effectMeasure: {
              type: 'string',
              enum: ['OR', 'RR', 'MD', 'SMD', 'HR'],
              description: 'Effect measure for analysis'
            },
            analysisModel: {
              type: 'string',
              enum: ['fixed', 'random', 'auto'],
              description: 'Statistical model'
            },
            status: {
              type: 'string',
              enum: ['active', 'completed', 'archived'],
              description: 'Project status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        AnalysisResult: {
          type: 'object',
          properties: {
            overallEffect: {
              type: 'object',
              properties: {
                estimate: { type: 'number' },
                standardError: { type: 'number' },
                ciLower: { type: 'number' },
                ciUpper: { type: 'number' },
                pValue: { type: 'number' },
                zScore: { type: 'number' }
              }
            },
            heterogeneity: {
              type: 'object',
              properties: {
                iSquared: { type: 'number' },
                tauSquared: { type: 'number' },
                qStatistic: { type: 'number' },
                qPValue: { type: 'number' }
              }
            },
            publicationBias: {
              type: 'object',
              properties: {
                eggerTest: {
                  type: 'object',
                  properties: {
                    pValue: { type: 'number' },
                    bias: { type: 'number' }
                  }
                },
                beggTest: {
                  type: 'object',
                  properties: {
                    pValue: { type: 'number' }
                  }
                }
              }
            }
          }
        },
        ValidationReport: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                  severity: {
                    type: 'string',
                    enum: ['error', 'warning', 'info']
                  }
                }
              }
            },
            warnings: {
              type: 'array',
              items: { type: 'string' }
            },
            summary: {
              type: 'object',
              properties: {
                totalStudies: { type: 'integer' },
                validStudies: { type: 'integer' },
                missingData: { type: 'integer' },
                outliers: { type: 'integer' }
              }
            }
          }
        }
      }
    },
    security: [{
      apiKey: []
    }],
    tags: [
      {
        name: 'Projects',
        description: 'Meta-analysis project management'
      },
      {
        name: 'Data',
        description: 'Study data upload and validation'
      },
      {
        name: 'Analysis',
        description: 'Statistical analysis operations'
      },
      {
        name: 'Visualizations',
        description: 'Plot generation and management'
      },
      {
        name: 'Reports',
        description: 'Report generation and export'
      },
      {
        name: 'Sessions',
        description: 'Session management'
      },
      {
        name: 'Intelligent Ingestion',
        description: 'Claude-powered data ingestion and validation'
      }
    ]
  },
  apis: ['./src/api/v1/routes/*.ts', './src/api/v1/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);