import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { IngestionController } from '../controllers/ingestion.controller.js';

const router = Router();
const controller = new IngestionController();

// Create intelligent ingestion pipeline
router.post('/pipelines',
  body('projectId').isUUID(),
  body('enableQualityAssessment').isBoolean().optional(),
  body('enableDuplicateDetection').isBoolean().optional(),
  body('enableAutoFix').isBoolean().optional(),
  body('model').isIn([
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
  ]).optional(),
  body('anthropicApiKey').isString().optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const result = await controller.createPipeline(
        req.body.projectId,
        req.body
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Process data through pipeline
router.post('/pipelines/:pipelineId/process',
  param('pipelineId').isUUID(),
  body('projectId').isUUID(),
  body('data').isString(),
  body('format').isIn(['csv', 'excel', 'revman']),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const result = await controller.processWithPipeline(
        req.params!.pipelineId,
        req.body.projectId,
        req.body.data,
        req.body.format
      );
      res.status(202).json(result); // 202 Accepted for async processing
    } catch (error) {
      next(error);
    }
  }
);

// Get processing status
router.get('/processing/:processingId/status',
  param('processingId').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const status = await controller.getProcessingStatus(
        req.params!.processingId
      );
      res.json(status);
    } catch (error) {
      next(error);
    }
  }
);

// Stream processing updates (SSE)
router.get('/processing/:processingId/stream',
  param('processingId').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      // Setup SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      
      // Stream updates
      for await (const update of controller.streamProcessingUpdates(req.params!.processingId)) {
        res.write(`data: ${JSON.stringify(update)}\n\n`);
      }
      
      res.end();
    } catch (error) {
      next(error);
    }
  }
);

// Get available Claude models
router.get('/models',
  async (req, res, next) => {
    try {
      const models = controller.getAvailableModels();
      res.json(models);
    } catch (error) {
      next(error);
    }
  }
);

// Get ingestion recommendations
router.post('/recommendations',
  body('projectId').isUUID(),
  body('sampleData').isString(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const recommendations = await controller.getIngestionRecommendations(
        req.body.projectId,
        req.body.sampleData
      );
      res.json(recommendations);
    } catch (error) {
      next(error);
    }
  }
);

// Delete pipeline
router.delete('/pipelines/:pipelineId',
  param('pipelineId').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      await controller.deletePipeline(req.params!.pipelineId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Health check for ingestion service
router.get('/health',
  async (req, res) => {
    res.json({
      status: 'healthy',
      service: 'intelligent-ingestion',
      features: [
        'claude-powered-formatting',
        'automated-validation',
        'quality-assessment',
        'duplicate-detection',
        'streaming-updates'
      ],
      timestamp: new Date().toISOString()
    });
  }
);

export default router;