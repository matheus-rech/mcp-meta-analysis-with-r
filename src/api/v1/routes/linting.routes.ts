import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { LintingController } from '../controllers/linting.controller.js';

const router = Router();
const controller = new LintingController();

// Create linting pipeline
router.post('/pipelines',
  body('languages').isArray().optional(),
  body('languages.*').isIn(['r', 'python', 'typescript']),
  body('model').isIn([
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
  ]).optional(),
  body('enableAIEnhancement').isBoolean().optional(),
  body('outputFormat').isIn(['json', 'html', 'markdown']).optional(),
  body('anthropicApiKey').isString().optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const result = await controller.createLintingPipeline(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Lint single file
router.post('/pipelines/:pipelineId/lint-file',
  param('pipelineId').isUUID(),
  body('filePath').isString().notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const result = await controller.lintFile(
        req.params!.pipelineId,
        req.body.filePath
      );
      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Lint entire project
router.post('/pipelines/:pipelineId/lint-project',
  param('pipelineId').isUUID(),
  body('projectPath').isString().notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const result = await controller.lintProject(
        req.params!.pipelineId,
        req.body.projectPath
      );
      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Get job status
router.get('/jobs/:jobId',
  param('jobId').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const status = await controller.getJobStatus(req.params!.jobId);
      res.json(status);
    } catch (error) {
      next(error);
    }
  }
);

// Get job results
router.get('/jobs/:jobId/result',
  param('jobId').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const result = await controller.getJobResult(req.params!.jobId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Download report
router.get('/jobs/:jobId/report',
  param('jobId').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { stream, filename, contentType } = await controller.downloadReport(
        req.params!.jobId
      );
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

// Apply auto-fixes
router.post('/pipelines/:pipelineId/auto-fix',
  param('pipelineId').isUUID(),
  body('filePath').isString().notEmpty(),
  body('issueIds').isArray(),
  body('issueIds.*').isString(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const result = await controller.applyAutoFixes(
        req.params!.pipelineId,
        req.body.filePath,
        req.body.issueIds
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Get linting statistics
router.get('/stats',
  async (req, res, next) => {
    try {
      const stats = await controller.getLintingStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
);

// Get R-specific linting rules
router.get('/rules/r',
  async (req, res, next) => {
    try {
      const rules = controller.getRLintingRules();
      res.json(rules);
    } catch (error) {
      next(error);
    }
  }
);

// Health check
router.get('/health',
  async (req, res) => {
    res.json({
      status: 'healthy',
      service: 'intelligent-linting',
      features: [
        'multi-language-support',
        'ai-enhanced-review',
        'auto-fix-suggestions',
        'statistical-validation',
        'reproducibility-scoring'
      ],
      supportedLanguages: ['r', 'python', 'typescript'],
      timestamp: new Date().toISOString()
    });
  }
);

export default router;