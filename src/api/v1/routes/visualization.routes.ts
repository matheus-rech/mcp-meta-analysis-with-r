import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { VisualizationController } from '../controllers/visualization.controller.js';

const router = Router();
const controller = new VisualizationController();

// Generate forest plot
router.post('/projects/:projectId/forest-plot',
  param('projectId').isUUID(),
  body('plotStyle').isIn(['classic', 'modern', 'journal_specific']).optional(),
  body('confidenceLevel').isFloat({ min: 0.5, max: 0.99 }).optional(),
  body('customLabels').isObject().optional(),
  body('format').isIn(['png', 'svg', 'pdf']).optional(),
  body('dpi').isInt({ min: 72, max: 600 }).optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const result = await controller.generateForestPlot(
        req.params!.projectId,
        req.body
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Generate funnel plot
router.post('/projects/:projectId/funnel-plot',
  param('projectId').isUUID(),
  body('contourLevels').isArray().optional(),
  body('showPseudoCI').isBoolean().optional(),
  body('format').isIn(['png', 'svg', 'pdf']).optional(),
  body('dpi').isInt({ min: 72, max: 600 }).optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const result = await controller.generateFunnelPlot(
        req.params!.projectId,
        req.body
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Generate sensitivity plot
router.post('/projects/:projectId/sensitivity-plot',
  param('projectId').isUUID(),
  body('method').isIn(['leave_one_out', 'cumulative', 'influence']).optional(),
  body('format').isIn(['png', 'svg', 'pdf']).optional(),
  body('dpi').isInt({ min: 72, max: 600 }).optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const result = await controller.generateSensitivityPlot(
        req.params!.projectId,
        req.body
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Get visualization by ID
router.get('/visualizations/:visualizationId',
  param('visualizationId').isUUID(),
  query('format').isIn(['png', 'svg', 'pdf', 'json']).optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const format = req.query!.format as string || 'png';
      
      if (format === 'json') {
        const metadata = await controller.getVisualizationMetadata(
          req.params!.visualizationId
        );
        res.json(metadata);
      } else {
        const { stream, contentType, filename } = await controller.getVisualization(
          req.params!.visualizationId,
          format
        );
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        stream.pipe(res);
      }
    } catch (error) {
      next(error);
    }
  }
);

// List all visualizations for a project
router.get('/projects/:projectId/visualizations',
  param('projectId').isUUID(),
  query('type').isIn(['forest', 'funnel', 'sensitivity', 'all']).optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const result = await controller.listVisualizations(
        req.params!.projectId,
        req.query!.type as string
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Delete visualization
router.delete('/visualizations/:visualizationId',
  param('visualizationId').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      await controller.deleteVisualization(req.params!.visualizationId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;