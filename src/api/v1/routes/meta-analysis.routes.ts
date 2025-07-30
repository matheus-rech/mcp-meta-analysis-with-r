import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { MetaAnalysisController } from '../controllers/meta-analysis.controller.js';

const router = Router();
const controller = new MetaAnalysisController();

// Initialize new meta-analysis project
router.post('/projects',
  body('studyType').isIn(['clinical_trial', 'observational', 'diagnostic']),
  body('effectMeasure').isIn(['OR', 'RR', 'MD', 'SMD', 'HR']),
  body('analysisModel').isIn(['fixed', 'random', 'auto']).optional(),
  body('projectName').isString().notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const result = await controller.createProject(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Get project details
router.get('/projects/:projectId',
  param('projectId').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const result = await controller.getProject(req.params!.projectId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// List all projects
router.get('/projects',
  query('userId').isString().optional(),
  query('status').isIn(['active', 'completed', 'archived']).optional(),
  query('page').isInt({ min: 1 }).optional(),
  query('limit').isInt({ min: 1, max: 100 }).optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const result = await controller.listProjects(req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Perform meta-analysis
router.post('/projects/:projectId/analyze',
  param('projectId').isUUID(),
  body('heterogeneityTest').isBoolean().optional(),
  body('publicationBias').isBoolean().optional(),
  body('sensitivityAnalysis').isBoolean().optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const result = await controller.performAnalysis(req.params!.projectId, req.body);
      res.status(202).json(result); // 202 Accepted for async processing
    } catch (error) {
      next(error);
    }
  }
);

// Get analysis results
router.get('/projects/:projectId/results',
  param('projectId').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const result = await controller.getResults(req.params!.projectId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Assess publication bias
router.post('/projects/:projectId/publication-bias',
  param('projectId').isUUID(),
  body('methods').isArray().optional(),
  body('methods.*').isIn(['funnel_plot', 'egger_test', 'begg_test', 'trim_fill']),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const result = await controller.assessPublicationBias(req.params!.projectId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;