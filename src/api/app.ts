import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { logger } from '../logger.js';
import v1Routes from './v1/routes/index.js';
import { swaggerSpec } from './swagger.js';
import { MetaAnalysisError, ValidationError, StatisticalError } from '../types.js';

export class APIGateway {
  private app: Express;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }));

    // Request ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.id = req.headers['x-request-id'] as string || uuidv4();
      res.setHeader('X-Request-ID', req.id);
      next();
    });

    // Logging middleware
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim())
      }
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression middleware
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });

    // Apply rate limiting to API routes
    this.app.use('/api/', limiter);

    // Stricter rate limiting for analysis endpoints
    const analysisLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // Limit each IP to 10 analysis requests per hour
      message: 'Analysis rate limit exceeded. Please try again later.',
    });

    this.app.use('/api/v1/meta-analysis/projects/:id/analyze', analysisLimiter);
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
      });
    });

    // API documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Meta-Analysis API Documentation',
    }));

    // Redirect root to API docs
    this.app.get('/', (req: Request, res: Response) => {
      res.redirect('/api-docs');
    });

    // API v1 routes
    this.app.use('/api/v1', v1Routes);

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`,
        timestamp: new Date().toISOString(),
        requestId: req.id,
      });
    });
  }

  private setupErrorHandling(): void {
    // Error handling middleware
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      const requestId = req.id;
      
      // Log error
      logger.error('API Error:', {
        error: err.message,
        stack: err.stack,
        requestId,
        method: req.method,
        path: req.path,
        body: req.body,
      });

      // Handle known error types
      if (err instanceof ValidationError) {
        return res.status(400).json({
          error: 'Validation Error',
          message: err.message,
          code: err.code,
          details: err.details,
          requestId,
        });
      }

      if (err instanceof StatisticalError) {
        return res.status(422).json({
          error: 'Statistical Error',
          message: err.message,
          code: err.code,
          details: err.details,
          requestId,
        });
      }

      if (err instanceof MetaAnalysisError) {
        return res.status(400).json({
          error: 'Meta-Analysis Error',
          message: err.message,
          code: err.code,
          details: err.details,
          requestId,
        });
      }

      // Handle multer errors
      if (err.message && err.message.includes('Invalid file type')) {
        return res.status(400).json({
          error: 'Invalid File',
          message: err.message,
          requestId,
        });
      }

      // Default error response
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : err.message,
        requestId,
      });
    });
  }

  public start(): void {
    this.app.listen(this.port, () => {
      logger.info(`API Gateway started on port ${this.port}`);
      logger.info(`API documentation available at http://localhost:${this.port}/api-docs`);
    });
  }

  public getApp(): Express {
    return this.app;
  }
}

// Extend Express Request type to include id
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}